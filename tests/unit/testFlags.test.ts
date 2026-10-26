import { describe, expect, it } from 'vitest'
import { parseTestFlags } from '@/app/testFlags'

describe('parseTestFlags', () => {
  it('returns defaults for an empty query', () => {
    expect(parseTestFlags('')).toEqual({
      skipTutorial: false,
      seed: undefined,
      fastTimers: false,
      demo: false,
      intro: false,
    })
  })

  it('reads every flag', () => {
    expect(parseTestFlags('?skipTutorial=1&seed=7&fastTimers=1&demo=1&intro=1')).toEqual({
      skipTutorial: true,
      seed: 7,
      fastTimers: true,
      demo: true,
      intro: true,
    })
  })

  it('ignores malformed values', () => {
    expect(parseTestFlags('?skipTutorial=yes&seed=abc&fastTimers=true&demo=yes&intro=on')).toEqual({
      skipTutorial: false,
      seed: undefined,
      fastTimers: false,
      demo: false,
      intro: false,
    })
  })
})
