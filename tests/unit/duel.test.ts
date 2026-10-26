import { describe, expect, it } from 'vitest'
import { duelJury } from '@/ai/duelJury'
import { CardSchema, TaskSchema } from '@/ai/schemas'
import cardsRaw from '@/data/cards.json'
import tasksRaw from '@/data/tasks.json'
import { CARDS, findTask, taskCards, TASKS } from '@/data/duelBank'
import {
  BOX_SLOTS,
  clearBox,
  insertCard,
  moveCard,
  removeCard,
  slotAt,
  undo,
  type PlayerBoard,
} from '@/game/duelBox'
import { seeded, shuffle } from '@/game/random'
import { scoreDuel } from '@/game/scoring'
import { clampToHalf, HALVES, isPalm, sideOf } from '@/game/touchIsolation'

const board = (box: string[] = []): PlayerBoard => ({
  pool: [],
  box,
  hist: [],
  done: false,
  kalan: null,
})

describe('duel data (document §12.4)', () => {
  it('every card and task passes its schema', () => {
    for (const c of cardsRaw.kartlar) expect(CardSchema.safeParse(c).success).toBe(true)
    for (const t of tasksRaw.gorevler) expect(TaskSchema.safeParse(t).success).toBe(true)
    expect(CARDS.length).toBeGreaterThanOrEqual(80)
    // the club's five tasks first (seeds and tests rely on their order), then ten campus tasks
    expect(TASKS.map((t) => t.id)).toEqual([
      'hbys',
      'magaza',
      'kutuphane',
      'yemekhane',
      'kafe',
      'ring',
      'etkinlik',
      'otopark',
      'sinav',
      'kayip',
      'spor',
      'camasir',
      'derslik',
      'kan',
      'kariyer',
    ])
    expect(new Set(TASKS.map((t) => t.no)).size).toBe(TASKS.length)
  })

  it('each task deals 14 different cards: 8 required + 6 traps, combos from required cards', () => {
    for (const t of TASKS) {
      const cards = taskCards(t)
      expect(cards).toHaveLength(14)
      expect(new Set(cards).size).toBe(14)
      expect(t.kritik.length + t.onemli.length + t.destek.length).toBe(8)
      expect(t.tuzak).toHaveLength(6)
      const required = new Set([...t.kritik, ...t.onemli, ...t.destek])
      for (const b of t.birlesimler) for (const c of b.kartlar) expect(required.has(c)).toBe(true)
      // the best possible design is worth 100 with time left
      expect(scoreDuel(t, [...required], 90, 90).total).toBe(100)
    }
  })
})

describe('the phone box (8 slots, undo)', () => {
  it('inserts at a slot, refuses duplicates and the 9th card', () => {
    let p = board()
    for (let i = 0; i < BOX_SLOTS; i++) p = insertCard(p, `k${i}`, i)!
    expect(p.box).toHaveLength(8)
    expect(insertCard(p, 'k9', 0)).toBeNull()
    expect(insertCard(board(['a']), 'a', 0)).toBeNull()
    expect(insertCard(board(['a', 'b']), 'c', 1)!.box).toEqual(['a', 'c', 'b'])
  })

  it('moves, removes, clears and undoes step by step', () => {
    let p = board()
    p = insertCard(p, 'a', 0)!
    p = insertCard(p, 'b', 1)!
    p = insertCard(p, 'c', 2)!
    p = moveCard(p, 0, 2)
    expect(p.box).toEqual(['b', 'c', 'a'])
    p = removeCard(p, 1)
    expect(p.box).toEqual(['b', 'a'])
    p = clearBox(p)
    expect(p.box).toEqual([])
    p = undo(p)
    expect(p.box).toEqual(['b', 'a'])
    p = undo(p)
    expect(p.box).toEqual(['b', 'c', 'a'])
    p = undo(p)
    expect(p.box).toEqual(['a', 'b', 'c'])
  })

  it('a move to the same place and clearing an empty box add no history', () => {
    const p = insertCard(board(), 'a', 0)!
    expect(moveCard(p, 0, 0)).toBe(p)
    expect(clearBox(board())).toEqual(board())
    expect(undo(board())).toEqual(board())
  })

  it('maps a finger position to a slot (46 px slots, 7 px gaps)', () => {
    expect(slotAt(-20)).toBe(0)
    expect(slotAt(0)).toBe(0)
    expect(slotAt(52)).toBe(0)
    expect(slotAt(53)).toBe(1)
    expect(slotAt(10_000)).toBe(7)
  })
})

describe('screen isolation (document §13.5)', () => {
  it('a touch belongs to the half where it starts; the 24 px middle is a dead zone', () => {
    expect(sideOf(0)).toBe(0)
    expect(sideOf(627)).toBe(0)
    expect(sideOf(628)).toBe(-1)
    expect(sideOf(640)).toBe(-1)
    expect(sideOf(651)).toBe(-1)
    expect(sideOf(652)).toBe(1)
    expect(sideOf(1279)).toBe(1)
    expect(HALVES[1].x0 - HALVES[0].x1).toBe(24)
  })

  it('a dragged card never crosses into the other half', () => {
    expect(clampToHalf(0, 1000, 400).x).toBeLessThanOrEqual(628 - 48)
    expect(clampToHalf(1, 100, 400).x).toBeGreaterThanOrEqual(652 + 48)
    expect(clampToHalf(0, 300, 10).y).toBe(150)
    expect(clampToHalf(1, 900, 900).y).toBe(752)
  })

  it('palms and wrists (contact > 60 px) are ignored; pens and mice are not palms', () => {
    expect(isPalm({ pointerType: 'touch', width: 80, height: 30 })).toBe(true)
    expect(isPalm({ pointerType: 'touch', width: 20, height: 22 })).toBe(false)
    expect(isPalm({ pointerType: 'mouse', width: 100, height: 100 })).toBe(false)
  })
})

describe('duel jury (local, no AI)', () => {
  const task = findTask('hbys')!
  const required = [...task.kritik, ...task.onemli, ...task.destek]

  it('an empty box gets its own title and comment', () => {
    const s = scoreDuel(task, [], 90, 90)
    const j = duelJury(task, s, seeded(1))
    expect(['Boş Ekran Sanatçısı', 'Sessiz Mimar']).toContain(j.lakap)
    expect(j.yorum).toContain('boş bir hastane uygulamasıyla')
  })

  it('a trap collector is named after the trap', () => {
    const s = scoreDuel(task, ['randevu', 'sepet', 'kampanya'], 10, 90)
    expect(duelJury(task, s, seeded(1)).lakap).toBe('Sepet Koleksiyoncusu')
  })

  it('a near-perfect design gets a top title; the same seed gives the same text', () => {
    const s = scoreDuel(task, required, 60, 90)
    const a = duelJury(task, s, seeded(3))
    expect([
      'Gereksinim Gurusu',
      'Analiz Makinesi',
      'Product Owner Adayı',
      'Kusursuz Mimar',
    ]).toContain(a.lakap)
    expect(duelJury(task, s, seeded(3))).toEqual(a)
  })
})

describe('random helpers', () => {
  it('a seed always gives the same sequence; shuffle keeps every item', () => {
    const a = seeded(9)
    const b = seeded(9)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
    const list = Array.from({ length: 14 }, (_, i) => i)
    const mixed = shuffle(list, seeded(4))
    expect([...mixed].sort((x, y) => x - y)).toEqual(list)
    expect(mixed).not.toEqual(list)
  })
})
