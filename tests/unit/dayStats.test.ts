import { describe, expect, it } from 'vitest'
import { findScenario } from '@/data/scenarioBank'
import type { DuelRecord, ScoreEntry } from '@/db/database'
import { dayFacts, dayStats } from '@/game/dayStats'

const sc = findScenario('cafe')!
const bestIds = sc.steps.map((a) => a.options.find((o) => o.points === 20)!.id)

function play(id: string, score: number, hour: number, missStep?: number): ScoreEntry {
  return {
    id,
    nick: id,
    score,
    title: 'Mid Analist',
    scenarioId: 'cafe',
    seconds: 60,
    playedAt: new Date(2026, 10, 4, hour, 15).getTime(),
    consent: true,
    choices: bestIds.map((b, i) => (i === missStep ? null : b)),
  }
}

const duel = (box: string[], hour: number): DuelRecord => {
  const p = (b: string[]) => ({
    nick: 'x',
    total: 50,
    coverage: 0,
    accuracy: 0,
    combo: 0,
    speed: 0,
    penalty: 0,
    secondsLeft: 0,
    box: b,
    trapCount: 0,
    epithet: '',
  })
  return {
    id: `d${hour}${box.join()}`,
    playedAt: new Date(2026, 10, 4, hour).getTime(),
    taskId: 'hospital',
    winner: 0,
    p: [p(box), p([])],
  }
}

describe('end-of-day summary', () => {
  it('an empty day has zero counts and no highlights', () => {
    const st = dayStats([], [])
    expect(st).toMatchObject({
      scenarioGames: 0,
      duelGames: 0,
      average: 0,
      best: 0,
      hard: null,
      trap: null,
    })
    expect(dayFacts(st)).toEqual([])
  })

  it('finds the hardest step, the favourite crisis, the most-hit trap and the busiest hour', () => {
    const scores = [
      play('a', 90, 10, 3),
      play('b', 70, 10, 3),
      play('c', 60, 11, 3),
      play('d', 80, 11),
    ]
    const duels = [duel(['cart', 'appointment'], 10), duel(['cart'], 10), duel(['badges'], 14)]
    const st = dayStats(scores, duels)
    expect(st.scenarioGames).toBe(4)
    expect(st.duelGames).toBe(3)
    expect(st.average).toBe(75)
    expect(st.best).toBe(90)
    expect(st.hard).toMatchObject({ stepIndex: 3, rate: 0.25, plays: 4 })
    expect(st.popular).toMatchObject({ plays: 4 })
    expect(st.trap).toMatchObject({ card: 'Sepet', count: 2 })
    expect(st.peak).toEqual({ hour: 10, games: 4 })
    expect(st.titles.reduce((a, t) => a + t.n, 0)).toBe(4)

    const facts = dayFacts(st)
    expect(facts.map((f) => f.label)).toEqual([
      'En zor karar',
      'En popüler kriz',
      'En çok düşülen tuzak',
      'En yoğun saat',
      'Günün en yüksek senaryo puanı',
    ])
    expect(facts[0].side).toBe('%25 doğru')
    expect(facts[3].value).toBe('10:00–11:00')
  })

  it('the hardest step needs at least 3 games of that crisis', () => {
    expect(dayStats([play('a', 90, 10, 1), play('b', 70, 10, 1)], []).hard).toBeNull()
  })
})
