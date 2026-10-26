import { pbkdf2 } from '@noble/hashes/pbkdf2.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex, randomBytes } from '@noble/hashes/utils.js'
import { readString, STORAGE_KEYS, writeString } from './storage'

// Staff PIN (document §12.8 (7)): stored only as a salted PBKDF2-SHA-256 hash; 5 wrong
// attempts lock the keypad for 5 minutes. Pure-JS hashing also works over plain-HTTP LAN
// testing, where crypto.subtle is unavailable.
//
// The code is public on GitHub, so it only holds the well-known default 1234 for the first
// start. The staff set the real PIN on the tablet (staff menu → Ayarlar → PIN'i değiştir); it is
// kept on that device only, with its own random salt, and never enters the source code.

const DEFAULT_PIN: StoredPin = {
  salt: 'f5e64a4d3c49b870a96be516a0e14ce7',
  hash: '7655561aedd7a0b2a64ed766775cbf4901bf60a6ed3460faa0902d603ac708bd',
}
export const DEFAULT_PIN_TEXT = '1234'
const ITERATIONS = 20_000

export const PIN_LENGTH = 4
export const MAX_FAILURES = 5
export const LOCKOUT_MS = 5 * 60 * 1000

interface StoredPin {
  salt: string
  hash: string
}

function hashPin(pin: string, salt: string): string {
  const enc = new TextEncoder()
  return bytesToHex(pbkdf2(sha256, enc.encode(pin), enc.encode(salt), { c: ITERATIONS, dkLen: 32 }))
}

/** The PIN this device was given, or null while the default is in use. */
function readStoredPin(): StoredPin | null {
  try {
    const parsed = JSON.parse(readString(STORAGE_KEYS.pin) ?? '') as Partial<StoredPin>
    const hex = (v: unknown, len: number) =>
      typeof v === 'string' && /^[0-9a-f]+$/.test(v) && v.length === len
    return hex(parsed.salt, 32) && hex(parsed.hash, 64)
      ? { salt: parsed.salt as string, hash: parsed.hash as string }
      : null
  } catch {
    return null
  }
}

/** True once the staff have set this device's own PIN. */
export function hasCustomPin(): boolean {
  return readStoredPin() !== null
}

export type NewPinCheck = 'ok' | 'format' | 'default'

/** A new PIN must be four digits and not the public default. */
export function checkNewPin(pin: string): NewPinCheck {
  if (pin.length !== PIN_LENGTH || !/^[0-9]+$/.test(pin)) return 'format'
  if (pin === DEFAULT_PIN_TEXT) return 'default'
  return 'ok'
}

/**
 * Saves this device's PIN (salted hash only). False if the PIN isn't allowed or the device
 * couldn't store it, in which case the old PIN still works.
 */
export function changePin(pin: string): boolean {
  if (checkNewPin(pin) !== 'ok') return false
  const salt = bytesToHex(randomBytes(16))
  writeString(STORAGE_KEYS.pin, JSON.stringify({ salt, hash: hashPin(pin, salt) }))
  if (readStoredPin()?.salt !== salt) return false
  writeLock({ failures: 0, lockedUntil: 0 })
  return true
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
  const expected = readStoredPin() ?? DEFAULT_PIN
  if (sameHex(hashPin(pin, expected.salt), expected.hash)) {
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
