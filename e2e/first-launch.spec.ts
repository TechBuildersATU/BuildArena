import { expect, test } from '@playwright/test'

// First-launch tutorial (document §4.1, §16.5 "First launch").

test('a fresh device opens the tutorial first', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/tutorial$/)
  await expect(page.getByTestId('onboarding')).toBeVisible()
})

test('after Skip the tutorial is not shown again on reload', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('tutorial-skip').tap()
  await expect(page.getByTestId('home')).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('buildarena.tutorialSeen'))).toBe('1')

  await page.reload()
  await expect(page.getByTestId('home')).toBeVisible()
})

test('How to Play reopens the tutorial after it was seen', async ({ page }) => {
  await page.goto('/?skipTutorial=1')
  await page.getByTestId('btn-howto').tap()
  await expect(page.getByTestId('onboarding')).toBeVisible()
})

test('unknown URLs land on Home', async ({ page }) => {
  await page.goto('/nope?skipTutorial=1')
  await expect(page.getByTestId('home')).toBeVisible()
})
