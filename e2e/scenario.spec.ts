import { expect, test, type Page } from '@playwright/test'
import {
  expectTouchTarget,
  playSteps,
  presetSettings,
  SCENARIO_URL,
  scanA11y,
  startScenario,
  typeNickname,
  waitForStep,
} from './helpers.ts'

// Scenario mode end to end (scenario doc §3–§8, full prototype, document §16.5 scenario rows).
// ?seed=0 lands the wheel on Yemekhane; ?demo=1 loads the 36-game sample day, whose top four
// scored 97, 96, 95 and 86.

/** The final's per-step bars as [points, max]. */
function stepBars(page: Page) {
  return page
    .locator('[data-testid^="step-bar-"]')
    .evaluateAll((els) => els.map((el) => [Number(el.dataset.points), Number(el.dataset.max)]))
}

test('a full game: nickname → wheel → crisis → 5 decisions → final → leaderboard', async ({
  page,
}) => {
  // 1 · nickname
  await page.goto(SCENARIO_URL)
  await expect(page.getByTestId('scenario-start')).toBeDisabled()
  await expect(page.getByTestId('keyboard')).toHaveCount(0) // no on-screen keyboard any more
  expect(await scanA11y(page)).toEqual([])
  await typeNickname(page, 'Korkut')
  await expect(page.getByTestId('nick-preview')).toContainText('Korkut')
  for (const r of ['len', 'chars', 'clean']) {
    await expect(page.getByTestId(`rule-${r}`)).toHaveAttribute('data-state', 'ok')
  }
  await page.getByTestId('scenario-start').tap()

  // 2 · crisis wheel (timing checked in its own test) → 3 · crisis intro
  await expect(page.getByTestId('crisis-title')).toHaveText('Yemekhane: Öğle Saati Krizi')
  await expect(page.getByTestId('crisis-clock')).toHaveText('11:58')
  await expect(page.getByTestId('crisis-text')).toHaveText(/^Saat 11:58\. Merkez yemekhanenin/)
  expect(await scanA11y(page)).toEqual([])
  await page.getByTestId('crisis-start').tap()
  await expect(page.getByTestId('countdown')).toBeVisible()

  // 4 · decisions: A, B, C, A, A — four best answers and one weak one (8/20)
  await waitForStep(page, 1)
  await expect(page.getByTestId('step-indicator')).toHaveText('Adım 1/5')
  await expect(page.getByTestId('question')).toHaveText('Öğrenciler turnikeden nasıl geçsin?')
  await expect(page.getByTestId('chain-node-1')).toHaveAttribute('data-state', 'cur')
  // harder steps are worth more, and the player sees it
  await expect(page.getByTestId('step-worth')).toHaveAttribute('data-difficulty', 'zor')
  await expect(page.getByTestId('step-worth')).toHaveText('Zor karar · 21 puan')
  expect(await scanA11y(page)).toEqual([])

  await page.getByTestId('option-a').tap()
  await expect(page.getByTestId('option-a')).toHaveAttribute('aria-pressed', 'true')
  for (const other of ['b', 'c', 'd'])
    await expect(page.getByTestId(`option-${other}`)).toBeDisabled()
  await expect(page.getByTestId('effect-text')).toHaveText('Kuyruk akıyor; geçiş 1 saniye sürüyor.')
  await expect(page.getByTestId('effect-sheet')).toContainText('KELEBEK ETKİSİ')
  await expect(page.getByTestId('chain-node-1')).toHaveAttribute('data-state', 'done')
  await page.getByTestId('effect-next').tap()
  await waitForStep(page, 2)
  await expect(page.getByTestId('step-worth')).toHaveText('Kolay · 17 puan')
  for (const [i, letter] of ['b', 'c', 'a', 'a'].entries()) {
    await waitForStep(page, i + 2)
    await page.getByTestId(`option-${letter}`).tap()
    await expect(page.getByTestId('effect-sheet')).toHaveAttribute('data-open', 'true')
    await page.getByTestId('effect-next').tap()
  }

  // 5 · final: 21 + 17 + 19 + 5 (8/20 on a 20-point step) + 23 = 85 when answered quickly
  await expect(page.getByTestId('scenario-result')).toBeVisible()
  await expect(page.getByTestId('result-score')).toHaveText('85')
  await expect(page.getByTestId('result-title')).toHaveText('Senior Analist')
  expect(await stepBars(page)).toEqual([
    [21, 21],
    [17, 17],
    [19, 19],
    [5, 20],
    [23, 23],
  ])
  const statuses = await page
    .locator('[data-testid^="final-node-"]')
    .evaluateAll((n) => n.map((el) => el.getAttribute('data-status')))
  expect(statuses).toEqual(['iyi', 'iyi', 'iyi', 'orta', 'iyi'])
  await expect(page.getByTestId('result-analysis')).toHaveText(
    'Turnike geçişi, atomik işlem ve yoğun saat performansı kararların çok sağlam. ' +
      'Menü bilgisi tarafında küçük bir eksik var: "Menü + kalori + alerjen" daha iyi işlerdi. ' +
      'Biraz cila ile kusursuz olur.',
  )
  await expect(page.getByTestId('result-rank')).toHaveText('#4') // the sample day's 97, 95, 95, then 85
  await expect(page.getByTestId('scenario-result')).toContainText(
    'Bugün 37 oyuncu arasında 4. sıradasın.',
  )
  await expect(page.getByTestId('result-consent')).toHaveText('Paylaşım izni var')
  expect(await scanA11y(page)).toEqual([])

  // 6 · leaderboard
  await page.getByTestId('btn-leaderboard').tap()
  const mine = page.locator('[data-testid="leaderboard-row"][data-me="true"]')
  await expect(mine).toHaveAttribute('data-rank', '4')
  await expect(mine).toContainText('Korkut')
  await expect(page.getByTestId('leaderboard-row')).toHaveCount(10)
  await page.waitForTimeout(1500)
  expect(await scanA11y(page)).toEqual([])
})

test('an empty game — every step timed out — scores 0, not 20', async ({ page }) => {
  test.setTimeout(150_000) // five full steps on the fake clock (15 s, the shortest setting)
  await presetSettings(page, { stepSec: 15 })
  await page.clock.install()
  await page.goto(SCENARIO_URL)
  await typeNickname(page, 'Bos Oyuncu')
  await page.getByTestId('scenario-start').tap()
  await page.clock.runFor(3_000) // wheel
  await page.getByTestId('crisis-start').tap()
  await page.clock.runFor(2_000) // 3-2-1, situation, options
  for (let n = 1; n <= 5; n++) {
    await waitForStep(page, n)
    await page.clock.runFor(15_500)
    await expect(page.getByTestId('effect-sheet')).toContainText('SÜRE DOLDU · 0 PUAN')
    await page.getByTestId('effect-next').tap()
    await page.clock.runFor(2_000)
  }
  await expect(page.getByTestId('scenario-result')).toBeVisible()
  await page.clock.runFor(5_000)
  await expect(page.getByTestId('result-score')).toHaveAttribute('data-score', '0')
  await expect(page.getByTestId('result-score')).toHaveText('0')
  await expect(page.getByTestId('result-title')).toHaveText('Stajyer (ama umut var!)')
  expect((await stepBars(page)).map(([points]) => points)).toEqual([0, 0, 0, 0, 0])
})

test('the crisis wheel has sixteen crises, stamps the winner and opens the intro', async ({
  page,
}) => {
  await page.goto(SCENARIO_URL.replace('&fastTimers=1', '').replace('seed=0', 'seed=2'))
  await typeNickname(page, 'Korkut')
  await page.getByTestId('scenario-start').tap()
  await expect(page.getByTestId('scenario-wheel')).toContainText('Hazır ol, Korkut!')
  await expect(page.locator('[data-testid^="wheel-tile-"]')).toHaveCount(16)
  await expect(page.getByTestId('wheel-tile-kafe')).toHaveAttribute('data-state', 'win', {
    timeout: 8_000,
  })
  await expect(page.getByTestId('wheel-stamp')).toHaveText('KRİZ SEÇİLDİ')
  for (const id of ['yemekhane', 'kutuphane', 'hastane', 'magaza', 'obs', 'ring', 'wifi']) {
    await expect(page.getByTestId(`wheel-tile-${id}`)).toHaveAttribute('data-state', 'lose')
  }
  // faded losing tiles are decorative; the winner and the stamp carry the information
  expect(await scanA11y(page, ['[data-state="lose"]'])).toEqual([])
  await expect(page.getByTestId('crisis-title')).toHaveText('Kafe: Sabah 9 Dersi Öncesi', {
    timeout: 5_000,
  })
})

test('the new crises play through too (seed 5 → OBS)', async ({ page }) => {
  await startScenario(page, 'Korkut', SCENARIO_URL.replace('seed=0', 'seed=5'))
  await expect(page.getByTestId('scenario-game')).toContainText('OBS')
  await playSteps(page, ['a', 'a', 'a', 'a', 'a'])
  await expect(page.getByTestId('result-score')).toHaveText(/^\d+$/)
})

test('the score survives a reload of the leaderboard (IndexedDB)', async ({ page }) => {
  await startScenario(page)
  await playSteps(page, ['a', 'b', 'c', 'd', 'a'])
  await expect(page.getByTestId('result-score')).toHaveText('100')
  await expect(page.getByTestId('result-title')).toHaveText('Baş Analist')
  await page.goto('/leaderboard?skipTutorial=1')
  await expect(page.getByTestId('podium-1')).toContainText('Korkut')
  await page.reload()
  await expect(page.getByTestId('podium-1')).toContainText('Korkut')
})

test('a taken name gets _2, no consent keeps the player out of the share list', async ({
  page,
}) => {
  await page.goto(SCENARIO_URL)
  await typeNickname(page, 'Async Ahtapot')
  await expect(page.getByTestId('nick-dup')).toContainText('Async Ahtapot_2 olarak kaydedilecek')
  const consent = page.getByTestId('nick-consent')
  await expect(consent).toHaveAttribute('aria-checked', 'true')
  await consent.tap()
  await expect(consent).toHaveAttribute('aria-checked', 'false')
  await page.getByTestId('scenario-start').tap()
  await page.getByTestId('crisis-start').tap()
  await playSteps(page, ['a', 'b', 'c', 'd', 'a'])

  await expect(page.getByTestId('result-consent')).toHaveText('Paylaşım izni yok')
  await expect(page.getByTestId('nick-chip')).toContainText('Async Ahtapot_2')
  await page.getByTestId('btn-leaderboard').tap()
  await expect(page.getByTestId('podium-1')).toContainText('Async Ahtapot_2')

  await page.getByTestId('btn-staff').tap()
  for (const d of '1234') await page.getByTestId(`pin-key-${d}`).tap()
  await expect(page.getByTestId('admin-top3-row')).toHaveCount(3)
  await expect(page.getByTestId('admin-top3')).not.toContainText('Async Ahtapot_2')
  await expect(page.getByTestId('admin-skipped')).toContainText('Async Ahtapot_2')
})

test('inappropriate Turkish names are rejected; at most 16 characters', async ({ page }) => {
  await page.goto(SCENARIO_URL)
  for (const bad of ['SALAK', 'S1kt1r', 'Orrrospu Kral', 'A.m.k', 'Gerizekalı']) {
    await typeNickname(page, bad)
    await expect(page.getByTestId('rule-clean'), bad).toHaveAttribute('data-state', 'bad')
    await expect(page.getByTestId('rule-clean')).toHaveText(
      'Bu ad kullanılamıyor, başka bir ad dene.',
    )
    await expect(page.getByTestId('scenario-start')).toBeDisabled()
  }
  await typeNickname(page, 'Malatyalı Kemal')
  await expect(page.getByTestId('rule-clean')).toHaveAttribute('data-state', 'ok')
  await typeNickname(page, 'ABCDEFGHIJKLMNOPR')
  await expect(page.getByTestId('nick-count')).toHaveText('16/16')
})

test('the dice rolls ready-made names into the field; no ready-name panel', async ({ page }) => {
  await page.goto(SCENARIO_URL)
  for (const id of ['nick-studio', 'reel-spin', 'reel-use', 'sug-0'])
    await expect(page.getByTestId(id)).toHaveCount(0)
  const input = page.getByTestId('nick-input')
  const field = page.getByTestId('nick-field')
  const seen = new Set<string>()
  for (let i = 0; i < 5; i++) {
    await page.getByTestId('nick-dice').tap()
    await expect(field).toHaveAttribute('data-spinning', 'false')
    const name = await input.inputValue()
    expect(name.length).toBeGreaterThanOrEqual(3)
    seen.add(name)
    await expect(page.getByTestId('rule-clean')).toHaveAttribute('data-state', 'ok')
    await expect(page.getByTestId('scenario-start')).toBeEnabled()
  }
  expect(seen.size).toBe(5)
  // the dice works with the mouse too, and the rolled name starts the game
  await page.getByTestId('nick-dice').click()
  await expect(field).toHaveAttribute('data-spinning', 'false')
  const name = await input.inputValue()
  await page.getByTestId('scenario-start').tap()
  await page.getByTestId('crisis-start').tap()
  await expect(page.getByTestId('nick-chip')).toContainText(name)
})

test('physical keyboard: type, Enter to start, A–D to choose, Enter to skip', async ({ page }) => {
  await page.goto(SCENARIO_URL)
  await page.waitForLoadState('networkidle')
  await page.getByTestId('nick-input').click()
  await page.keyboard.type('Ece')
  await expect(page.getByTestId('nick-input')).toHaveValue('Ece')
  await page.keyboard.press('Enter')
  await page.getByTestId('crisis-start').tap()
  for (const [i, key] of ['a', '2', 'c', 'd', '1'].entries()) {
    await waitForStep(page, i + 1)
    await page.keyboard.press(key)
    await expect(page.getByTestId('effect-sheet')).toHaveAttribute('data-open', 'true')
    await page.keyboard.press('Enter')
  }
  await expect(page.getByTestId('result-score')).toHaveText('100')
})

test('one decision per step: a double tap and a second option are ignored', async ({ page }) => {
  await startScenario(page)
  await waitForStep(page, 1)
  await page.getByTestId('option-b').dblclick()
  await expect(page.getByTestId('effect-text')).toHaveText(
    'Ekranı karanlık telefonlarda okuma sorunu çıktı.',
  )
  await page.getByTestId('option-a').click({ force: true })
  await expect(page.getByTestId('option-a')).toHaveAttribute('aria-pressed', 'false')
  await page.getByTestId('effect-sheet').click({ position: { x: 40, y: 140 } }) // tap anywhere on the card
  await waitForStep(page, 2)
  await expect(page.getByTestId('chain-node-1')).toHaveAttribute('data-state', 'done')
  await expect(page.getByTestId('chain-node-2')).toHaveAttribute('data-state', 'cur')
})

test('the effect card moves on by itself after about 3 s', async ({ page }) => {
  await page.goto(SCENARIO_URL.replace('&fastTimers=1', ''))
  await typeNickname(page, 'Korkut')
  await page.getByTestId('scenario-start').tap()
  await page.getByTestId('crisis-start').tap({ timeout: 15_000 })
  await waitForStep(page, 1)
  await page.getByTestId('option-a').tap()
  await expect(page.getByTestId('effect-sheet')).toHaveAttribute('data-open', 'true')
  await expect(page.getByTestId('scenario-game')).toHaveAttribute('data-step', '2', {
    timeout: 6_000,
  })
})

test('timer: red in the last 5 s; running out scores 0 and moves on', async ({ page }) => {
  // ~16 s alone (a whole step on the fake clock, which also flows in real time); the default
  // 30 s is too tight when every spec runs in parallel
  test.setTimeout(60_000)
  await page.clock.install()
  await page.goto(SCENARIO_URL)
  await typeNickname(page, 'Korkut')
  await page.getByTestId('scenario-start').tap()
  await page.clock.runFor(3_000) // wheel
  await page.getByTestId('crisis-start').tap()
  await page.clock.runFor(2_000) // 3-2-1, situation, options
  await waitForStep(page, 1)

  // the fake clock also flows in real time, so measure from what the timer shows now
  const timer = page.getByTestId('step-timer')
  const left = async () => Number((await timer.getAttribute('aria-label'))?.match(/\d+/)?.[0])
  const start = await left()
  expect(start).toBeGreaterThan(12)
  await page.clock.runFor((start - 7) * 1000)
  await expect(timer).toHaveAttribute('data-low', 'false')
  expect(await left()).toBeGreaterThan(5)
  await page.clock.runFor(2_500)
  await expect(timer).toHaveAttribute('data-low', 'true')
  const remaining = await left()
  expect(remaining).toBeLessThanOrEqual(5)
  // run just past the limit, then hold the clock still: the timed-out card moves on by itself
  // ~3 s later, and the checks below must not race it on a busy machine
  await page.clock.runFor(remaining * 1000 + 300)
  await expect(page.getByTestId('effect-sheet')).toHaveAttribute('data-open', 'true')
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 500)

  await expect(page.getByTestId('effect-sheet')).toContainText('SÜRE DOLDU · 0 PUAN')
  await expect(page.getByTestId('effect-text')).toHaveText(
    'Karar verilmedi; kriz kendi kendine büyüdü.',
  )
  for (const k of ['a', 'b', 'c', 'd']) await expect(page.getByTestId(`option-${k}`)).toBeDisabled()
  await page.getByTestId('effect-next').tap()
  await page.clock.runFor(2_000)
  await waitForStep(page, 2)
  await expect(page.getByTestId('chain-node-1')).toHaveAttribute('data-state', 'done')
})

test('the decision time comes from the staff settings (15 s)', async ({ page }) => {
  await presetSettings(page, { stepSec: 15 })
  await page.clock.install()
  await page.goto(SCENARIO_URL)
  await expect(page.getByTestId('scenario-nickname')).toContainText('15 sn / karar')
  await typeNickname(page, 'Korkut')
  await page.getByTestId('scenario-start').tap()
  await page.clock.runFor(3_000)
  await expect(page.getByTestId('scenario-intro')).toContainText('15 sn')
  await page.getByTestId('crisis-start').tap()
  await page.clock.runFor(2_000)
  await waitForStep(page, 1)
  await page.clock.runFor(15_500)
  await expect(page.getByTestId('effect-sheet')).toContainText('SÜRE DOLDU · 0 PUAN')
})

test('the final has Yeni oyuncu, Ana Menü and Skor tablosu', async ({ page }) => {
  await startScenario(page)
  await playSteps(page, ['b', 'b', 'b', 'b', 'b'])
  await expect(page.getByTestId('scenario-result')).toBeVisible()
  for (const id of ['scenario-new-player', 'btn-home', 'btn-leaderboard', 'btn-music', 'btn-sound'])
    await expectTouchTarget(page.getByTestId(id))
  await page.getByTestId('btn-home').tap()
  await expect(page.getByTestId('home')).toBeVisible()
  await page.goBack()
  // the game was reset: the final cannot be shown again
  await expect(page.getByTestId('scenario-nickname')).toBeVisible()
})

test('scenario controls meet the touch-target sizes', async ({ page }) => {
  await page.goto(SCENARIO_URL)
  for (const id of [
    'btn-home',
    'btn-music',
    'btn-sound',
    'btn-leaderboard',
    'nick-field',
    'nick-dice',
    'nick-consent',
  ]) {
    await expectTouchTarget(page.getByTestId(id))
  }
  await typeNickname(page, 'Korkut')
  await expectTouchTarget(page.getByTestId('scenario-start'))
  await page.getByTestId('scenario-start').tap()
  await expectTouchTarget(page.getByTestId('crisis-start'))
  await page.getByTestId('crisis-start').tap()
  await waitForStep(page, 1)
  for (const k of ['a', 'b', 'c', 'd']) await expectTouchTarget(page.getByTestId(`option-${k}`))
  await page.getByTestId('option-a').tap()
  await expectTouchTarget(page.getByTestId('effect-next'))
})

test('reduced motion: the game is fully playable without animations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await startScenario(page)
  await playSteps(page, ['b', 'b', 'b', 'b', 'b'])
  await expect(page.getByTestId('result-score')).toHaveText(/^\d+$/)
  await expect(page.getByTestId('result-title')).not.toBeEmpty()
})
