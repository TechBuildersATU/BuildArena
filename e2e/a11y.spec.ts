import { expect, test } from '@playwright/test'
import { presetSettings, scanA11y } from './helpers.ts'

// Accessibility scan of every screen reachable by URL (document §16.5), in the light theme and
// in the palette's dark version. Screens that need a played round are scanned in their own
// specs (light) and in theme.spec.ts (dark).
const SCREENS = [
  ['/tutorial', 'onboarding'],
  ['/', 'home'],
  ['/duel', 'task-card'],
  ['/scenario', 'scenario-nickname'],
  ['/leaderboard?demo=1', 'leaderboard'],
  ['/admin', 'pin-dialog'],
] as const

for (const theme of ['light', 'dark'] as const) {
  for (const [path, testId] of SCREENS) {
    test(`${testId} has no accessibility violations (${theme})`, async ({ page }) => {
      await presetSettings(page, { theme })
      await page.goto(`${path}${path.includes('?') ? '&' : '?'}skipTutorial=1`)
      await expect(page.getByTestId(testId)).toBeVisible()
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
      await page.waitForTimeout(1500) // let entrance animations settle
      expect(await scanA11y(page)).toEqual([])
    })
  }
}
