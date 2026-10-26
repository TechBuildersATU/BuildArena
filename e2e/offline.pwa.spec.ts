import { expect, test } from '@playwright/test'

// WP-02 done criterion: the app also loads with the internet off (document §16.3).
// Runs against the production build so the service worker is active.

test('launches and navigates offline after the first visit', async ({ page, context }) => {
  await context.addInitScript(() => localStorage.setItem('buildarena.tutorialSeen', '1'))
  await page.goto('/')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.reload() // now controlled by the service worker
  await expect(page.getByTestId('home')).toBeVisible()

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByTestId('home')).toBeVisible()

  await page.getByTestId('btn-duel').tap()
  await expect(page.getByTestId('task-card')).toBeVisible()

  await page.goto('/leaderboard') // deep link served by the navigation fallback
  await expect(page.getByTestId('leaderboard')).toBeVisible()
})

test('fonts and logo are served locally', async ({ page, context }) => {
  await context.addInitScript(() => localStorage.setItem('buildarena.tutorialSeen', '1'))
  const external: string[] = []
  page.on('request', (req) => {
    if (!req.url().startsWith('http://localhost')) external.push(req.url())
  })
  await page.goto('/')
  await expect(page.getByTestId('home')).toBeVisible()
  expect(external).toEqual([])
})
