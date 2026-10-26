import { afterEach, describe, expect, it, vi } from 'vitest'
import { applyTheme } from '@/app/theme'
import { DEFAULT_SETTINGS, useSettingsStore } from '@/stores/settingsStore'

afterEach(() => useSettingsStore.setState({ ...DEFAULT_SETTINGS }))

describe('dark theme (the palette’s night version)', () => {
  it('starts light; the moon toggles it, <html> follows and the choice is remembered', () => {
    expect(DEFAULT_SETTINGS.theme).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
    useSettingsStore.getState().toggleTheme()
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')
    const saved = JSON.parse(window.localStorage.getItem('buildarena.ayarlar.v1') ?? '{}')
    expect(saved.theme).toBe('dark')
    useSettingsStore.getState().toggleTheme()
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('the browser bar colour follows the background', () => {
    const meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.appendChild(meta)
    applyTheme('dark')
    expect(meta.content).toBe('#1B1D20')
    applyTheme('light')
    expect(meta.content).toBe('#FFF4E6')
    meta.remove()
  })

  it('an unknown saved theme falls back to light', async () => {
    window.localStorage.setItem('buildarena.ayarlar.v1', JSON.stringify({ theme: 'neon' }))
    vi.resetModules()
    const fresh = await import('@/stores/settingsStore')
    expect(fresh.useSettingsStore.getState().theme).toBe('light')
    window.localStorage.setItem('buildarena.ayarlar.v1', JSON.stringify({ theme: 'dark' }))
    vi.resetModules()
    const dark = await import('@/stores/settingsStore')
    expect(dark.useSettingsStore.getState().theme).toBe('dark')
    window.localStorage.removeItem('buildarena.ayarlar.v1')
  })
})
