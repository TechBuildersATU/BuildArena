import { defineConfig, devices } from '@playwright/test'

// Booth tablet profile (document §16.5): landscape 1280×800 with touch.
const tablet = {
  ...devices['Desktop Chrome'],
  viewport: { width: 1280, height: 800 },
  hasTouch: true,
  locale: 'tr-TR',
}

const DEV_URL = 'http://localhost:5173'
const PREVIEW_URL = 'http://localhost:4173'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // Fake-clock specs also flow in real time; more parallel browsers than this starve them on the
  // dev machine (limited free RAM). Override with --workers when needed.
  workers: process.env.CI ? 2 : 6,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Everyday flows against the dev server (test-only URL flags enabled).
    { name: 'tablet', testIgnore: /\.pwa\.spec\.ts$/, use: { ...tablet, baseURL: DEV_URL } },
    // Production build + service worker: offline launch.
    { name: 'tablet-pwa', testMatch: /\.pwa\.spec\.ts$/, use: { ...tablet, baseURL: PREVIEW_URL } },
  ],
  webServer: [
    {
      command: 'npm run dev -- --port 5173 --strictPort',
      url: DEV_URL,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run build && npm run preview -- --port 4173 --strictPort',
      url: PREVIEW_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
})
