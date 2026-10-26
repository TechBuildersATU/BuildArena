import { expect, test, type Page } from '@playwright/test'
import { SCENARIO_URL, waitForAnimations } from './helpers.ts'

// The tablet's keyboard opens over the game (the APK sends its height as the "ba:keyboard"
// event): the stage never shrinks, and slides up only as far as needed to keep the nickname
// field visible above the keyboard.

const stage = (page: Page) => page.locator('[data-stage]')
const keyboard = (page: Page, height: number) =>
  page.evaluate(
    (h) => window.dispatchEvent(new CustomEvent('ba:keyboard', { detail: { height: h } })),
    height,
  )
const scaleOf = (page: Page) =>
  stage(page).evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a)
const settled = async (page: Page) => {
  await page.waitForTimeout(350) // the 0.25 s slide
  await waitForAnimations(page)
}

test('the keyboard never shrinks the screen; a covered field slides up above it', async ({
  page,
}) => {
  await page.goto(SCENARIO_URL)
  const field = page.getByTestId('nick-field')
  const input = page.getByTestId('nick-input')
  await input.tap()
  await page.keyboard.type('Ece')
  await expect(input).toHaveValue('Ece')
  await settled(page)
  const before = (await field.boundingBox())!
  expect(await scaleOf(page)).toBeCloseTo(1)

  // a keyboard that leaves the field visible: nothing moves
  await keyboard(page, 300)
  await expect(stage(page)).toHaveAttribute('data-lift', '0')

  // a tall keyboard would cover the field: the stage slides up, at the same size
  await keyboard(page, 520)
  await expect(stage(page)).not.toHaveAttribute('data-lift', '0')
  await settled(page)
  expect(await scaleOf(page)).toBeCloseTo(1)
  const lifted = (await field.boundingBox())!
  expect(lifted.height).toBeCloseTo(before.height, 0)
  expect(lifted.y + lifted.height).toBeLessThanOrEqual(800 - 520)
  expect(lifted.y + lifted.height).toBeGreaterThan(800 - 520 - 40)

  // typing still works while the keyboard is up
  await page.keyboard.type('m')
  await expect(input).toHaveValue('Ecem')

  // keyboard closed → back in place
  await keyboard(page, 0)
  await expect(stage(page)).toHaveAttribute('data-lift', '0')
  await settled(page)
  const after = (await field.boundingBox())!
  expect(after.y).toBeCloseTo(before.y, 0)

  // leaving the field with the keyboard still reported up also brings the stage back
  await input.tap()
  await keyboard(page, 520)
  await expect(stage(page)).not.toHaveAttribute('data-lift', '0')
  await input.blur()
  await expect(stage(page)).toHaveAttribute('data-lift', '0')
})
