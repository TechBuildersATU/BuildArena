import { useSettingsStore, type Theme } from '@/stores/settingsStore'

// Light is the palette's paper look; dark is its night version (src/styles/tokens.css,
// :root[data-theme='dark']). The choice lives in the settings and is applied to <html>, so
// every token switches at once; the browser bar follows the background.

const BAR: Record<Theme, string> = { light: '#FFF4E6', dark: '#1B1D20' }

export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BAR[theme])
}

applyTheme(useSettingsStore.getState().theme)
useSettingsStore.subscribe((s, prev) => {
  if (s.theme !== prev.theme) applyTheme(s.theme)
})
