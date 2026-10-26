import { expect, test, type CDPSession, type Locator, type Page } from '@playwright/test'
import { centre, expectTouchTarget, mouseDrag, presetSettings, scanA11y } from './helpers.ts'

// Duel mode end to end (document §6, §13.5, §16.5 duel rows; full prototype §4): task card,
// two players dragging at the same time on one tablet, screen isolation, finishing by holding,
// results (no rematch: the next pair plays) and the leaderboard's duel tab.

const DUEL_URL = '/duel?skipTutorial=1&seed=3&fastTimers=1'

async function startDuel(page: Page, url = DUEL_URL) {
  await page.goto(url)
  await page.getByTestId('p1-ready').tap()
  await page.getByTestId('p2-ready').tap()
  await expect(page.getByTestId('duel-game')).toBeVisible({ timeout: 10_000 })
}

/** The first `n` cards still in a player's pool. */
function freeCards(page: Page, p: 1 | 2): Locator {
  return page.locator(`[data-testid^="p${p}-card-"][data-used="false"]`)
}

async function addCards(page: Page, p: 1 | 2, n: number) {
  const box = await centre(page.getByTestId(`p${p}-box`))
  for (let i = 0; i < n; i++) {
    await mouseDrag(page, freeCards(page, p).first(), box)
    await expect(page.getByTestId(`p${p}-count`)).toHaveText(new RegExp(`^${i + 1}/8$`))
  }
}

async function hold(page: Page, id: string, ms: number) {
  const c = await centre(page.getByTestId(id))
  await page.mouse.move(c.x, c.y)
  await page.mouse.down()
  await page.waitForTimeout(ms)
  await page.mouse.up()
}

type Point = { x: number; y: number }
interface Finger {
  id: number
  from: Point
  to: Point
  radius?: number
}

/** Real multi-touch through the Chrome DevTools protocol: all fingers move together. */
async function multiTouch(cdp: CDPSession, fingers: Finger[], steps = 12) {
  const at = (t: number) =>
    fingers.map((f) => ({
      id: f.id,
      x: f.from.x + (f.to.x - f.from.x) * t,
      y: f.from.y + (f.to.y - f.from.y) * t,
      radiusX: f.radius ?? 1,
      radiusY: f.radius ?? 1,
    }))
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(0) })
  for (let i = 1; i <= steps; i++)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: at(i / steps) })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

test('task card: names, rerolls, ready toggles, 3-2-1 → the round', async ({ page }) => {
  await page.goto(DUEL_URL)
  await expect(page.getByTestId('task-card')).toHaveAttribute('data-task', /.+/)
  for (const id of ['p1-ready', 'p2-ready', 'p1-reroll', 'p2-reroll', 'btn-home', 'btn-music'])
    await expectTouchTarget(page.getByTestId(id))
  const p1 = page.getByTestId('p1-name')
  const first = await p1.textContent()
  expect(first).not.toBe(await page.getByTestId('p2-name').textContent())
  // the dice rolls a new name every time, as often as the player likes
  const seen = new Set([first])
  for (let i = 0; i < 4; i++) {
    await page.getByTestId('p1-reroll').tap()
    await expect(p1).not.toHaveText(first!)
    await page.waitForTimeout(900) // the name is typed in
    const name = await p1.textContent()
    expect(seen.has(name)).toBe(false)
    seen.add(name)
    await expect(page.getByTestId('p1-reroll')).toBeEnabled()
  }
  await expect(page.getByTestId('p2-reroll')).toBeEnabled()
  expect(await scanA11y(page)).toEqual([])

  const ready1 = page.getByTestId('p1-ready')
  await ready1.tap()
  await expect(ready1).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('p1-reroll')).toBeDisabled() // a ready player keeps the name
  await expect(page.getByTestId('p2-reroll')).toBeEnabled()
  await ready1.tap() // changed their mind
  await expect(ready1).toHaveAttribute('aria-pressed', 'false')
  await ready1.tap()
  await page.getByTestId('p2-ready').tap()
  await expect(page.getByTestId('countdown')).toBeVisible()
  await expect(page.getByTestId('duel-game')).toBeVisible({ timeout: 10_000 })
  await expect(page).toHaveURL(/\/duel\/play$/)
  await expect(page.getByTestId('p1-count')).toHaveText('0/8')
  await expect(page.locator('[data-testid^="p1-card-"]')).toHaveCount(14)
  await expect(page.locator('[data-testid^="p2-card-"]')).toHaveCount(14)
})

test('two players drag at the same time, each into their own phone', async ({ page }) => {
  await startDuel(page)
  const cdp = await page.context().newCDPSession(page)
  const card1 = freeCards(page, 1).first()
  const card2 = freeCards(page, 2).first()
  const id1 = (await card1.getAttribute('data-card'))!
  const id2 = (await card2.getAttribute('data-card'))!
  await multiTouch(cdp, [
    { id: 1, from: await centre(card1), to: await centre(page.getByTestId('p1-box')) },
    { id: 2, from: await centre(card2), to: await centre(page.getByTestId('p2-box')) },
  ])
  await expect(page.getByTestId('p1-count')).toHaveText('1/8')
  await expect(page.getByTestId('p2-count')).toHaveText('1/8')
  await expect(page.getByTestId('p1-slot-0')).toHaveAttribute('data-card', id1)
  await expect(page.getByTestId('p2-slot-0')).toHaveAttribute('data-card', id2)
  await expect(page.getByTestId(`p1-card-${id1}`)).toHaveAttribute('data-used', 'true')
})

test('screen isolation: dead zone, boundary lock, palms and one finger per player', async ({
  page,
}) => {
  await startDuel(page)
  const cdp = await page.context().newCDPSession(page)
  const box1 = await centre(page.getByTestId('p1-box'))
  const box2 = await centre(page.getByTestId('p2-box'))

  // a touch starting in the 24 px middle strip belongs to nobody
  await multiTouch(cdp, [{ id: 1, from: { x: 640, y: 400 }, to: box1 }])
  await expect(page.getByTestId('p1-count')).toHaveText('0/8')

  // dragged over the middle, a card stays in its owner's half and never reaches the rival
  await multiTouch(cdp, [{ id: 1, from: await centre(freeCards(page, 1).first()), to: box2 }])
  await expect(page.getByTestId('p2-count')).toHaveText('0/8')
  const after = await page.getByTestId('p1-count').textContent()

  // a palm or wrist (large contact area) is ignored
  await multiTouch(cdp, [
    { id: 1, from: await centre(freeCards(page, 1).first()), to: box1, radius: 45 },
  ])
  await expect(page.getByTestId('p1-count')).toHaveText(after!)

  // a player's own finger cannot pick up the rival's cards from the other half
  await multiTouch(cdp, [{ id: 1, from: await centre(freeCards(page, 2).first()), to: box1 }])
  await expect(page.getByTestId('p1-count')).toHaveText(after!)

  // two fingers of the same player: only the first one drags
  const free = freeCards(page, 1)
  await multiTouch(cdp, [
    { id: 1, from: await centre(free.nth(0)), to: box1 },
    { id: 2, from: await centre(free.nth(1)), to: box1 },
  ])
  await expect(page.getByTestId('p1-count')).toHaveText(`${Number(after!.split('/')[0]) + 1}/8`)
})

test('8 slots: the 9th card is refused; undo and clear work step by step', async ({ page }) => {
  await startDuel(page)
  for (const id of ['p1-finish', 'p1-undo', 'p1-clear'])
    await expectTouchTarget(page.getByTestId(id))
  await expect(page.getByTestId('p1-undo')).toBeDisabled()
  await expect(page.getByTestId('p1-clear')).toBeDisabled()
  await addCards(page, 1, 8)
  await mouseDrag(page, freeCards(page, 1).first(), await centre(page.getByTestId('p1-box')))
  await expect(page.getByTestId('toast')).toContainText('8 slot dolu')
  await expect(page.getByTestId('p1-count')).toHaveText('8/8')

  // moving a card out of the phone puts it back in the pool
  await mouseDrag(page, page.getByTestId('p1-slot-7'), await centre(freeCards(page, 1).first()))
  await expect(page.getByTestId('p1-count')).toHaveText('7/8')
  await page.getByTestId('p1-clear').tap()
  await expect(page.getByTestId('p1-count')).toHaveText('0/8')
  await page.getByTestId('p1-undo').tap()
  await expect(page.getByTestId('p1-count')).toHaveText('7/8')
  await page.getByTestId('p1-undo').tap()
  await expect(page.getByTestId('p1-count')).toHaveText('8/8')
  // the other player was never touched
  await expect(page.getByTestId('p2-count')).toHaveText('0/8')
  await expect(page.getByTestId('p2-undo')).toBeDisabled()
})

test('finishing needs a 0.6 s hold; a short tap does nothing', async ({ page }) => {
  await startDuel(page)
  await addCards(page, 1, 2)
  await hold(page, 'p1-finish', 150)
  await page.waitForTimeout(700)
  await expect(page.getByTestId('p1-lock')).toHaveCount(0)
  await hold(page, 'p1-finish', 900)
  await expect(page.getByTestId('p1-lock')).toBeVisible()
  await expect(page.getByTestId('p1-lock')).toContainText('2/8 kart')
  // a finished player's half no longer accepts cards; the rival plays on
  await mouseDrag(page, freeCards(page, 1).first(), await centre(page.getByTestId('p1-box')))
  await expect(page.getByTestId('p1-count')).toHaveText('2/8')
  await addCards(page, 2, 1)
  expect(await scanA11y(page, ['[data-testid="p1-half"]'])).toEqual([])
})

test('results: scores, winner, jury, no rematch, and the duel leaderboard', async ({ page }) => {
  await startDuel(page)
  await addCards(page, 1, 5)
  await addCards(page, 2, 2)
  await hold(page, 'p1-finish', 900)
  await hold(page, 'p2-finish', 900)
  await expect(page.getByTestId('duel-result')).toBeVisible({ timeout: 10_000 })
  await expect(page).toHaveURL(/\/duel\/result$/)

  const s1 = Number(await page.getByTestId('p1-result').getAttribute('data-score'))
  const s2 = Number(await page.getByTestId('p2-result').getAttribute('data-score'))
  await expect(page.getByTestId('p1-score')).toHaveText(String(s1))
  await expect(page.getByTestId('p2-score')).toHaveText(String(s2))
  const winner = s1 === s2 ? null : s1 > s2 ? 'p1' : 'p2'
  if (winner) await expect(page.getByTestId(`${winner}-winner`)).toBeVisible()
  for (const p of ['p1', 'p2']) {
    for (let k = 0; k < 4; k++) await expect(page.getByTestId(`${p}-part-${k}`)).toBeVisible()
    await expect(page.getByTestId(`${p}-title`)).not.toHaveText('“”')
    await expect(page.getByTestId(`${p}-comment`)).not.toBeEmpty()
  }
  await expect(page.getByTestId('duel-rematch')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Rövanş/ })).toHaveCount(0)
  for (const id of ['btn-home', 'btn-leaderboard']) await expectTouchTarget(page.getByTestId(id))
  await page.waitForTimeout(1500)
  expect(await scanA11y(page)).toEqual([])

  const names = [
    await page.getByTestId('p1-result').locator('[class*="pname"]').textContent(),
    await page.getByTestId('p2-result').locator('[class*="pname"]').textContent(),
  ]
  await page.getByTestId('btn-leaderboard').tap()
  await expect(page.getByTestId('tab-duel')).toHaveAttribute('aria-selected', 'true')
  const row = page.getByTestId('duel-row').first()
  await expect(row).toContainText(names[0]!)
  await expect(row).toContainText(names[1]!)

  await page.goBack()
  await expect(page.getByTestId('duel-result')).toBeVisible()
  await page.getByTestId('btn-home').tap()
  await expect(page.getByTestId('home')).toBeVisible()
  // the next pair starts fresh: a new task card, nobody ready
  await page.getByTestId('btn-duel').tap()
  await expect(page.getByTestId('task-card')).toBeVisible()
  await expect(page.getByTestId('p1-ready')).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByTestId('p2-ready')).toHaveAttribute('aria-pressed', 'false')
})

test('two empty phones score 0 each and draw', async ({ page }) => {
  await startDuel(page)
  await hold(page, 'p1-finish', 900)
  await hold(page, 'p2-finish', 900)
  await expect(page.getByTestId('duel-result')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByTestId('p1-result')).toHaveAttribute('data-score', '0')
  await expect(page.getByTestId('p2-result')).toHaveAttribute('data-score', '0')
  await expect(page.getByTestId('p1-tie')).toBeVisible()
  await expect(page.getByTestId('p1-title')).toHaveText(/Boş Ekran Sanatçısı|Sessiz Mimar/)
})

test('time runs out: gold at 20 s, red at 10 s, the round ends by itself (45 s)', async ({
  page,
}) => {
  test.setTimeout(120_000) // animation frames on the fake clock
  await presetSettings(page, { duelSec: 45 })
  await page.clock.install()
  await page.goto(DUEL_URL)
  await expect(page.getByTestId('task-card')).toContainText('45 sn')
  await page.getByTestId('p1-ready').tap()
  await page.getByTestId('p2-ready').tap()
  await page.clock.runFor(4_000)
  await expect(page.getByTestId('duel-game')).toBeVisible()
  await expect(page.getByTestId('duel-timer')).toHaveAttribute('data-warn', 'false')
  await addCards(page, 1, 1)
  await page.clock.runFor(27_000)
  await expect(page.getByTestId('duel-timer')).toHaveAttribute('data-warn', 'true')
  await expect(page.getByTestId('duel-timer')).toHaveAttribute('data-low', 'false')
  await page.clock.runFor(9_000)
  await expect(page.getByTestId('duel-timer')).toHaveAttribute('data-low', 'true')
  await expect(page.getByTestId('duel-timer')).toHaveAttribute('data-warn', 'false')
  await page.clock.runFor(10_000)
  await expect(page.getByTestId('duel-result')).toBeVisible({ timeout: 10_000 })
})

test('an untouched result screen returns home after 60 s', async ({ page }) => {
  test.setTimeout(90_000)
  await page.clock.install()
  await startDuel(page)
  await hold(page, 'p1-finish', 900)
  await hold(page, 'p2-finish', 900)
  await expect(page.getByTestId('duel-result')).toBeVisible({ timeout: 10_000 })
  await page.clock.runFor(61_000)
  await expect(page.getByTestId('home')).toBeVisible()
})
