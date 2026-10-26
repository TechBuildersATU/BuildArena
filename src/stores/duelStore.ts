import { create } from 'zustand'
import { duelJury } from '@/ai/duelJury'
import { readString, writeString } from '@/app/storage'
import { getTestFlags } from '@/app/testFlags'
import { findTask, taskCards, TASKS } from '@/data/duelBank'
import nicknames from '@/data/nicknames.json'
import { newId, saveDuel, type DuelRecord } from '@/db/database'
import type { PlayerBoard } from '@/game/duelBox'
import { GENERATED_NICKNAMES } from '@/game/nickname'
import { gameRandom, pickOne, shuffle } from '@/game/random'
import { duelWinner, scoreDuel, type DuelScore } from '@/game/scoring'
import { lowerTr } from '@/utils/text'

// One duel: task card → both "Ready" → 3-2-1 → play → result (document §6, full prototype §4).

const RECENT_KEY = 'buildarena.duello.sonAdlar'
const RECENT_MAX = 50
/** how many names shown on one task card the dice avoids repeating */
const SHOWN_MAX = 40

export interface PlayerResult extends DuelScore {
  box: string[]
  lakap: string
  yorum: string
}

export interface DuelResult {
  r: [PlayerResult, PlayerResult]
  win: 0 | 1 | -1
  record: DuelRecord
}

export type DuelPhase = 'card' | 'count' | 'play' | 'end'

interface DuelState {
  taskId: string | null
  names: [string, string]
  /** names already shown on this task card, so the dice keeps bringing new ones */
  shown: string[]
  ready: [boolean, boolean]
  phase: DuelPhase
  players: [PlayerBoard, PlayerBoard]
  duration: number
  result: DuelResult | null
  /** new task and two new names (there is no rematch: the next pair plays) */
  newDuel: () => void
  /** a new name for player p, as often as they like until they are ready; returns it */
  reroll: (p: 0 | 1) => string | null
  toggleReady: (p: 0 | 1) => void
  start: (duration: number) => void
  setBoard: (p: 0 | 1, board: PlayerBoard) => void
  finishSide: (p: 0 | 1, kalan: number) => void
  /** Scores both players and saves the duel; idempotent. */
  end: () => DuelResult
}

const emptyBoard = (): PlayerBoard => ({ pool: [], box: [], hist: [], done: false, kalan: null })

/** Funny duel names: the curated lists first, plus the generated "Tech Animal" pool. */
const NAME_POOL = [
  ...new Set([...nicknames.duello, ...nicknames.senaryoZar, ...GENERATED_NICKNAMES]),
]

function recentNames(): string[] {
  try {
    const list = JSON.parse(readString(RECENT_KEY) ?? '[]') as unknown
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

/** Two different names that weren't used in the last 50 duels. */
export function pickDuelNames(
  avoid: readonly string[] = [],
  random = gameRandom(),
): [string, string] {
  const blocked = new Set([...recentNames(), ...avoid].map(lowerTr))
  // half the time from the hand-written funny names, otherwise from the whole pool
  const draw = () => {
    for (let i = 0; i < 50; i++) {
      const source = random() < 0.5 ? nicknames.duello : NAME_POOL
      const name = pickOne(source, random)
      if (!blocked.has(lowerTr(name))) return name
    }
    return pickOne(NAME_POOL, random)
  }
  const a = draw()
  blocked.add(lowerTr(a))
  return [a, draw()]
}

function rememberNames(names: readonly string[]) {
  const rest = recentNames().filter((n) => !names.includes(n))
  writeString(RECENT_KEY, JSON.stringify([...names, ...rest].slice(0, RECENT_MAX)))
}

export const useDuelStore = create<DuelState>((set, get) => ({
  taskId: null,
  names: ['', ''],
  shown: [],
  ready: [false, false],
  phase: 'card',
  players: [emptyBoard(), emptyBoard()],
  duration: 90,
  result: null,

  newDuel: () => {
    const random = gameRandom()
    const seed = getTestFlags().seed
    const prev = get().taskId
    const task =
      seed !== undefined && !prev
        ? TASKS[seed % TASKS.length]
        : pickOne(
            TASKS.filter((t) => t.id !== prev),
            random,
          )
    const names = pickDuelNames([], random)
    set({
      taskId: task.id,
      names,
      shown: [...names],
      ready: [false, false],
      phase: 'card',
      players: [emptyBoard(), emptyBoard()],
      result: null,
    })
  },

  reroll: (p) => {
    const { ready, names, shown } = get()
    if (ready[p]) return null
    const [next] = pickDuelNames([...names, ...shown])
    set((s) => {
      const n: [string, string] = [...s.names]
      n[p] = next
      return { names: n, shown: [...s.shown, next].slice(-SHOWN_MAX) }
    })
    return next
  },

  toggleReady: (p) => {
    if (get().phase !== 'card') return
    set((s) => {
      const ready: [boolean, boolean] = [...s.ready]
      ready[p] = !ready[p]
      return { ready, phase: ready[0] && ready[1] ? 'count' : 'card' }
    })
    if (get().phase === 'count') rememberNames(get().names)
  },

  start: (duration) => {
    const task = findTask(get().taskId)
    if (!task) return
    const random = gameRandom()
    const cards = taskCards(task)
    set({
      phase: 'play',
      duration,
      result: null,
      players: [
        { ...emptyBoard(), pool: shuffle(cards, random) },
        { ...emptyBoard(), pool: shuffle(cards, random) },
      ],
    })
  },

  setBoard: (p, board) =>
    set((s) => {
      const players: [PlayerBoard, PlayerBoard] = [...s.players]
      players[p] = board
      return { players }
    }),

  finishSide: (p, kalan) => {
    const board = get().players[p]
    if (board.done || get().phase !== 'play') return
    get().setBoard(p, { ...board, done: true, kalan })
  },

  end: () => {
    const existing = get().result
    if (existing) return existing
    const { taskId, players, duration, names } = get()
    const task = findTask(taskId)
    if (!task) throw new Error('end() without a task')
    const r = players.map((pl) => {
      const s = scoreDuel(task, pl.box, pl.kalan ?? 0, duration)
      return { ...s, box: [...pl.box], ...duelJury(task, s) }
    }) as [PlayerResult, PlayerResult]
    const win = duelWinner(r)
    const record: DuelRecord = {
      id: newId('d'),
      zaman: Date.now(),
      gorev: task.id,
      kazanan: win,
      p: r.map((x, i) => ({
        nick: names[i],
        total: x.total,
        uyum: x.uyum,
        isabet: x.isabet,
        birlesim: x.birlesim,
        hiz: x.hiz,
        ceza: x.ceza,
        kalan: x.kalan,
        box: x.box,
        tuzak: x.traps.length,
        lakap: x.lakap,
      })) as DuelRecord['p'],
    }
    const result: DuelResult = { r, win, record }
    set({ phase: 'end', result })
    saveDuel(record).catch((error: unknown) => console.error(error))
    return result
  },
}))
