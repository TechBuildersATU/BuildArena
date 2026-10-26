import { describe, expect, it } from 'vitest'
import { pickCrisis, wheelHops } from '@/game/crisisWheel'

const IDS = ['yemekhane', 'kutuphane', 'kafe', 'hastane', 'magaza', 'obs', 'servis', 'yurt']

describe('crisis wheel (scenario doc §3.2)', () => {
  it('never lands on the scenario last played on this device', () => {
    for (let i = 0; i < 500; i++) {
      const { target } = pickCrisis(IDS, 'kafe')
      expect(IDS[target]).not.toBe('kafe')
    }
  })

  it('every other scenario can come up', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 7; i++)
      seen.add(IDS[pickCrisis(IDS, 'kafe', undefined, () => i / 7 + 0.01).target])
    expect([...seen].sort()).toEqual([
      'hastane',
      'kutuphane',
      'magaza',
      'obs',
      'servis',
      'yemekhane',
      'yurt',
    ])
  })

  it('on a fresh device all eight are possible', () => {
    expect(pickCrisis(IDS, null, undefined, () => 0.99).target).toBe(7)
  })

  it('?seed=N forces scenario N % 8 from the first tile', () => {
    expect(pickCrisis(IDS, 'yemekhane', 0)).toEqual({ target: 0, start: 0 })
    expect(pickCrisis(IDS, null, 7)).toEqual({ target: 7, start: 0 })
    expect(pickCrisis(IDS, null, 10)).toEqual({ target: 2, start: 0 })
  })

  it('turns twice round the 8 tiles and stops on the target', () => {
    for (let start = 0; start < 8; start++) {
      for (let target = 0; target < 8; target++) {
        const hops = wheelHops(8, target, start)
        expect(hops).toBeGreaterThanOrEqual(16)
        expect(hops).toBeLessThan(24)
        expect((start + hops) % 8).toBe(target)
      }
    }
  })
})
