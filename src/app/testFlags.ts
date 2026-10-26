// Test-only URL flags (document §16.5): ?skipTutorial=1, ?seed=N, ?fastTimers=1, plus
// ?demo=1 (loads a seeded sample day — 36 scenario games, 16 duels — into an empty database),
// ?intro=1 (plays the APK's opening animation in the browser).
// They are compiled out of the production build unless VITE_TEST_FLAGS=1.

export interface TestFlags {
  skipTutorial: boolean
  seed: number | undefined
  fastTimers: boolean
  demo: boolean
  intro: boolean
}

const NO_FLAGS: TestFlags = {
  skipTutorial: false,
  seed: undefined,
  fastTimers: false,
  demo: false,
  intro: false,
}

export const TEST_FLAGS_ENABLED =
  import.meta.env.DEV || import.meta.env.MODE === 'test' || import.meta.env.VITE_TEST_FLAGS === '1'

export function parseTestFlags(search: string): TestFlags {
  const params = new URLSearchParams(search)
  const seed = Number.parseInt(params.get('seed') ?? '', 10)
  return {
    skipTutorial: params.get('skipTutorial') === '1',
    seed: Number.isFinite(seed) ? seed : undefined,
    fastTimers: params.get('fastTimers') === '1',
    demo: params.get('demo') === '1',
    intro: params.get('intro') === '1',
  }
}

let cached: TestFlags | undefined

/** Flags from the URL the app was opened with; read once at startup. */
export function getTestFlags(): TestFlags {
  if (!TEST_FLAGS_ENABLED) return NO_FLAGS
  cached ??= parseTestFlags(window.location.search)
  return cached
}
