import AxeBuilder from '@axe-core/playwright'
import { expect, type Locator, type Page } from '@playwright/test'

/** Scenario test URL: no tutorial, short animation waits, the Yemekhane crisis, a sample day. */
export const SCENARIO_URL = '/scenario?skipTutorial=1&fastTimers=1&seed=0&demo=1'

/**
 * axe scan; returns "rule: help" for each violation. meta-viewport is off on purpose: the booth
 * kiosk disables zoom (document §13.5). `exclude` skips purposely faded, decorative elements.
 */
export async function scanA11y(page: Page, exclude: string[] = []): Promise<string[]> {
  let builder = new AxeBuilder({ page }).disableRules(['meta-viewport'])
  for (const selector of exclude) builder = builder.exclude(selector)
  const results = await builder.analyze()
  return results.violations.map(
    (v) => `${v.id}: ${v.help} → ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`,
  )
}

/** Waits for finite animations (screen entrances, pops) so boxes are measured at rest. */
export async function waitForAnimations(page: Page) {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => undefined)),
    ),
  )
}

export async function expectTouchTarget(locator: Locator, min = { width: 56, height: 56 }) {
  await waitForAnimations(locator.page())
  const box = await locator.boundingBox()
  expect(box, 'element has a box').not.toBeNull()
  expect(box!.width, 'touch width').toBeGreaterThanOrEqual(min.width)
  expect(box!.height, 'touch height').toBeGreaterThanOrEqual(min.height)
}

/** Types into the nickname field (the tablet's own keyboard in real use). */
export async function typeNickname(page: Page, name: string) {
  await page.getByTestId('nick-input').fill(name)
}

/** Nickname → wheel → crisis intro → 3-2-1, ready for step 1. */
export async function startScenario(page: Page, name = 'Korkut', url = SCENARIO_URL) {
  await page.goto(url)
  await typeNickname(page, name)
  await page.getByTestId('scenario-start').tap()
  await expect(page.getByTestId('scenario-intro')).toBeVisible({ timeout: 15_000 })
  await page.getByTestId('crisis-start').tap()
  await expect(page.getByTestId('scenario-game')).toBeVisible({ timeout: 10_000 })
}

/** Waits until step `n` accepts a choice (situation typed, options in, timer running). */
export async function waitForStep(page: Page, n: number) {
  const game = page.getByTestId('scenario-game')
  await expect(game).toHaveAttribute('data-step', String(n))
  await expect(game).toHaveAttribute('data-ready', 'true')
}

/** Plays all five steps with the given option letters, skipping each effect card. */
export async function playSteps(page: Page, letters: string[]) {
  for (const [i, letter] of letters.entries()) {
    await waitForStep(page, i + 1)
    await page.getByTestId(`option-${letter}`).tap()
    await expect(page.getByTestId('effect-sheet')).toHaveAttribute('data-open', 'true')
    await page.getByTestId('effect-next').tap()
  }
}

/** Booth settings stored before the app starts (same key as the staff menu). */
export async function presetSettings(page: Page, settings: Record<string, unknown>) {
  await page.addInitScript((s) => {
    localStorage.setItem('buildarena.ayarlar.v1', JSON.stringify(s))
  }, settings)
}

/** Replaces navigator.vibrate with a recorder; read the calls with `vibrations(page)`. */
export async function recordVibrations(page: Page) {
  await page.addInitScript(() => {
    const calls: unknown[] = []
    ;(window as unknown as { __vibrations: unknown[] }).__vibrations = calls
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: (pattern: unknown) => {
        calls.push(pattern)
        return true
      },
    })
  })
}

export function vibrations(page: Page): Promise<unknown[]> {
  return page.evaluate(() => (window as unknown as { __vibrations: unknown[] }).__vibrations)
}

/** Sound-effect counter exposed by the audio engine in test builds. */
export function soundStats(page: Page): Promise<{ sfx: number; lastSfx: string }> {
  return page.evaluate(
    () =>
      (window as unknown as { __buildarenaAudio: { sfx: number; lastSfx: string } })
        .__buildarenaAudio,
  )
}

/** Which background piece is playing (music.ts, test builds only). */
export function musicStats(page: Page): Promise<{ playing: boolean; mood: string; song: string }> {
  return page.evaluate(
    () =>
      (window as unknown as { __buildarenaMusic: { playing: boolean; mood: string; song: string } })
        .__buildarenaMusic,
  )
}

/** Centre of an element in page coordinates. */
export async function centre(locator: Locator): Promise<{ x: number; y: number }> {
  const box = await locator.boundingBox()
  expect(box, 'element has a box').not.toBeNull()
  return { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 }
}

/** Mouse drag from one element to a point (one player). */
export async function mouseDrag(page: Page, from: Locator, to: { x: number; y: number }) {
  const a = await centre(from)
  await page.mouse.move(a.x, a.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 8 })
  await page.mouse.up()
}
