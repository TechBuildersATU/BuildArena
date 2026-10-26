import { expect, test } from '@playwright/test'
import { expectTouchTarget, presetSettings, scanA11y } from './helpers.ts'

// Tutorial (document §4, full prototype §2) and the Home idle screen (§5).

test('tutorial: 5 slides, auto-advance by each slide’s time, back/next, Haydi on the last', async ({
  page,
}) => {
  await page.clock.install()
  await page.goto('/tutorial?skipTutorial=1')
  const tut = page.getByTestId('onboarding')
  await expect(tut).toHaveAttribute('data-slide', '1')
  await expect(page.getByTestId('tutorial-counter')).toContainText('1 / 5')
  await expect(page.getByTestId('tutorial-prev')).toBeDisabled()
  await expect(page.getByTestId('tutorial-letsgo')).toHaveCount(0)

  // slide 1 stays 5 s, slide 2 stays 6 s
  await page.clock.runFor(4_500)
  await expect(tut).toHaveAttribute('data-slide', '1')
  await page.clock.runFor(800)
  await expect(tut).toHaveAttribute('data-slide', '2')
  await page.clock.runFor(6_200)
  await expect(tut).toHaveAttribute('data-slide', '3')

  await page.getByTestId('tutorial-prev').tap()
  await expect(tut).toHaveAttribute('data-slide', '2')
  await page.getByTestId('tutorial-seg-5').tap()
  await expect(tut).toHaveAttribute('data-slide', '5')
  await expect(page.getByTestId('tutorial-next')).toHaveCount(0)
  await expect(page.getByTestId('tutorial-letsgo')).toBeVisible()
  // the last slide explains the local scoring: no AI any more
  await expect(tut).toContainText('Zor kararlar daha çok puan getirir')
  expect(await scanA11y(page)).toEqual([])
  await page.getByTestId('tutorial-letsgo').tap()
  await expect(page.getByTestId('home')).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('buildarena.tutorialSeen'))).toBe('1')
})

test('tutorial controls meet the touch-target sizes (Back/Next 64 px high)', async ({ page }) => {
  await page.goto('/tutorial?skipTutorial=1')
  await page.getByTestId('tutorial-next').tap()
  for (const id of ['tutorial-prev', 'tutorial-next'])
    await expectTouchTarget(page.getByTestId(id), { width: 56, height: 64 })
  await expectTouchTarget(page.getByTestId('tutorial-skip'))
})

test('tutorial: holding a slide pauses it; swiping changes slide', async ({ page }) => {
  await page.clock.install()
  await page.goto('/tutorial?skipTutorial=1')
  const tut = page.getByTestId('onboarding')
  const slides = page.locator('[class*="tslides"]')
  const box = (await slides.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.clock.runFor(8_000)
  await expect(tut).toHaveAttribute('data-slide', '1')
  await page.mouse.move(box.x + box.width / 2 - 200, box.y + box.height / 2, { steps: 5 })
  await page.mouse.up()
  await expect(tut).toHaveAttribute('data-slide', '2')
})

test('Home: both modes, the duel time and the audio buttons are on screen', async ({ page }) => {
  await page.goto('/?skipTutorial=1')
  for (const id of ['btn-duel', 'btn-scenario', 'btn-music', 'btn-sound', 'btn-leaderboard'])
    await expectTouchTarget(page.getByTestId(id))
  await expect(page.getByTestId('home-duel-sec')).toContainText('90 sn')
  await page.waitForTimeout(1200)
  expect(await scanA11y(page)).toEqual([])
})

test('Home idle: after 60 s the attract screen shows today’s top 3; a touch only wakes it', async ({
  page,
}) => {
  await page.clock.install()
  await page.goto('/?skipTutorial=1&demo=1')
  const home = page.getByTestId('home')
  await expect(home).toHaveAttribute('data-idle', 'false')
  await page.clock.runFor(61_000)
  await expect(home).toHaveAttribute('data-idle', 'true')
  await expect(page.getByTestId('idle-top3')).toContainText('Async Ahtapot · 97')
  // the first touch wakes the screen without starting the mode under the finger
  await page.getByTestId('btn-scenario').tap({ force: true })
  await expect(home).toHaveAttribute('data-idle', 'false')
  await expect(page).toHaveURL((url) => url.pathname === '/')
  await page.getByTestId('btn-scenario').tap()
  await expect(page.getByTestId('scenario-nickname')).toBeVisible()
})

test('Home idle with the tutorial loop setting plays the tutorial; a touch returns', async ({
  page,
}) => {
  await presetSettings(page, { idleTut: true })
  await page.clock.install()
  await page.goto('/?skipTutorial=1')
  await page.clock.runFor(61_000)
  await expect(page.getByTestId('onboarding')).toHaveAttribute('data-loop', 'true')
  await page.getByTestId('onboarding').tap()
  await expect(page.getByTestId('home')).toBeVisible()
})
