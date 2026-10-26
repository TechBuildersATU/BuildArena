// localStorage can throw (private mode, blocked site data). Every access is wrapped in
// try/catch and falls back to a safe default (document §4.4).

export const STORAGE_KEYS = {
  tutorialSeen: 'buildarena.tutorialSeen',
  soundOff: 'buildarena.soundOff',
  /** Last scenario played on this device; the crisis wheel skips it. */
  lastScenario: 'buildarena.senaryo.son',
  /** Staff PIN lockout: { failures, lockedUntil }. */
  pinLock: 'buildarena.pinLock',
  /** This device's own staff PIN: { salt, hash } (never in the source code). */
  pin: 'buildarena.pin',
} as const

export function readFlag(key: string): boolean {
  return readString(key) === '1'
}

export function writeFlag(key: string, value: boolean): void {
  writeString(key, value ? '1' : null)
}

export function readString(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

/** `null` removes the key. */
export function writeString(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, value)
  } catch {
    // Storage unavailable: the value simply isn't remembered.
  }
}
