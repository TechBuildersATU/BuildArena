import { describe, expect, it } from 'vitest'
import { findTask } from '@/data/duelBank'
import { findScenario, SCENARIOS } from '@/data/scenarioBank'
import {
  accuracyCredit,
  apportion,
  difficultyOf,
  DUEL_RULES,
  duelWinner,
  rankEntries,
  rankOf,
  scoreDuel,
  scoreScenario,
  shareTop,
  shortTitle,
  speedCredit,
  stepMaxPoints,
  stepStatus,
  titleFor,
  totalTime,
  type ScenarioPick,
} from '@/game/scoring'

/** Picks by option index for each step of a scenario. */
function picksFor(
  scenarioId: string,
  choices: (number | null)[],
  seconds: number[] = [9, 14, 12, 16, 11],
  limit = 20,
) {
  const sc = findScenario(scenarioId)!
  return choices.map<ScenarioPick>((k, i) => ({
    stepIndex: i,
    optionIndex: k,
    puan: k === null ? 0 : sc.adimlar[i].secenekler[k].puan,
    sure: k === null ? limit : seconds[i],
    limit,
  }))
}
const bestOf = (id: string) =>
  findScenario(id)!.adimlar.map((a) => a.secenekler.findIndex((o) => o.puan === 20))
const worstOf = (id: string) =>
  findScenario(id)!.adimlar.map((a) => {
    const min = Math.min(...a.secenekler.map((o) => o.puan))
    return a.secenekler.findIndex((o) => o.puan === min)
  })
const total = (id: string, picks: ScenarioPick[]) => scoreScenario(findScenario(id)!, picks).total
const every = (sec: number) => Array<number>(5).fill(sec)

describe('scenario score — difficulty, accuracy, speed', () => {
  it('apportions exactly the requested total (largest remainder)', () => {
    expect(apportion([1, 1, 1])).toEqual([34, 33, 33])
    expect(apportion([1.42, 1.18, 1.3, 1.36, 1.54])).toEqual([21, 17, 19, 20, 23])
    for (const sc of SCENARIOS) expect(stepMaxPoints(sc).reduce((a, b) => a + b, 0)).toBe(100)
  })

  it('harder steps (tempting runner-up, general decision) are worth more', () => {
    const sc = findScenario('yemekhane')!
    // 20/14/4/6 general · 6/20/3/0 · 10/2/20/5 · 8/12/4/20 · 20/8/4/0 general
    expect(stepMaxPoints(sc)).toEqual([21, 17, 19, 20, 23])
    expect(sc.adimlar.map(difficultyOf)).toEqual(['zor', 'kolay', 'orta', 'orta', 'zor'])
    for (const s of SCENARIOS) {
      const max = stepMaxPoints(s)
      const hard = s.adimlar.findIndex((a) => difficultyOf(a) === 'zor')
      expect(hard).toBeGreaterThanOrEqual(0)
      expect(max[hard]).toBeGreaterThan(Math.min(...max))
    }
  })

  it('accuracy is convex: the best answer clearly beats a reasonable one', () => {
    expect(accuracyCredit(20)).toBe(1)
    expect(accuracyCredit(0)).toBe(0)
    expect(accuracyCredit(14)).toBeCloseTo(0.586, 3)
    expect(accuracyCredit(8)).toBeCloseTo(0.253, 3)
    expect(accuracyCredit(10)).toBeLessThan(0.5)
  })

  it('speed: full during the 2 s reading time, then linear to 0 at the limit', () => {
    expect(speedCredit(0.5, 20)).toBe(1)
    expect(speedCredit(2, 20)).toBe(1)
    expect(speedCredit(11, 20)).toBeCloseTo(0.5, 5)
    expect(speedCredit(20, 20)).toBe(0)
    expect(speedCredit(30, 20)).toBe(0)
    expect(speedCredit(7.5, 15)).toBeCloseTo(1 - 5.5 / 13, 5)
  })

  it('an empty game (every step timed out) scores 0, not 20', () => {
    const picks = picksFor('yemekhane', [null, null, null, null, null])
    expect(total('yemekhane', picks)).toBe(0)
    expect(titleFor(0)).toBe('Stajyer (ama umut var!)')
  })

  it('the worst option on every step scores almost nothing even when fast', () => {
    for (const sc of SCENARIOS) {
      expect(total(sc.id, picksFor(sc.id, worstOf(sc.id), every(1)))).toBeLessThanOrEqual(6)
    }
  })

  it('all best decisions: 100 when fast, 90 at the last second (speed counts, but little)', () => {
    for (const sc of SCENARIOS) {
      expect(total(sc.id, picksFor(sc.id, bestOf(sc.id), every(1.5)))).toBe(100)
      expect(total(sc.id, picksFor(sc.id, bestOf(sc.id), every(19.99)))).toBe(90)
    }
  })

  it('a fast wrong answer earns no extra speed points', () => {
    const sc = findScenario('yemekhane')!
    const wrong = (sure: number) =>
      scoreScenario(sc, [{ stepIndex: 1, optionIndex: 3, puan: 0, sure, limit: 20 }]).total
    expect(wrong(1)).toBe(0)
    expect(wrong(19)).toBe(0)
  })

  it('reproduces the worked example: 4 best + 1 weak decision → 81, Senior Analist', () => {
    // NFC · single transaction · cache + local auth · dish names only · low latency + atomic
    const picks = picksFor('yemekhane', [0, 1, 2, 0, 0])
    expect(picks.map((p) => p.puan)).toEqual([20, 20, 20, 8, 20])
    const score = scoreScenario(findScenario('yemekhane')!, picks)
    expect(score.steps.map((s) => s.points)).toEqual([20, 16, 18, 5, 22])
    expect(score.total).toBe(81)
    expect(score.bestCount).toBe(4)
    expect(titleFor(score.total)).toBe('Senior Analist')
    expect(totalTime(picks)).toBe(62)
  })

  it('a step whose time ran out scores 0 and costs its whole share', () => {
    const picks = picksFor('yemekhane', [0, null, 2, 3, 0])
    const score = scoreScenario(findScenario('yemekhane')!, picks)
    expect(score.steps[1]).toMatchObject({ points: 0, accuracy: 0, speed: 0 })
    expect(score.total).toBe(78)
  })

  it('better decisions always score more, whatever the speed', () => {
    for (const sc of SCENARIOS) {
      const slowBest = total(sc.id, picksFor(sc.id, bestOf(sc.id), every(19.9)))
      const fastWorst = total(sc.id, picksFor(sc.id, worstOf(sc.id), every(1)))
      expect(slowBest).toBeGreaterThan(fastWorst + 80)
    }
  })

  it('the time limit from the settings is respected (15 s)', () => {
    expect(total('kafe', picksFor('kafe', bestOf('kafe'), every(15), 15))).toBe(90)
    expect(total('kafe', picksFor('kafe', bestOf('kafe'), every(2), 15))).toBe(100)
  })

  it.each([
    [100, 'Baş Analist'],
    [90, 'Baş Analist'],
    [89, 'Senior Analist'],
    [75, 'Senior Analist'],
    [74, 'Mid Analist'],
    [55, 'Mid Analist'],
    [54, 'Junior Analist'],
    [35, 'Junior Analist'],
    [34, 'Stajyer (ama umut var!)'],
    [0, 'Stajyer (ama umut var!)'],
  ])('%i points → %s', (score, title) => {
    expect(titleFor(score)).toBe(title)
  })

  it('shortTitle drops the encouragement for tight spaces', () => {
    expect(shortTitle('Stajyer (ama umut var!)')).toBe('Stajyer')
    expect(shortTitle('Mid Analist')).toBe('Mid Analist')
  })

  it.each([
    [20, 'iyi'],
    [16, 'iyi'],
    [15, 'orta'],
    [8, 'orta'],
    [7, 'zayif'],
    [0, 'zayif'],
  ] as const)('step quality %i is "%s"', (puan, status) => {
    expect(stepStatus(puan)).toBe(status)
  })
})

describe('duel score — partial credit, traps, speed', () => {
  const task = findTask('hbys')!
  // kritik randevu hastakaydi sifreleme · önemli rbac recete tahlil denetim · destek vital
  const perfect = [
    'randevu',
    'hastakaydi',
    'sifreleme',
    'rbac',
    'recete',
    'tahlil',
    'denetim',
    'vital',
  ]
  const traps = ['sepet', 'kampanya', 'paylas', 'sadakat', 'qrmenu', 'rozet']

  it('the parts add up to 100', () => {
    const { coverage, precision, combos, speed } = DUEL_RULES
    expect(coverage + precision + combos + speed).toBe(100)
  })

  it('an empty box scores 0', () => {
    const r = scoreDuel(task, [], 90, 90)
    expect(r).toMatchObject({ uyum: 0, isabet: 0, birlesim: 0, hiz: 0, ceza: 0, total: 0 })
  })

  it('the perfect design scores 100 with full time left, 90 at the buzzer', () => {
    expect(scoreDuel(task, perfect, 90, 90).total).toBe(100)
    expect(scoreDuel(task, perfect, 0, 90).total).toBe(90)
  })

  it('every trap costs 5 points and the total never goes below 0', () => {
    const clean = scoreDuel(task, perfect.slice(0, 6), 30, 90)
    const trapped = scoreDuel(task, [...perfect.slice(0, 6), 'sepet', 'kampanya'], 30, 90)
    expect(trapped.ceza).toBe(-10)
    expect(trapped.traps).toEqual(['sepet', 'kampanya'])
    expect(trapped.total).toBeLessThan(clean.total - 5)
    expect(scoreDuel(task, traps, 80, 90).total).toBe(0)
  })

  it('critical cards count more than support cards', () => {
    const critical = scoreDuel(task, ['randevu'], 0, 90)
    const support = scoreDuel(task, ['vital'], 0, 90)
    expect(critical.uyum).toBeGreaterThan(support.uyum)
    expect(critical.uyum).toBe(Math.round((55 * 3) / 18))
  })

  it('combos only count when all their cards are in the box', () => {
    expect(scoreDuel(task, ['hastakaydi'], 0, 90).done).toHaveLength(0)
    const r = scoreDuel(task, ['hastakaydi', 'rbac', 'sifreleme'], 0, 90)
    expect(r.done.map((b) => b.ad)).toEqual(['Doğru kişi, doğru veri', 'KVKK uyumu'])
    expect(r.birlesim).toBe(10)
  })

  it('rushing a poor design earns little speed bonus', () => {
    expect(scoreDuel(task, ['vital'], 88, 90).hiz).toBeLessThanOrEqual(1)
    expect(scoreDuel(task, perfect, 88, 90).hiz).toBe(10)
  })

  it('lists the missing critical/important cards for the jury', () => {
    expect(scoreDuel(task, ['randevu', 'rbac'], 0, 90).missing).toEqual([
      'hastakaydi',
      'sifreleme',
      'recete',
      'tahlil',
      'denetim',
    ])
  })

  it('winner: score, then fewer traps, then more time left, else a draw', () => {
    const a = scoreDuel(task, perfect, 40, 90)
    const b = scoreDuel(task, perfect.slice(0, 5), 40, 90)
    expect(duelWinner([a, b])).toBe(0)
    expect(duelWinner([b, a])).toBe(1)
    expect(
      duelWinner([
        { ...a, traps: ['sepet'] },
        { ...a, traps: [] },
      ]),
    ).toBe(1)
    expect(
      duelWinner([
        { ...a, kalan: 10 },
        { ...a, kalan: 20 },
      ]),
    ).toBe(1)
    expect(duelWinner([a, { ...a }])).toBe(-1)
  })

  it('two empty phones draw, whoever pressed Finish first', () => {
    const early = scoreDuel(task, [], 80, 90)
    const late = scoreDuel(task, [], 10, 90)
    expect(duelWinner([early, late])).toBe(-1)
    expect(duelWinner([late, early])).toBe(-1)
  })
})

describe('leaderboard order (§8.1)', () => {
  const e = (id: string, score: number, sure: number, zaman: number, izin = true) => ({
    id,
    score,
    sure,
    zaman,
    izin,
  })

  it('sorts by score, then shorter time, then earlier game', () => {
    const list = [e('a', 80, 70, 3), e('b', 92, 90, 2), e('c', 80, 60, 5), e('d', 80, 60, 1)]
    expect(rankEntries(list).map((x) => x.id)).toEqual(['b', 'd', 'c', 'a'])
    expect(rankOf(list, 'c')).toBe(3)
    expect(rankOf(list, 'missing')).toBe(0)
  })

  it('does not mutate the input', () => {
    const list = [e('a', 1, 1, 1), e('b', 2, 1, 1)]
    rankEntries(list)
    expect(list.map((x) => x.id)).toEqual(['a', 'b'])
  })

  it('top 3 for sharing only includes consenting players and names the skipped ones', () => {
    const list = [
      e('ahtapot', 96, 64, 1),
      e('kaplumbaga', 92, 58, 2, false),
      e('korkut', 88, 62, 3),
      e('rakun', 84, 71, 4),
      e('panda', 74, 80, 5, false),
    ]
    const { top, skipped } = shareTop(list)
    expect(top.map((x) => x.id)).toEqual(['ahtapot', 'korkut', 'rakun'])
    expect(skipped.map((x) => x.id)).toEqual(['kaplumbaga'])
  })

  it('with no consenting players the top 3 is empty', () => {
    expect(shareTop([e('a', 90, 1, 1, false)])).toEqual({ top: [], skipped: [] })
  })
})
