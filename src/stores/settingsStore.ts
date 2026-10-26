import { create } from 'zustand'
import { readString, writeString } from '@/app/storage'

// Booth settings (full prototype §7.3), remembered on the device. Sound effects, music and
// vibration are separate switches; the music and effect buttons sit in the screen headers and
// the volume slider on the home screen (and in the staff settings).

export type Theme = 'light' | 'dark'

export interface Settings {
  /** duel round length: 45 / 60 / 90 s (short rounds keep the booth moving) */
  duelSec: number
  /** scenario decision time: 15 / 20 / 25 s */
  stepSec: number
  sfx: boolean
  music: boolean
  haptics: boolean
  /** master volume of music and effects, 0–100 % */
  volume: number
  /** light = the palette's paper look, dark = its night version (moon button in the headers) */
  theme: Theme
  /** the tutorial loops on the idle screen */
  idleTut: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  duelSec: 90,
  stepSec: 20,
  sfx: true,
  music: true,
  haptics: true,
  volume: 80,
  theme: 'light',
  idleTut: false,
}

export const DUEL_SECONDS = [45, 60, 90] as const
export const STEP_SECONDS = [15, 20, 25] as const

const KEY = 'buildarena.ayarlar.v1'

/** A whole percentage 0–100; anything else falls back to the default. */
export function clampVolume(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v)
    ? Math.round(Math.min(100, Math.max(0, v)))
    : DEFAULT_SETTINGS.volume
}

function load(): Settings {
  try {
    const saved = JSON.parse(readString(KEY) ?? '{}') as Partial<Settings>
    const merged = { ...DEFAULT_SETTINGS, ...saved }
    if (!DUEL_SECONDS.includes(merged.duelSec as 60)) merged.duelSec = DEFAULT_SETTINGS.duelSec
    if (!STEP_SECONDS.includes(merged.stepSec as 20)) merged.stepSec = DEFAULT_SETTINGS.stepSec
    merged.volume = clampVolume(merged.volume)
    if (merged.theme !== 'dark') merged.theme = 'light'
    return merged
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

interface SettingsState extends Settings {
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  toggle: (key: 'sfx' | 'music' | 'haptics' | 'idleTut') => void
  toggleTheme: () => void
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...load(),
  set: (key, value) => {
    set({ [key]: value } as Partial<Settings>)
    const { duelSec, stepSec, sfx, music, haptics, volume, theme, idleTut } = get()
    writeString(
      KEY,
      JSON.stringify({ duelSec, stepSec, sfx, music, haptics, volume, theme, idleTut }),
    )
  },
  toggleTheme: () => get().set('theme', get().theme === 'dark' ? 'light' : 'dark'),
  toggle: (key) => get().set(key, !get()[key]),
}))
