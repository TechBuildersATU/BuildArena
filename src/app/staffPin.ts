import { pbkdf2 } from '@noble/hashes/pbkdf2.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex } from '@noble/hashes/utils.js'
import { readString, STORAGE_KEYS, writeString } from './storage'

// Staff PIN (document §12.8 (7)): stored only as a salted PBKDF2-SHA-256 hash; 5 wrong
// attempts lock the keypad for 5 minutes. Pure-JS hashing also works over plain-HTTP LAN
// testing, where crypto.subtle is unavailable. Default PIN until WP-15 adds "change PIN": 1234.

const PIN_SALT = 'f5e64a4d3c49b870a96be516a0e14ce7'
const PIN_HASH = '7655561aedd7a0b2a64ed766775cbf4901bf60a6ed3460faa0902d603ac708bd'
const ITERATIONS = 20_000

export const PIN_LENGTH = 4
export const MAX_FAILURES = 5
export const LOCKOUT_MS = 5 * 60 * 1000

function hashPin(pin: string): string {
  const enc = new TextEncoder()
  return bytesToHex(
    pbkdf2(sha256, enc.encode(pin), enc.encode(PIN_SALT), { c: ITERATIONS, dkLen: 32 }),
  )
}

/** Constant-time comparison of two equal-length hex strings. */
function sameHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

interface LockState {
  failures: number
  lockedUntil: number
}

function readLock(): LockState {
  try {
    const parsed = JSON.parse(readString(STORAGE_KEYS.pinLock) ?? '') as Partial<LockState>
    return { failures: Number(parsed.failures) || 0, lockedUntil: Number(parsed.lockedUntil) || 0 }
  } catch {
    return { failures: 0, lockedUntil: 0 }
  }
}

function writeLock(state: LockState): void {
  writeString(STORAGE_KEYS.pinLock, JSON.stringify(state))
}

/** Milliseconds left in the lockout, 0 when the keypad is usable. */
export function lockoutRemaining(now = Date.now()): number {
  return Math.max(0, readLock().lockedUntil - now)
}

export type PinResult = 'ok' | 'wrong' | 'locked'

export function verifyPin(pin: string, now = Date.now()): PinResult {
  const lock = readLock()
  if (lock.lockedUntil > now) return 'locked'
  if (sameHex(hashPin(pin), PIN_HASH)) {
    writeLock({ failures: 0, lockedUntil: 0 })
    return 'ok'
  }
  const failures = lock.failures + 1
  if (failures >= MAX_FAILURES) {
    writeLock({ failures: 0, lockedUntil: now + LOCKOUT_MS })
    return 'locked'
  }
  writeLock({ failures, lockedUntil: 0 })
  return 'wrong'
}
