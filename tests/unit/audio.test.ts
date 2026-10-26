import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ROUTES } from '@/app/routes'
import { audioStats, masterGain } from '@/audio/engine'
import { haptic } from '@/audio/haptics'
import { sfx } from '@/audio/sfx'
import { moodFor } from '@/audio/useMood'
import { clampVolume, DEFAULT_SETTINGS, useSettingsStore } from '@/stores/settingsStore'

// jsdom has no Web Audio: the effects stay silent but are still counted, and the haptics
// (navigator.vibrate) are checked through a mock.

const vibrate = vi.fn<(pattern: number | number[]) => boolean>(() => true)

beforeEach(() => {
  Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true })
  vibrate.mockClear()
})
afterEach(() => useSettingsStore.setState({ ...DEFAULT_SETTINGS }))

describe('haptics', () => {
  it('short patterns, only when vibration is switched on', () => {
    haptic('tap')
    expect(vibrate).toHaveBeenLastCalledWith(8)
    haptic('win')
    expect(vibrate).toHaveBeenLastCalledWith([35, 55, 35, 55, 110])
    useSettingsStore.getState().toggle('haptics')
    haptic('tap')
    expect(vibrate).toHaveBeenCalledTimes(2)
  })

  it('effects vibrate together with their sound (error, stamp, timeout, win)', () => {
    sfx.error()
    expect(vibrate).toHaveBeenLastCalledWith([28, 45, 28])
    sfx.stamp()
    expect(vibrate).toHaveBeenLastCalledWith(35)
    sfx.timeout()
    expect(vibrate).toHaveBeenLastCalledWith(55)
    sfx.win()
    expect(vibrate).toHaveBeenLastCalledWith([35, 55, 35, 55, 110])
  })

  it('a missing Vibration API (iPad) is ignored', () => {
    Object.defineProperty(navigator, 'vibrate', { value: undefined, configurable: true })
    expect(() => haptic('drop')).not.toThrow()
  })
})

describe('sound effects', () => {
  it('there are more than 30 different effects and none throws without audio', () => {
    const names = Object.keys(sfx) as (keyof typeof sfx)[]
    expect(names.length).toBeGreaterThanOrEqual(30)
    for (const name of names) {
      const play = sfx[name] as (arg?: number) => void
      expect(() => play(1), name).not.toThrow()
    }
  })

  it('rapid repeats of tiny sounds are rate-limited (typing, count-up)', () => {
    const now = vi.spyOn(performance, 'now').mockReturnValue(1e7)
    const before = audioStats.sfx
    sfx.key()
    sfx.key()
    sfx.key()
    expect(audioStats.sfx - before).toBe(1)
    now.mockReturnValue(1e7 + 50)
    sfx.key()
    expect(audioStats.sfx - before).toBe(2)
    expect(audioStats.lastSfx).toBe('key')
    now.mockRestore()
  })
})

describe('music moods and volume', () => {
  it('each part of the game has its own piece; the duel builds up on the task card', () => {
    expect(moodFor(ROUTES.home)).toBe('menu')
    expect(moodFor(ROUTES.tutorial)).toBe('menu')
    expect(moodFor(ROUTES.leaderboard)).toBe('menu')
    expect(moodFor(ROUTES.admin)).toBe('menu')
    expect(moodFor(ROUTES.duelResult)).toBe('menu')
    expect(moodFor(ROUTES.duelIntro)).toBe('duelBuild')
    expect(moodFor(ROUTES.duelGame)).toBe('duel')
    for (const r of [
      ROUTES.scenarioNickname,
      ROUTES.scenarioIntro,
      ROUTES.scenarioGame,
      ROUTES.scenarioResult,
    ])
      expect(moodFor(r)).toBe('scenario')
  })

  it('the volume slider maps 0–100 % to the master gain on a square curve', () => {
    expect(masterGain(0)).toBe(0)
    expect(masterGain(100)).toBeCloseTo(1.45)
    // the default is a little louder than the old fixed master level (0.85)
    expect(masterGain(DEFAULT_SETTINGS.volume)).toBeGreaterThan(0.85)
    expect(masterGain(DEFAULT_SETTINGS.volume)).toBeLessThan(1)
    expect(masterGain(50)).toBeLessThan(masterGain(60))
    expect(masterGain(150)).toBe(masterGain(100))
  })

  it('the volume is remembered and kept within 0–100', () => {
    expect(DEFAULT_SETTINGS.volume).toBe(80)
    useSettingsStore.getState().set('volume', 35)
    const saved = JSON.parse(window.localStorage.getItem('buildarena.ayarlar.v1') ?? '{}')
    expect(saved.volume).toBe(35)
    expect(clampVolume(140)).toBe(100)
    expect(clampVolume(-5)).toBe(0)
    expect(clampVolume(42.6)).toBe(43)
    expect(clampVolume('loud')).toBe(80)
    expect(clampVolume(Number.NaN)).toBe(80)
  })
})

describe('settings', () => {
  it('duel lengths are 45 / 60 / 90 s; a device that saved 120 s falls back to 90 s', async () => {
    window.localStorage.setItem('buildarena.ayarlar.v1', JSON.stringify({ duelSec: 120 }))
    vi.resetModules()
    const fresh = await import('@/stores/settingsStore')
    expect(fresh.DUEL_SECONDS).toEqual([45, 60, 90])
    expect(fresh.useSettingsStore.getState().duelSec).toBe(90)
    window.localStorage.setItem('buildarena.ayarlar.v1', JSON.stringify({ duelSec: 45 }))
    vi.resetModules()
    const again = await import('@/stores/settingsStore')
    expect(again.useSettingsStore.getState().duelSec).toBe(45)
    window.localStorage.removeItem('buildarena.ayarlar.v1')
  })

  it('music and effects are separate switches and are remembered on the device', () => {
    const s = useSettingsStore.getState()
    s.toggle('music')
    expect(useSettingsStore.getState()).toMatchObject({ music: false, sfx: true })
    useSettingsStore.getState().toggle('sfx')
    useSettingsStore.getState().set('stepSec', 15)
    useSettingsStore.getState().set('duelSec', 60)
    const saved = JSON.parse(window.localStorage.getItem('buildarena.ayarlar.v1') ?? '{}')
    expect(saved).toMatchObject({ music: false, sfx: false, stepSec: 15, duelSec: 60 })
  })
})
