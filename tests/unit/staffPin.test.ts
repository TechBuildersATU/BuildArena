import { describe, expect, it, vi } from 'vitest'
import {
  changePin,
  checkNewPin,
  hasCustomPin,
  LOCKOUT_MS,
  lockoutRemaining,
  MAX_FAILURES,
  verifyPin,
} from '@/app/staffPin'
import { STORAGE_KEYS } from '@/app/storage'

describe('staff PIN (document §12.8 (7))', () => {
  it('accepts the default PIN and rejects others', () => {
    expect(verifyPin('1234')).toBe('ok')
    expect(verifyPin('0000')).toBe('wrong')
    expect(verifyPin('4321')).toBe('wrong')
  })

  it('never stores the PIN itself', () => {
    verifyPin('9999')
    const stored = JSON.stringify(window.localStorage)
    expect(stored).not.toContain('1234')
    expect(stored).not.toContain('9999')
  })

  it(`locks for 5 minutes after ${MAX_FAILURES} wrong attempts, even for the right PIN`, () => {
    const t0 = 1_000_000
    for (let i = 1; i < MAX_FAILURES; i++) expect(verifyPin('0000', t0)).toBe('wrong')
    expect(verifyPin('0000', t0)).toBe('locked')
    expect(lockoutRemaining(t0)).toBe(LOCKOUT_MS)
    expect(verifyPin('1234', t0 + LOCKOUT_MS - 1)).toBe('locked')
    expect(verifyPin('1234', t0 + LOCKOUT_MS)).toBe('ok')
    expect(lockoutRemaining(t0 + LOCKOUT_MS)).toBe(0)
  })

  it('a correct PIN resets the failure count', () => {
    verifyPin('0000')
    verifyPin('0000')
    expect(verifyPin('1234')).toBe('ok')
    for (let i = 1; i < MAX_FAILURES; i++) expect(verifyPin('0000')).toBe('wrong')
  })

  it('survives corrupt lock data', () => {
    window.localStorage.setItem(STORAGE_KEYS.pinLock, '{not json')
    expect(verifyPin('1234')).toBe('ok')
  })
})

describe("this tablet's own PIN (never in the public code)", () => {
  it('replaces the default: the new PIN opens, 1234 no longer does', () => {
    expect(hasCustomPin()).toBe(false)
    expect(changePin('2580')).toBe(true)
    expect(hasCustomPin()).toBe(true)
    expect(verifyPin('2580')).toBe('ok')
    expect(verifyPin('1234')).toBe('wrong')
  })

  it('stores only a salted hash with a random salt per device', () => {
    changePin('2580')
    const first = window.localStorage.getItem(STORAGE_KEYS.pin)!
    expect(first).not.toContain('2580')
    const { salt, hash } = JSON.parse(first) as { salt: string; hash: string }
    expect(salt).toMatch(/^[0-9a-f]{32}$/)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
    // the same PIN on another tablet gets another salt, so another hash
    changePin('2580')
    expect(window.localStorage.getItem(STORAGE_KEYS.pin)).not.toBe(first)
  })

  it('refuses the public default and anything but four digits', () => {
    expect(checkNewPin('1234')).toBe('default')
    expect(checkNewPin('123')).toBe('format')
    expect(checkNewPin('12345')).toBe('format')
    expect(checkNewPin('12a4')).toBe('format')
    expect(checkNewPin('0000')).toBe('ok')
    expect(changePin('1234')).toBe(false)
    expect(hasCustomPin()).toBe(false)
  })

  it('a new PIN clears an earlier failure count', () => {
    for (let i = 1; i < MAX_FAILURES; i++) verifyPin('0000')
    changePin('2580')
    expect(verifyPin('1111')).toBe('wrong') // one failure, not the fifth
    expect(lockoutRemaining()).toBe(0)
  })

  it('corrupt or half-written PIN data falls back to the default', () => {
    for (const bad of [
      '{not json',
      '{"salt":"zz","hash":"1"}',
      '{"salt":"' + 'a'.repeat(32) + '"}',
    ]) {
      window.localStorage.setItem(STORAGE_KEYS.pin, bad)
      expect(hasCustomPin()).toBe(false)
      expect(verifyPin('1234')).toBe('ok')
    }
  })

  it("reports failure and keeps the old PIN when the device can't store it", () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    expect(changePin('2580')).toBe(false)
    setItem.mockRestore()
    expect(verifyPin('1234')).toBe('ok')
  })
})
