import { describe, expect, it } from 'vitest'
import { LOCKOUT_MS, lockoutRemaining, MAX_FAILURES, verifyPin } from '@/app/staffPin'
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
