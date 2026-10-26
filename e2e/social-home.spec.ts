import { expect, test, type Page } from '@playwright/test'
import { expectTouchTarget, playSteps, scanA11y, SCENARIO_URL, startScenario } from './helpers.ts'

// "Bizi takip et" (the club's Linktree QR) on the home screen and both result screens, the home
// button inside a round (asks first), and the APK's opening animation (?intro=1 in the browser).

async function expectQrDialog(page: Page) {
  const button = page.getByTestId('btn-social')
  await expectTouchTarget(button)
  await button.tap()
  const dialog = page.getByTestId('social-dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('Bizi takip et!')
  await expect(dialog).toContainText('linktr.ee/atutechbuilders')
  const qr = page.getByTestId('social-qr')
  await expect(qr).toBeVisible()
  // the QR image really loaded, and is big enough to scan from the booth
  expect(await qr.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(1000)
  const box = (await qr.boundingBox())!
  expect(box.width).toBeGreaterThanOrEqual(300)
  await expectTouchTarget(page.getByTestId('social-close'))
}

test('home: "Bizi takip et" opens the Linktree QR; X, Escape and a tap outside close it', async ({
  page,
}) => {
  await page.goto('/?skipTutorial=1')
  await expectQrDialog(page)
  expect(await scanA11y(page)).toEqual([])
  await page.getByTestId('social-close').tap()
  await expect(page.getByTestId('social-dialog')).toHaveCount(0)
  // mouse, then Escape
  await page.getByTestId('btn-social').click()
  await expect(page.getByTestId('social-dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('social-dialog')).toHaveCount(0)
  // a tap outside the card
  await page.getByTestId('btn-social').tap()
  await page.touchscreen.tap(40, 400)
  await expect(page.getByTestId('social-dialog')).toHaveCount(0)
  await expect(page.getByTestId('home')).toBeVisible()
})

test('the QR is on the scenario final, in the dark theme too', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('buildarena.ayarlar.v1', JSON.stringify({ theme: 'dark' })),
  )
  await startScenario(page)
  await playSteps(page, ['a', 'b', 'c', 'a', 'a'])
  await expect(page.getByTestId('scenario-result')).toBeVisible()
  await expectQrDialog(page)
  // the code stays on white so every phone camera reads it
  const bg = await page
    .getByTestId('social-qr')
    .evaluate((img) => getComputedStyle(img.parentElement!).backgroundColor)
  expect(bg).toBe('rgb(255, 255, 255)')
  expect(await scanA11y(page)).toEqual([])
})

test('the QR is on the duel result', async ({ page }) => {
  await page.goto('/duel?skipTutorial=1&seed=3&fastTimers=1')
  await page.getByTestId('p1-ready').tap()
  await page.getByTestId('p2-ready').tap()
  await expect(page.getByTestId('duel-game')).toBeVisible({ timeout: 10_000 })
  for (const id of ['p1-finish', 'p2-finish']) {
    const b = (await page.getByTestId(id).boundingBox())!
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
    await page.mouse.down()
    await page.waitForTimeout(900)
    await page.mouse.up()
  }
  await expect(page.getByTestId('duel-result')).toBeVisible({ timeout: 10_000 })
  await expectQrDialog(page)
})

test('scenario: the home button inside the round asks first; leaving resets the game', async ({
  page,
}) => {
  await page.goto(SCENARIO_URL)
  await page.getByTestId('nick-input').fill('Korkut')
  await page.getByTestId('scenario-start').tap()
  // on the wheel …
  await expect(page.getByTestId('scenario-wheel')).toBeVisible()
  await page.waitForTimeout(500) // the screen's entrance
  await expectTouchTarget(page.getByTestId('btn-home'))
  await expect(page.getByTestId('scenario-intro')).toBeVisible({ timeout: 15_000 })
  // … and on the crisis intro
  await expectTouchTarget(page.getByTestId('btn-home'))
  await page.getByTestId('crisis-start').tap()
  await expect(page.getByTestId('scenario-game')).toBeVisible({ timeout: 10_000 })
  const home = page.getByTestId('btn-home')
  await expectTouchTarget(home)
  await home.tap()
  const dialog = page.getByTestId('confirm-dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('Oyundan çıkılsın mı?')
  // "Ana sayfaya dön" stays on one line: both buttons are the same height
  const ok = (await page.getByTestId('confirm-ok').boundingBox())!
  const cancel = (await page.getByTestId('confirm-cancel').boundingBox())!
  expect(ok.height).toBe(cancel.height)
  await page.waitForTimeout(400) // the dialog's fade-in
  expect(await scanA11y(page)).toEqual([])
  // "Vazgeç" keeps playing
  await page.getByTestId('confirm-cancel').tap()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByTestId('scenario-game')).toBeVisible()
  // "Ana sayfaya dön" leaves without saving
  await home.tap()
  await page.getByTestId('confirm-ok').tap()
  await expect(page.getByTestId('home')).toBeVisible()
  await page.goBack()
  await expect(page.getByTestId('scenario-nickname')).toBeVisible()
})

test('duel: the home button inside the round asks first, then goes home', async ({ page }) => {
  await page.goto('/duel?skipTutorial=1&seed=3&fastTimers=1')
  await page.getByTestId('p1-ready').tap()
  await page.getByTestId('p2-ready').tap()
  await expect(page.getByTestId('duel-game')).toBeVisible({ timeout: 10_000 })
  const home = page.getByTestId('btn-home')
  await expectTouchTarget(home)
  await home.tap()
  await expect(page.getByTestId('confirm-dialog')).toBeVisible()
  await page.getByTestId('confirm-cancel').tap()
  await expect(page.getByTestId('duel-game')).toBeVisible()
  await home.click()
  await page.getByTestId('confirm-ok').click()
  await expect(page.getByTestId('home')).toBeVisible()
})

test('the opening animation plays, then lifts onto the game; a tap skips it', async ({ page }) => {
  await page.goto('/?skipTutorial=1&intro=1')
  const intro = page.getByTestId('boot-intro')
  await expect(intro).toBeVisible()
  await expect(intro).toContainText('ATÜ TECHBUILDERS')
  await expect(intro.locator('[data-testid="hero"]')).toBeVisible()
  // it covers the game while it plays, and is gone after about 2.7 s
  await expect(intro).toHaveCount(0, { timeout: 5_000 })
  await expect(page.getByTestId('home')).toBeVisible()
  await expect(page.getByTestId('btn-duel')).toBeVisible()

  await page.goto('/?skipTutorial=1&intro=1')
  await expect(page.getByTestId('boot-intro')).toBeVisible()
  await page.touchscreen.tap(640, 400)
  await expect(page.getByTestId('boot-intro')).toHaveAttribute('data-leaving', 'true')
  await expect(page.getByTestId('boot-intro')).toHaveCount(0, { timeout: 1_500 })
})

test('without the flag the browser opens straight onto the game', async ({ page }) => {
  await page.goto('/?skipTutorial=1')
  await expect(page.getByTestId('home')).toBeVisible()
  await expect(page.getByTestId('boot-intro')).toHaveCount(0)
})

test('leaderboard: no "SEN · bu oyun" legend any more', async ({ page }) => {
  await page.goto('/leaderboard?skipTutorial=1&demo=1')
  await expect(page.getByTestId('leaderboard')).toBeVisible()
  await expect(page.getByTestId('leaderboard')).not.toContainText('bu oyun')
  await expect(page.getByTestId('leaderboard')).toContainText('paylaşım izni var')
})
