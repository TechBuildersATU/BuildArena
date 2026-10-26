import { getTestFlags } from '@/app/testFlags'

/** Small seeded PRNG (mulberry32). */
export function seeded(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

let shared: (() => number) | null = null

/** Math.random, or a seeded generator with ?seed=N so tests get the same cards and names. */
export function gameRandom(): () => number {
  const seed = getTestFlags().seed
  if (seed === undefined) return Math.random
  shared ??= seeded(seed)
  return shared
}

export function shuffle<T>(list: readonly T[], random: () => number = Math.random): T[] {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function pickOne<T>(list: readonly T[], random: () => number = Math.random): T {
  return list[Math.floor(random() * list.length)]
}
