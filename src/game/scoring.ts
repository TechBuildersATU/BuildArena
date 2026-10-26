import type { ScenarioStep, Scenario, TitleBand } from '@/ai/schemas'
import { SCENARIO_BANK } from '@/data/scenarioBank'

// Score engine — pure functions, no AI (the club decided against an API). Every rule below is
// deterministic: the same decisions always give the same score, so results can't be disputed.

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

// ================================================================ scenario mode (5 steps)
//
// 1. Difficulty weights. A step is harder when its runner-up option is tempting (close to the
//    best one) and when it is the system-wide "general" decision. Harder steps are worth more;
//    the 100 points are shared out between the five steps by weight.
// 2. Accuracy. An option's quality q = puan / 20 is rewarded on a convex curve q^1.5, so the
//    best answer clearly beats a "reasonable" one (14/20 → 59 % of the step, 8/20 → 25 %).
//    A step whose time ran out scores 0.
// 3. Speed. 10 % of each step is a speed share: full in the first 2 s (reading time), falling
//    linearly to 0 at the time limit — and multiplied by accuracy, so a fast wrong answer earns
//    nothing extra.

export const SCENARIO_RULES = {
  accuracyCurve: 1.5,
  speedShare: 0.1,
  readingGraceSec: 2,
  /** weight = 1 + distractor × runnerUp/20 + (general step ? general : 0) */
  distractor: 0.6,
  general: 0.3,
} as const

export interface ScenarioPick {
  stepIndex: number
  /** null when the step's time ran out */
  optionIndex: number | null
  /** the chosen option's quality, 0–20 (0 on timeout) */
  puan: number
  /** seconds used for this decision */
  sure: number
  /** the step's time limit in seconds */
  limit: number
}

export function stepWeight(step: ScenarioStep): number {
  const runnerUp = step.secenekler.map((o) => o.puan).sort((a, b) => b - a)[1] ?? 0
  return (
    1 +
    SCENARIO_RULES.distractor * (runnerUp / 20) +
    (step.seviye === 'genel' ? SCENARIO_RULES.general : 0)
  )
}

export type Difficulty = 'kolay' | 'orta' | 'zor'

export function difficultyOf(step: ScenarioStep): Difficulty {
  const w = stepWeight(step)
  return w >= 1.4 ? 'zor' : w >= 1.25 ? 'orta' : 'kolay'
}

/** Splits `total` by weight into integers that add up exactly (largest remainder method). */
export function apportion(weights: readonly number[], total = 100): number[] {
  const sum = weights.reduce((a, b) => a + b, 0)
  const raw = weights.map((w) => (total * w) / sum)
  const out = raw.map(Math.floor)
  const order = raw.map((r, i) => [r - Math.floor(r), i] as const).sort((a, b) => b[0] - a[0])
  const left = total - out.reduce((a, b) => a + b, 0)
  for (let k = 0; k < left; k++) out[order[k][1]] += 1
  return out
}

/** Maximum points of each step; they add up to 100. */
export function stepMaxPoints(scenario: Scenario): number[] {
  return apportion(scenario.adimlar.map(stepWeight))
}

export function accuracyCredit(puan: number): number {
  return Math.pow(clamp01(puan / 20), SCENARIO_RULES.accuracyCurve)
}

export function speedCredit(sure: number, limit: number): number {
  const grace = SCENARIO_RULES.readingGraceSec
  if (limit <= grace) return 1
  return clamp01(1 - Math.max(0, sure - grace) / (limit - grace))
}

export interface StepScore {
  max: number
  points: number
  accuracy: number
  speed: number
  difficulty: Difficulty
}

export interface ScenarioScore {
  total: number
  steps: StepScore[]
  /** how many decisions were the best option */
  bestCount: number
}

export function scoreScenario(scenario: Scenario, picks: readonly ScenarioPick[]): ScenarioScore {
  const maxes = stepMaxPoints(scenario)
  const steps = picks.map<StepScore>((p) => {
    const max = maxes[p.stepIndex]
    const accuracy = p.optionIndex === null ? 0 : accuracyCredit(p.puan)
    const speed = p.optionIndex === null ? 0 : speedCredit(p.sure, p.limit)
    const share = SCENARIO_RULES.speedShare
    return {
      max,
      points: Math.round(max * accuracy * (1 - share + share * speed)),
      accuracy,
      speed,
      difficulty: difficultyOf(scenario.adimlar[p.stepIndex]),
    }
  })
  return {
    total: steps.reduce((sum, s) => sum + s.points, 0),
    steps,
    bestCount: picks.filter((p) => p.puan === 20).length,
  }
}

export function totalTime(picks: readonly { sure: number }[]): number {
  return Math.round(picks.reduce((sum, p) => sum + p.sure, 0))
}

export function titleFor(
  score: number,
  bands: readonly TitleBand[] = SCENARIO_BANK.unvanlar,
): string {
  const band = bands.find((b) => score >= b.min && score <= b.max)
  return band ? band.ad : bands[bands.length - 1].ad
}

/** "Stajyer (ama umut var!)" → "Stajyer" for tight spaces (podium, table). */
export function shortTitle(title: string): string {
  return title.replace(' (ama umut var!)', '')
}

export type StepStatus = 'iyi' | 'orta' | 'zayif'

/** Final-screen status of a decision's quality (scenario doc §6.3): 16–20 good, 8–15 average, 0–7 weak. */
export function stepStatus(puan: number): StepStatus {
  if (puan >= 16) return 'iyi'
  if (puan >= 8) return 'orta'
  return 'zayif'
}

// ================================================================ leaderboard

export interface RankedEntry {
  id: string
  score: number
  /** total decision time in seconds */
  sure: number
  /** when the game was played (ms timestamp) */
  zaman: number
}

/** Score high→low, then shorter total time, then earlier game (document §8.1). */
export function rankEntries<T extends RankedEntry>(list: readonly T[]): T[] {
  return [...list].sort((a, b) => b.score - a.score || a.sure - b.sure || a.zaman - b.zaman)
}

/** 1-based rank of `id`, or 0 when it isn't in the list. */
export function rankOf(list: readonly RankedEntry[], id: string): number {
  return rankEntries(list).findIndex((e) => e.id === id) + 1
}

/**
 * Day's top 3 for social media (scenario doc §8.1): the three best players who gave consent,
 * plus the players ranked above the third of them who were skipped for lack of consent.
 */
export function shareTop<T extends RankedEntry & { izin: boolean }>(
  list: readonly T[],
): { top: T[]; skipped: T[] } {
  const ranked = rankEntries(list)
  const top = ranked.filter((e) => e.izin).slice(0, 3)
  if (top.length === 0) return { top, skipped: [] }
  const lastIndex = ranked.indexOf(top[top.length - 1])
  return { top, skipped: ranked.slice(0, lastIndex + 1).filter((e) => !e.izin) }
}

// ================================================================ duel mode (8 slots, 14 cards)
//
// Partial-credit grading as in "select all that apply" exams, so nothing is earned for an empty
// box and every trap hurts:
//   Doğru seçim  55  weighted coverage of the required cards (critical 3, important 2, support 1; 18)
//   İsabet       20  F1 of precision (share of the box that is required) and recall (of the 8)
//   Birleşimler  15  share of the task's combos completed
//   Hız bonusu   10  remaining time × design quality, so rushing a poor design earns little
//   Tuzak cezası −5  per trap card in the box; the total never goes below 0

export const DUEL_RULES = {
  coverage: 55,
  precision: 20,
  combos: 15,
  speed: 10,
  trapPenalty: 5,
  weights: { kritik: 3, onemli: 2, destek: 1 },
} as const

export interface DuelTaskLike {
  kritik: readonly string[]
  onemli: readonly string[]
  destek: readonly string[]
  tuzak: readonly string[]
  birlesimler: readonly { ad: string; kartlar: readonly string[] }[]
}

export interface DuelScore {
  /** weighted coverage, 0–55 */
  uyum: number
  /** precision/recall F1, 0–20 */
  isabet: number
  /** combos, 0–15 */
  birlesim: number
  /** speed bonus, 0–10 */
  hiz: number
  /** trap penalty, ≤ 0 */
  ceza: number
  total: number
  traps: string[]
  done: { ad: string; kartlar: readonly string[] }[]
  missing: string[]
  agirlik: number
  kalan: number
  n: number
}

export function scoreDuel(
  task: DuelTaskLike,
  box: readonly string[],
  kalan: number,
  dur: number,
): DuelScore {
  const W = DUEL_RULES.weights
  const weight = new Map<string, number>([
    ...task.kritik.map((c) => [c, W.kritik] as const),
    ...task.onemli.map((c) => [c, W.onemli] as const),
    ...task.destek.map((c) => [c, W.destek] as const),
  ])
  const required = weight.size
  const maxWeight = [...weight.values()].reduce((a, b) => a + b, 0)
  const set = new Set(box)
  const correct = box.filter((c) => weight.has(c))
  const traps = box.filter((c) => task.tuzak.includes(c))
  const agirlik = correct.reduce((a, c) => a + (weight.get(c) ?? 0), 0)

  const uyum = Math.round((DUEL_RULES.coverage * agirlik) / maxWeight)
  const precision = box.length ? correct.length / box.length : 0
  const recall = correct.length / required
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0
  const isabet = Math.round(DUEL_RULES.precision * f1)
  const done = task.birlesimler.filter((b) => b.kartlar.every((c) => set.has(c)))
  const birlesim = Math.round((DUEL_RULES.combos * done.length) / task.birlesimler.length)
  const quality = (uyum + isabet) / (DUEL_RULES.coverage + DUEL_RULES.precision)
  const hiz = Math.round(DUEL_RULES.speed * clamp01(kalan / dur) * quality)
  const ceza = 0 - DUEL_RULES.trapPenalty * traps.length // 0, not -0, for an empty box
  const missing = [...task.kritik, ...task.onemli].filter((c) => !set.has(c))

  return {
    uyum,
    isabet,
    birlesim,
    hiz,
    ceza,
    total: Math.max(0, uyum + isabet + birlesim + hiz + ceza),
    traps,
    done,
    missing,
    agirlik,
    kalan,
    n: box.length,
  }
}

/**
 * 0 or 1 for the winner, -1 for a draw: score, then fewer traps, then more time left. Time only
 * breaks a tie between designs that earned points: finishing an empty phone sooner wins nothing.
 */
export function duelWinner(r: readonly [DuelScore, DuelScore]): 0 | 1 | -1 {
  const [a, b] = r
  if (a.total !== b.total) return a.total > b.total ? 0 : 1
  if (a.traps.length !== b.traps.length) return a.traps.length < b.traps.length ? 0 : 1
  if (a.total > 0 && a.kalan !== b.kalan) return a.kalan > b.kalan ? 0 : 1
  return -1
}
