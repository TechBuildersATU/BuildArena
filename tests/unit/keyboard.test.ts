import { describe, expect, it } from 'vitest'
import { KEYBOARD_GAP, keyboardLift } from '@/app/keyboard'

describe('on-screen keyboard: the stage keeps its size and only slides up when needed', () => {
  it('no keyboard, no lift', () => {
    expect(keyboardLift(700, 800, 0)).toBe(0)
  })

  it('a field that stays visible above the keyboard does not move the stage', () => {
    // field bottom 340, keyboard top at 800 - 360 = 440
    expect(keyboardLift(340, 800, 360)).toBe(0)
  })

  it('a covered field lifts the stage just above the keyboard, with a small gap', () => {
    // field bottom 340, keyboard top at 800 - 520 = 280 → lift 340 + gap - 280
    expect(keyboardLift(340, 800, 520)).toBe(340 + KEYBOARD_GAP - 280)
  })

  it('rounds up to whole pixels', () => {
    expect(keyboardLift(400.2, 800, 450)).toBe(Math.ceil(400.2 + KEYBOARD_GAP - 350))
  })
})
