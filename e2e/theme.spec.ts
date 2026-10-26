import { expect, test, type Page } from '@playwright/test'
import { expectTouchTarget, playSteps, presetSettings, scanA11y, startScenario } from './helpers.ts'

// The palette's dark version: the moon button in the top-right corner of every header switches
// it, it is remembered on the device, and every screen stays readable (axe) in the dark.

const html = (page: Page) => page.locator('html')

test('the moon button switches the dark theme on and off and is remembered', async ({ page }) => {
  await page.goto('/?skipTutorial=1')
  const button = page.getByTestId('btn-theme')
  await expectTouchTarget(button)
  await expect(html(page)).toHaveAttribute('data-theme', 'light')
  await expect(button).toHaveAttribute('aria-pressed', 'false')
  await expect(button).toHaveAttribute('aria-label', 'Koyu temaya geç')
  const lightBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  expect(lightBg).toBe('rgb(255, 244, 230)') // the palette's paper

  await button.tap()
  await expect(html(page)).toHaveAttribute('data-theme', 'dark')
  await expect(button).toHaveAttribute('aria-pressed', 'true')
  await expect(button).toHaveAttribute('aria-label', 'Açık temaya geç')
  const darkBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  expect(darkBg).toBe('rgb(28, 30, 33)')
  // the printed colours keep their fills: the play button is the same raspberry
  await page.getByTestId('btn-scenario').tap()
  await page.getByTestId('nick-input').fill('Gece')
  const pri = await page
    .getByTestId('scenario-start')
    .evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(pri).toBe('rgb(166, 30, 77)')

  await page.goto('/scenario?skipTutorial=1') // a fresh start keeps the theme
  await expect(html(page)).toHaveAttribute('data-theme', 'dark')
  // every header has the button
  await expect(page.getByTestId('btn-theme')).toBeVisible()
  await page.getByTestId('btn-theme').click()
  await expect(html(page)).toHaveAttribute('data-theme', 'light')
  await page.goto('/duel?skipTutorial=1')
  await expect(page.getByTestId('btn-theme')).toHaveAttribute('aria-pressed', 'false')
})

test('dark: a played scenario, its final and the leaderboard stay readable', async ({ page }) => {
  await presetSettings(page, { theme: 'dark' })
  await startScenario(page)
  expect(await scanA11y(page)).toEqual([])
  await playSteps(page, ['a', 'b', 'c', 'a', 'a'])
  await expect(page.getByTestId('scenario-result')).toBeVisible()
  await page.waitForTimeout(3000)
  expect(await scanA11y(page)).toEqual([])
  await page.getByTestId('btn-leaderboard').tap()
  await expect(page.getByTestId('leaderboard')).toBeVisible()
  await page.waitForTimeout(1500)
  expect(await scanA11y(page)).toEqual([])
  await page.getByTestId('tab-duel').tap()
  await page.waitForTimeout(1200)
  expect(await scanA11y(page)).toEqual([])
})

test('dark: the duel game and its result stay readable', async ({ page }) => {
  await presetSettings(page, { theme: 'dark' })
  await page.goto('/duel?skipTutorial=1&seed=3&fastTimers=1')
  await page.getByTestId('p1-ready').tap()
  await page.getByTestId('p2-ready').tap()
  await expect(page.getByTestId('duel-game')).toBeVisible({ timeout: 10_000 })
  await page.waitForTimeout(800)
  expect(await scanA11y(page)).toEqual([])
  for (const id of ['p1-finish', 'p2-finish']) {
    const box = (await page.getByTestId(id).boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.waitForTimeout(900)
    await page.mouse.up()
  }
  await expect(page.getByTestId('duel-result')).toBeVisible({ timeout: 10_000 })
  await page.waitForTimeout(3500)
  expect(await scanA11y(page)).toEqual([])
})

test('dark: the staff menu tabs and the music panel stay readable', async ({ page }) => {
  await presetSettings(page, { theme: 'dark' })
  await page.goto('/leaderboard?skipTutorial=1&demo=1')
  await page.getByTestId('btn-staff').tap()
  for (const d of '1234') await page.getByTestId(`pin-key-${d}`).tap()
  await expect(page.getByTestId('admin')).toBeVisible()
  for (const tab of ['tab-top', 'tab-stats', 'tab-set']) {
    await page.getByTestId(tab).tap()
    await page.waitForTimeout(1200)
    expect(await scanA11y(page), tab).toEqual([])
  }
  await page.getByTestId('btn-home').tap()
  await page.getByTestId('btn-music').tap()
  await expect(page.getByTestId('audio-pop')).toBeVisible()
  await page.waitForTimeout(400)
  expect(await scanA11y(page)).toEqual([])
})
