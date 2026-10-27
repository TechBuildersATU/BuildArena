import { expect, test, type Locator } from '@playwright/test'
import { expectTouchTarget, playSteps, scanA11y, startScenario, waitForStep } from './helpers.ts'

// The club's October 27 list: the new logo (ink on the paper, light at night), the situation as
// big as the question, "Bizi takip et" clear of the step scores, the tutorial's slide transition
// and the hand-off from the APK's launch screen to the opening animation.

const box = async (l: Locator) => (await l.boundingBox())!
const loadedWidth = (l: Locator) =>
  l.evaluate((img: HTMLImageElement) => (img.complete ? img.naturalWidth : 0))

test('the new logo: the ink version on the paper, the light version at night', async ({ page }) => {
  await page.goto('/?skipTutorial=1')
  const logo = page.getByTestId('hero-logo')
  await expect(logo).toHaveAttribute('src', /\/logo\/techbuilders_logo_light\.png$/)
  await expect.poll(() => loadedWidth(logo)).toBe(1024)
  await page.getByTestId('btn-theme').tap()
  await expect(logo).toHaveAttribute('src', /\/logo\/techbuilders_logo_dark\.png$/)
  await expect.poll(() => loadedWidth(logo)).toBe(1024)
  // the small logo in the headers follows the theme too
  await page.getByTestId('btn-leaderboard').tap()
  await expect(page.getByTestId('logo')).toHaveAttribute('src', /techbuilders_logo_dark\.png$/)
  await expect.poll(() => loadedWidth(page.getByTestId('logo'))).toBe(1024)
})

test('scenario: the situation is as big as the question, only the question is bold', async ({
  page,
}) => {
  // seed 3 = Hastane, whose first situation is the bank's longest (95 characters, two lines)
  await startScenario(page, 'Korkut', '/scenario?skipTutorial=1&fastTimers=1&seed=3&demo=1')
  await waitForStep(page, 1)
  const situation = page.getByTestId('situation')
  const question = page.getByTestId('question')
  await expect(situation).toHaveText(/^Sabah polikliniğinde 30 randevu iptal edildi/)
  const style = (l: Locator) =>
    l.evaluate((el) => {
      const cs = getComputedStyle(el)
      return { size: cs.fontSize, weight: Number(cs.fontWeight) }
    })
  const s = await style(situation)
  const q = await style(question)
  expect(s.size).toBe(q.size)
  expect(q.weight).toBeGreaterThan(s.weight)
  // two lines of it still leave the options clear below the card, all inside the 800 px stage
  const card = await box(page.getByTestId('situation-card'))
  const a = await box(page.getByTestId('option-a'))
  const d = await box(page.getByTestId('option-d'))
  expect(a.y).toBeGreaterThan(card.y + card.height + 8)
  expect(d.y + d.height).toBeLessThanOrEqual(800)
  expect(a.height).toBeGreaterThanOrEqual(56)
  expect(await scanA11y(page)).toEqual([])
})

test('scenario final: "Bizi takip et" sits in the header, clear of the step scores', async ({
  page,
}) => {
  await startScenario(page)
  await playSteps(page, ['a', 'b', 'c', 'a', 'a'])
  await expect(page.getByTestId('scenario-result')).toBeVisible()
  await expectTouchTarget(page.getByTestId('btn-social'))
  const social = await box(page.getByTestId('btn-social'))
  expect(social.y + social.height).toBeLessThanOrEqual(76) // inside the header bar
  // the bottom row (Yeni oyuncu, Ana Menü, Skor tablosu) stays right of the step scores
  const bars = await box(page.getByTestId('step-bar-5'))
  const firstButton = await box(page.getByTestId('scenario-new-player'))
  expect(firstButton.x).toBeGreaterThan(bars.x + bars.width)
  await page.getByTestId('btn-social').tap()
  await expect(page.getByTestId('social-dialog')).toBeVisible()
})

test('tutorial: Next slides the old page out to the left, Back to the right', async ({ page }) => {
  await page.goto('/tutorial?skipTutorial=1')
  const slide = (n: number) => page.getByTestId(`tutorial-slide-${n}`)
  /** the page's current horizontal offset (px) */
  const shift = (l: Locator) =>
    l.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41)
  await expect(slide(1)).toHaveAttribute('data-state', 'on')
  await page.getByTestId('tutorial-next').tap()
  // the first page keeps its picture while it leaves, the second comes in
  await expect(slide(1)).toHaveAttribute('data-state', 'out')
  await expect(slide(1).getByTestId('hero')).toBeVisible()
  await expect(slide(2)).toHaveAttribute('data-state', 'on')
  await expect.poll(() => shift(slide(1))).toBeLessThan(0)
  await expect(slide(1)).toHaveAttribute('data-state', 'rest')
  await expect(slide(1).getByTestId('hero')).toHaveCount(0)

  await page.getByTestId('tutorial-prev').tap()
  await expect(slide(2)).toHaveAttribute('data-state', 'out')
  await expect.poll(() => shift(slide(2))).toBeGreaterThan(0)
  await expect(slide(1)).toHaveAttribute('data-state', 'on')
  await expect(page.getByTestId('onboarding')).toHaveAttribute('data-slide', '1')
})

test('the opening animation waits for its fonts and logo, then tells the APK it is ready', async ({
  page,
}) => {
  await page.goto('/?skipTutorial=1&intro=1')
  const intro = page.getByTestId('boot-intro')
  await expect(intro).toHaveAttribute('data-ready', 'true')
  await expect(page.locator('html')).toHaveAttribute('data-boot', 'ready')
  await expect(intro.locator('img').first()).toBeVisible()
  await expect(intro).toHaveCount(0, { timeout: 5_000 })
})
