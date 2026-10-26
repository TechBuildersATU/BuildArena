import { create } from 'zustand'
import { STORAGE_KEYS, writeString } from '@/app/storage'
import { findScenario } from '@/data/scenarioBank'
import { newId, saveScore, type ScoreEntry } from '@/db/database'
import { scoreScenario, titleFor, totalTime, type ScenarioPick } from '@/game/scoring'

// One scenario-mode game: nickname → scenario → 5 picks → saved leaderboard entry.

interface ScenarioSession {
  nick: string
  izin: boolean
  scenarioId: string | null
  picks: ScenarioPick[]
  /** set once the game is finished and saved */
  entry: ScoreEntry | null
  begin: (nick: string, izin: boolean) => void
  chooseScenario: (id: string) => void
  addPick: (pick: ScenarioPick) => void
  /** Builds and saves the leaderboard entry; calling it again returns the same entry. */
  finish: () => ScoreEntry
  reset: () => void
}

export const useScenarioStore = create<ScenarioSession>((set, get) => ({
  nick: '',
  izin: true,
  scenarioId: null,
  picks: [],
  entry: null,

  begin: (nick, izin) => set({ nick, izin, scenarioId: null, picks: [], entry: null }),

  chooseScenario: (id) => set({ scenarioId: id, picks: [], entry: null }),

  addPick: (pick) => set((s) => ({ picks: [...s.picks, pick] })),

  finish: () => {
    const { entry, nick, izin, scenarioId, picks } = get()
    if (entry) return entry
    const scenario = findScenario(scenarioId)
    if (!scenario) throw new Error('finish() without a scenario')
    const { total } = scoreScenario(scenario, picks)
    const created: ScoreEntry = {
      id: newId('k'),
      nick,
      score: total,
      unvan: titleFor(total),
      senaryo: scenario.id,
      sure: totalTime(picks),
      zaman: Date.now(),
      izin,
      secimler: picks.map((p) =>
        p.optionIndex === null ? null : scenario.adimlar[p.stepIndex].secenekler[p.optionIndex].id,
      ),
    }
    set({ entry: created })
    writeString(STORAGE_KEYS.lastScenario, scenario.id)
    saveScore(created).catch((error: unknown) => console.error(error))
    return created
  },

  reset: () => set({ nick: '', izin: true, scenarioId: null, picks: [], entry: null }),
}))
