import { expect, test, type Page } from '@playwright/test'
import {
  expectTouchTarget,
  musicStats,
  presetSettings,
  recordVibrations,
  soundStats,
  vibrations,
} from './helpers.ts'

// Button matrix (document §16.5). Every navigating control on every screen reachable by URL
// gets a row; buttons that change state, and the duel/result/staff screens that need a played
// round or the PIN, are tested in their own specs (duel, scenario, staff, home specs). When a work package replaces a placeholder screen,
// update its rows here: same data-testids, real behaviour.
interface ButtonRow {
  screen: string
  path: string
  button: string
  opens: string
  url: string
}

const MATRIX: ButtonRow[] = [
  { screen: 'Tutorial', path: '/tutorial', button: 'tutorial-skip', opens: 'home', url: '/' },
  { screen: 'Home', path: '/', button: 'btn-duel', opens: 'task-card', url: '/duel' },
  {
    screen: 'Home',
    path: '/',
    button: 'btn-scenario',
    opens: 'scenario-nickname',
    url: '/scenario',
  },
  {
    screen: 'Home',
    path: '/',
    button: 'btn-leaderboard',
    opens: 'leaderboard',
    url: '/leaderboard',
  },
  { screen: 'Home', path: '/', button: 'btn-howto', opens: 'onboarding', url: '/tutorial' },
  { screen: 'Home', path: '/', button: 'btn-settings', opens: 'pin-dialog', url: '/' },
  { screen: 'Task card', path: '/duel', button: 'btn-home', opens: 'home', url: '/' },
  { screen: 'Scenario nickname', path: '/scenario', button: 'btn-home', opens: 'home', url: '/' },
  {
    screen: 'Scenario nickname',
    path: '/scenario',
    button: 'btn-leaderboard',
    opens: 'leaderboard',
    url: '/leaderboard',
  },
  { screen: 'Leaderboard', path: '/leaderboard', button: 'btn-home', opens: 'home', url: '/' },
  {
    screen: 'Leaderboard',
    path: '/leaderboard',
    button: 'scenario-new-player',
    opens: 'scenario-nickname',
    url: '/scenario',
  },
  {
    screen: 'Leaderboard',
    path: '/leaderboard',
    button: 'btn-staff',
    opens: 'pin-dialog',
    url: '/leaderboard',
  },
  { screen: 'Staff PIN', path: '/admin', button: 'pin-close', opens: 'home', url: '/' },
]

async function open(page: Page, path: string) {
  await page.goto(`${path}?skipTutorial=1`)
}

for (const row of MATRIX) {
  test.describe(`${row.screen} › ${row.button}`, () => {
    test('is visible with a touch target of at least 56×56 px', async ({ page }) => {
      await open(page, row.path)
      const button = page.getByTestId(row.button)
      await expect(button).toBeVisible()
      await expectTouchTarget(button)
    })

    test(`touch: opens ${row.opens}`, async ({ page }) => {
      await open(page, row.path)
      await page.getByTestId(row.button).tap()
      await expect(page.getByTestId(row.opens)).toBeVisible()
      await expect(page).toHaveURL((url) => url.pathname === row.url)
    })

    test(`mouse: opens ${row.opens}`, async ({ page }) => {
      await open(page, row.path)
      await page.getByTestId(row.button).click()
      await expect(page.getByTestId(row.opens)).toBeVisible()
      await expect(page).toHaveURL((url) => url.pathname === row.url)
    })
  })
}

test('double-tap guard: a double tap on Düello navigates exactly once', async ({ page }) => {
  await open(page, '/')
  const before = await page.evaluate(() => history.length)
  await page.getByTestId('btn-duel').dblclick()
  await expect(page.getByTestId('task-card')).toHaveCount(1)
  expect(await page.evaluate(() => history.length)).toBe(before + 1)
})

test('closing the staff PIN returns to the screen it was opened from', async ({ page }) => {
  await open(page, '/')
  await page.getByTestId('btn-settings').tap()
  await expect(page.getByTestId('pin-dialog')).toBeVisible()
  await page.getByTestId('pin-close').tap()
  await expect(page.getByTestId('home')).toBeVisible()
  await expect(page.getByTestId('pin-dialog')).toHaveCount(0)
  await expect(page).toHaveURL((url) => url.pathname === '/')
})

test('music and effects have separate buttons; both are remembered after a reload', async ({
  page,
}) => {
  await open(page, '/')
  const music = page.getByTestId('btn-music')
  const sound = page.getByTestId('btn-sound')
  await expectTouchTarget(music)
  await expectTouchTarget(sound)
  await expect(music).toHaveAttribute('data-music', 'true')
  await expect(sound).toHaveAttribute('aria-pressed', 'true')
  // the music button opens its panel: the music switch and the volume
  await expect(music).toHaveAttribute('aria-expanded', 'false')
  await music.tap()
  await expect(music).toHaveAttribute('aria-expanded', 'true')
  const toggle = page.getByTestId('music-toggle')
  await expectTouchTarget(toggle)
  await expect(toggle).toHaveAttribute('aria-checked', 'true')
  await toggle.tap()
  await expect(toggle).toHaveAttribute('aria-checked', 'false')
  await expect(music).toHaveAttribute('data-music', 'false')
  await expect(sound).toHaveAttribute('aria-pressed', 'true')
  // a touch outside closes the panel
  await page.touchscreen.tap(640, 760)
  await expect(page.getByTestId('audio-pop')).toHaveCount(0)
  await expect(music).toHaveAttribute('aria-expanded', 'false')
  await page.reload()
  await expect(page.getByTestId('btn-music')).toHaveAttribute('data-music', 'false')
  await page.getByTestId('btn-sound').tap()
  await expect(page.getByTestId('btn-sound')).toHaveAttribute('aria-pressed', 'false')
  await page.goto('/scenario?skipTutorial=1')
  await expect(page.getByTestId('btn-music')).toHaveAttribute('data-music', 'false')
  await expect(page.getByTestId('btn-sound')).toHaveAttribute('aria-pressed', 'false')
  // the button itself toggles the panel shut again (mouse)
  await page.getByTestId('btn-music').click()
  await expect(page.getByTestId('audio-pop')).toBeVisible()
  await page.getByTestId('btn-music').click()
  await expect(page.getByTestId('audio-pop')).toHaveCount(0)
})

test('home: no footer line, no slider on the screen; the volume sits in the music panel', async ({
  page,
}) => {
  await open(page, '/')
  await expect(page.getByTestId('home')).not.toContainText('Başlamak için bir moda dokun')
  await expect(page.getByTestId('home')).not.toContainText('4 Kasım Stant Etkinliği')
  await expect(page.getByTestId('volume-slider')).toHaveCount(0)
  await page.getByTestId('btn-music').tap()
  const box = page.getByTestId('volume-slider-box')
  const slider = page.getByTestId('volume-slider')
  const value = page.getByTestId('volume-slider-value')
  await expectTouchTarget(box)
  await expect(slider).toHaveValue('80')
  const b = (await slider.boundingBox())!
  // touch near the left end → quiet; mouse near the right end → loud
  await page.touchscreen.tap(b.x + b.width * 0.12, b.y + b.height / 2)
  await expect.poll(async () => Number(await slider.inputValue())).toBeLessThan(30)
  await page.mouse.click(b.x + b.width - 4, b.y + b.height / 2)
  await expect(value).toHaveText('%100')
  await page.reload()
  await page.getByTestId('btn-music').tap()
  await expect(page.getByTestId('volume-slider')).toHaveValue('100')
})

test('music: chill on the menu, its own piece in the scenario, the duel drops the beat', async ({
  page,
}) => {
  await page.goto('/?skipTutorial=1&seed=3&fastTimers=1')
  // the first touch unlocks audio and starts the menu piece
  await page.getByTestId('hero').tap()
  await expect.poll(() => musicStats(page)).toMatchObject({ playing: true, song: 'menu' })
  await page.getByTestId('btn-scenario').tap()
  await expect.poll(() => musicStats(page)).toMatchObject({ mood: 'scenario', song: 'scenario' })
  await page.getByTestId('btn-home').tap()
  await expect.poll(() => musicStats(page)).toMatchObject({ mood: 'menu', song: 'menu' })
  // the task card builds up (drums wait), the round drops the beat
  await page.getByTestId('btn-duel').tap()
  await expect.poll(() => musicStats(page)).toMatchObject({ mood: 'duelBuild', song: 'duel' })
  // switching the music off stops it; on again, the same piece comes back
  await page.getByTestId('btn-music').tap()
  await page.getByTestId('music-toggle').tap()
  await expect.poll(() => musicStats(page)).toMatchObject({ playing: false })
  await page.getByTestId('music-toggle').tap()
  await expect.poll(() => musicStats(page)).toMatchObject({ playing: true, song: 'duel' })
  await page.getByTestId('btn-music').tap()
  await page.getByTestId('p1-ready').tap()
  await page.getByTestId('p2-ready').tap()
  await expect(page.getByTestId('duel-game')).toBeVisible({ timeout: 10_000 })
  await expect.poll(() => musicStats(page)).toMatchObject({ mood: 'duel', song: 'duel' })
})

test('buttons answer with a sound effect and a short vibration', async ({ page }) => {
  await recordVibrations(page)
  await open(page, '/')
  const before = (await soundStats(page)).sfx
  await page.getByTestId('btn-scenario').tap()
  await expect(page.getByTestId('scenario-nickname')).toBeVisible()
  expect((await soundStats(page)).sfx).toBeGreaterThan(before)
  expect(await vibrations(page)).toContain(8)
})

test('switched-off vibration stays silent', async ({ page }) => {
  await recordVibrations(page)
  await presetSettings(page, { haptics: false })
  await open(page, '/')
  await page.getByTestId('btn-scenario').tap()
  await expect(page.getByTestId('scenario-nickname')).toBeVisible()
  expect(await vibrations(page)).toEqual([])
})
