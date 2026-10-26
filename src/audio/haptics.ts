import { useSettingsStore } from '@/stores/settingsStore'

// Vibration feedback (Android tablets; iPadOS has no Vibration API and simply stays silent).
// Short, light patterns so it confirms a touch without startling anyone.

const PATTERNS = {
  tap: 8,
  select: 14,
  lift: 10,
  drop: 18,
  tick: 6,
  error: [28, 45, 28],
  warn: 55,
  stamp: 35,
  success: [18, 40, 18, 40, 50],
  win: [35, 55, 35, 55, 110],
} as const

export type HapticKind = keyof typeof PATTERNS

export function haptic(kind: HapticKind): void {
  if (!useSettingsStore.getState().haptics) return
  // browsers refuse (and log) vibration before the first touch on the page
  if (navigator.userActivation?.hasBeenActive === false) return
  try {
    const pattern = PATTERNS[kind]
    navigator.vibrate?.(typeof pattern === 'number' ? pattern : [...pattern])
  } catch {
    // not supported
  }
}
