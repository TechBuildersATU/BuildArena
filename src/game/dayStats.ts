import type { Scenario, Task } from '@/ai/schemas'
import { cardOf, findTask } from '@/data/duelBank'
import { findScenario, SCENARIOS, shortName } from '@/data/scenarioBank'
import type { DuelRecord, ScoreEntry } from '@/db/database'
import { SCENARIO_BANK } from '@/data/scenarioBank'
import { shortTitle } from './scoring'

// End-of-day summary for the staff menu (full prototype §7.2). No personal data: only counts.

export interface DayStats {
  senaryo: number
  duello: number
  ort: number
  best: number
  /** step where the fewest players found the best option (at least 3 plays) */
  hard: { scenario: Scenario; stepIndex: number; rate: number; plays: number } | null
  popular: { scenario: Scenario; plays: number } | null
  trap: { card: string; icon: string; count: number } | null
  peak: { hour: number; games: number } | null
  titles: { ad: string; n: number }[]
}

export function dayStats(scores: readonly ScoreEntry[], duels: readonly DuelRecord[]): DayStats {
  const ort = scores.length
    ? Math.round(scores.reduce((a, e) => a + e.score, 0) / scores.length)
    : 0

  let hard: DayStats['hard'] = null
  for (const sc of SCENARIOS) {
    const plays = scores.filter((e) => e.senaryo === sc.id && Array.isArray(e.secimler))
    if (plays.length < 3) continue
    sc.adimlar.forEach((a, i) => {
      const bestId = a.secenekler.find((o) => o.puan === 20)?.id
      const rate = plays.filter((e) => e.secimler?.[i] === bestId).length / plays.length
      if (!hard || rate < hard.rate)
        hard = { scenario: sc, stepIndex: i, rate, plays: plays.length }
    })
  }

  const byScenario = new Map<string, number>()
  for (const e of scores) byScenario.set(e.senaryo, (byScenario.get(e.senaryo) ?? 0) + 1)
  const popId = [...byScenario.entries()].sort((a, b) => b[1] - a[1])[0]
  const popScenario = popId && findScenario(popId[0])

  const traps = new Map<string, number>()
  for (const d of duels) {
    const task: Task | undefined = findTask(d.gorev)
    if (!task) continue
    for (const p of d.p)
      for (const c of p.box) if (task.tuzak.includes(c)) traps.set(c, (traps.get(c) ?? 0) + 1)
  }
  const trapTop = [...traps.entries()].sort((a, b) => b[1] - a[1])[0]

  const hours = new Map<number, number>()
  for (const e of [...scores, ...duels]) {
    const h = new Date(e.zaman).getHours()
    hours.set(h, (hours.get(h) ?? 0) + 1)
  }
  const peak = [...hours.entries()].sort((a, b) => b[1] - a[1])[0]

  return {
    senaryo: scores.length,
    duello: duels.length,
    ort,
    best: scores.length ? Math.max(...scores.map((e) => e.score)) : 0,
    hard,
    popular: popScenario ? { scenario: popScenario, plays: popId[1] } : null,
    trap: trapTop
      ? { card: cardOf(trapTop[0]).ad, icon: cardOf(trapTop[0]).ikon, count: trapTop[1] }
      : null,
    peak: peak ? { hour: peak[0], games: peak[1] } : null,
    titles: SCENARIO_BANK.unvanlar.map((u) => ({
      ad: shortTitle(u.ad),
      n: scores.filter((e) => e.score >= u.min && e.score <= u.max).length,
    })),
  }
}

export interface DayFact {
  icon: string
  label: string
  value: string
  side: string
}

/** The highlights shown in the staff menu and drawn on the share image. */
export function dayFacts(st: DayStats): DayFact[] {
  const facts: DayFact[] = []
  if (st.hard) {
    const step = st.hard.scenario.adimlar[st.hard.stepIndex]
    facts.push({
      icon: 'flame',
      label: 'En zor karar',
      value: `${shortName(st.hard.scenario)} · ${step.konu.charAt(0).toLocaleUpperCase('tr')}${step.konu.slice(1)}`,
      side: `%${Math.round(st.hard.rate * 100)} doğru`,
    })
  }
  if (st.popular)
    facts.push({
      icon: st.popular.scenario.ikon,
      label: 'En popüler kriz',
      value: st.popular.scenario.baslik,
      side: `${st.popular.plays} oyun`,
    })
  if (st.trap)
    facts.push({
      icon: st.trap.icon,
      label: 'En çok düşülen tuzak',
      value: st.trap.card,
      side: `${st.trap.count} kez`,
    })
  if (st.peak) {
    const h = String(st.peak.hour).padStart(2, '0')
    const h2 = String(st.peak.hour + 1).padStart(2, '0')
    facts.push({
      icon: 'clock',
      label: 'En yoğun saat',
      value: `${h}:00–${h2}:00`,
      side: `${st.peak.games} oyun`,
    })
  }
  if (st.best)
    facts.push({
      icon: 'crown',
      label: 'Günün en yüksek senaryo puanı',
      value: `${st.best}/100`,
      side: '',
    })
  return facts
}
