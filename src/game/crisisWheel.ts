// Crisis wheel (scenario doc §3.2): never lands on the scenario last played on this device,
// so consecutive players get different crises. `forced` (?seed=N) makes it deterministic.

export function pickCrisis(
  ids: readonly string[],
  lastId: string | null,
  forced?: number,
  random: () => number = Math.random,
): { target: number; start: number } {
  if (forced !== undefined) return { target: forced % ids.length, start: 0 }
  const pool = ids.map((_, i) => i).filter((i) => ids[i] !== lastId)
  return {
    target: pool[Math.floor(random() * pool.length)],
    start: Math.floor(random() * ids.length),
  }
}

/** Highlight hops: two full turns, ending on `target`. */
export function wheelHops(count: number, target: number, start: number): number {
  return 2 * count + ((target - start + count) % count)
}
