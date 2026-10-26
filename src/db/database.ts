import Dexie, { type EntityTable } from 'dexie'
import { useLiveQuery } from 'dexie-react-hooks'
import type { RankedEntry } from '@/game/scoring'

// Scores and duels in IndexedDB (document §8): they survive reloads and restarts. Only
// nicknames, scores, titles, scenario/task ids, times, choices and the consent flag are stored.

export interface ScoreEntry extends RankedEntry {
  nick: string
  unvan: string
  /** scenario id */
  senaryo: string
  /** consent to share on the club's social media */
  izin: boolean
  /** chosen option id per step (null = time ran out); feeds the day's "hardest decision" */
  secimler?: (string | null)[]
}

export interface DuelPlayerRecord {
  nick: string
  total: number
  uyum: number
  isabet: number
  birlesim: number
  hiz: number
  ceza: number
  kalan: number
  box: string[]
  tuzak: number
  lakap: string
}

export interface DuelRecord {
  id: string
  zaman: number
  /** task id */
  gorev: string
  /** 0 / 1, or -1 for a draw */
  kazanan: 0 | 1 | -1
  p: [DuelPlayerRecord, DuelPlayerRecord]
}

type Archived<T> = T & { arsivGunu: string }

class BuildArenaDb extends Dexie {
  scores!: EntityTable<ScoreEntry, 'id'>
  archive!: EntityTable<Archived<ScoreEntry>, 'id'>
  duels!: EntityTable<DuelRecord, 'id'>
  duelArchive!: EntityTable<Archived<DuelRecord>, 'id'>

  constructor() {
    super('buildarena')
    this.version(1).stores({ scores: 'id, zaman', archive: 'id, arsivGunu' })
    this.version(2).stores({ duels: 'id, zaman', duelArchive: 'id, arsivGunu' })
  }
}

export const db = new BuildArenaDb()

export function newId(prefix = 'k'): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

export function listScores(): Promise<ScoreEntry[]> {
  return db.scores.toArray()
}

/** Idempotent: saving the same record twice keeps one. */
export async function saveScore(entry: ScoreEntry): Promise<void> {
  await db.scores.put(entry)
}

export async function saveDuel(record: DuelRecord): Promise<void> {
  await db.duels.put(record)
}

/** Staff "archive the day and reset": scores and duels move to a dated archive; nothing is deleted. */
export async function archiveAndReset(now = Date.now()): Promise<number> {
  const day = new Date(now).toISOString().slice(0, 10)
  return db.transaction('rw', [db.scores, db.archive, db.duels, db.duelArchive], async () => {
    const scores = await db.scores.toArray()
    const duels = await db.duels.toArray()
    await db.archive.bulkPut(scores.map((e) => ({ ...e, arsivGunu: day })))
    await db.duelArchive.bulkPut(duels.map((d) => ({ ...d, arsivGunu: day })))
    await db.scores.clear()
    await db.duels.clear()
    return scores.length + duels.length
  })
}

/** Live list of today's scenario scores; undefined while loading. */
export function useScores(): ScoreEntry[] | undefined {
  return useLiveQuery(() => db.scores.toArray(), [])
}

/** Live list of today's duels; undefined while loading. */
export function useDuels(): DuelRecord[] | undefined {
  return useLiveQuery(() => db.duels.toArray(), [])
}
