import { afterEach, describe, expect, it } from 'vitest'
import { STORAGE_KEYS } from '@/app/storage'
import { findScenario } from '@/data/scenarioBank'
import {
  archiveAndReset,
  db,
  listScores,
  saveDuel,
  saveScore,
  type DuelRecord,
  type ScoreEntry,
} from '@/db/database'
import { demoDay, loadDemoDay, seedDemoIfRequested } from '@/db/demoData'
import { useDuelStore } from '@/stores/duelStore'
import { useScenarioStore } from '@/stores/scenarioStore'

const entry = (id: string, score: number): ScoreEntry => ({
  id,
  nick: `Oyuncu ${id}`,
  score,
  unvan: 'Mid Analist',
  senaryo: 'kafe',
  sure: 60,
  zaman: 1,
  izin: true,
})

const duel = (id: string): DuelRecord => {
  const player = (nick: string, total: number) => ({
    nick,
    total,
    uyum: total,
    isabet: 0,
    birlesim: 0,
    hiz: 0,
    ceza: 0,
    kalan: 0,
    box: [],
    tuzak: 0,
    lakap: 'Kod Kartalı',
  })
  return { id, zaman: 2, gorev: 'hbys', kazanan: 0, p: [player('A', 60), player('B', 40)] }
}

afterEach(async () => {
  await db.duels.clear()
  await db.duelArchive.clear()
  useDuelStore.setState({ result: null, taskId: null, phase: 'card' })
})

describe('leaderboard storage (IndexedDB)', () => {
  it('saving the same entry twice keeps one record', async () => {
    await saveScore(entry('a', 70))
    await saveScore(entry('a', 70))
    expect(await listScores()).toHaveLength(1)
    await saveDuel(duel('d1'))
    await saveDuel(duel('d1'))
    expect(await db.duels.count()).toBe(1)
  })

  it('archive and reset moves scores and duels to a dated archive, deleting nothing', async () => {
    await saveScore(entry('a', 70))
    await saveScore(entry('b', 80))
    await saveDuel(duel('d1'))
    const moved = await archiveAndReset(Date.UTC(2026, 10, 4, 12))
    expect(moved).toBe(3)
    expect(await listScores()).toHaveLength(0)
    expect(await db.duels.count()).toBe(0)
    const archived = await db.archive.toArray()
    expect(archived.map((e) => e.id).sort()).toEqual(['a', 'b'])
    expect(archived.every((e) => e.arsivGunu === '2026-11-04')).toBe(true)
    const duels = await db.duelArchive.toArray()
    expect(duels.map((d) => [d.id, d.arsivGunu])).toEqual([['d1', '2026-11-04']])
  })

  it('stores only the fields the privacy rules allow', async () => {
    await saveScore({ ...entry('a', 70), secimler: ['x', null, 'y', 'z', 'w'] })
    const [stored] = await listScores()
    expect(Object.keys(stored).sort()).toEqual(
      ['id', 'izin', 'nick', 'score', 'secimler', 'senaryo', 'sure', 'unvan', 'zaman'].sort(),
    )
  })
})

describe('scenario session store', () => {
  it('finish() builds the entry once, saves it with the choices and remembers the scenario', async () => {
    const sc = findScenario('yemekhane')!
    const store = useScenarioStore.getState()
    store.begin('Korkut', false)
    store.chooseScenario('yemekhane')
    for (const [i, k] of [0, 1, 2, 0, 0].entries()) {
      const puan = sc.adimlar[i].secenekler[k].puan
      useScenarioStore
        .getState()
        .addPick({ stepIndex: i, optionIndex: k, puan, sure: 12.4, limit: 20 })
    }
    const first = useScenarioStore.getState().finish()
    const second = useScenarioStore.getState().finish()
    expect(second).toBe(first)
    expect(first).toMatchObject({
      nick: 'Korkut',
      score: 81,
      unvan: 'Senior Analist',
      senaryo: 'yemekhane',
      sure: 62,
      izin: false,
    })
    expect(first.secimler).toEqual([0, 1, 2, 0, 0].map((k, i) => sc.adimlar[i].secenekler[k].id))
    expect(window.localStorage.getItem(STORAGE_KEYS.lastScenario)).toBe('yemekhane')
    await expect.poll(async () => (await listScores()).map((e) => e.id)).toEqual([first.id])
  })

  it('a game where every step timed out is saved with 0 points', () => {
    const store = useScenarioStore.getState()
    store.begin('Boş Oyuncu', true)
    store.chooseScenario('kafe')
    for (let i = 0; i < 5; i++)
      useScenarioStore
        .getState()
        .addPick({ stepIndex: i, optionIndex: null, puan: 0, sure: 20, limit: 20 })
    const e = useScenarioStore.getState().finish()
    expect(e.score).toBe(0)
    expect(e.secimler).toEqual([null, null, null, null, null])
  })

  it('choosing a scenario starts a fresh game', () => {
    const store = useScenarioStore.getState()
    store.begin('Korkut', true)
    store.chooseScenario('kafe')
    useScenarioStore
      .getState()
      .addPick({ stepIndex: 0, optionIndex: 0, puan: 6, sure: 3, limit: 20 })
    useScenarioStore.getState().chooseScenario('kafe')
    expect(useScenarioStore.getState().picks).toEqual([])
    expect(useScenarioStore.getState().nick).toBe('Korkut')
  })
})

describe('duel store', () => {
  it('a new duel has a task, two different names and nobody ready', () => {
    useDuelStore.getState().newDuel()
    const s = useDuelStore.getState()
    expect(s.taskId).toBeTruthy()
    expect(s.names[0]).not.toBe(s.names[1])
    expect(s.ready).toEqual([false, false])
    expect(s.phase).toBe('card')
  })

  it('the name dice rolls as often as a player likes, never repeating, until they are ready', () => {
    useDuelStore.getState().newDuel()
    const seen = new Set(useDuelStore.getState().names)
    for (let i = 0; i < 12; i++) {
      const next = useDuelStore.getState().reroll(0)
      expect(next).toBeTruthy()
      expect(seen.has(next!)).toBe(false)
      expect(next).not.toBe(useDuelStore.getState().names[1])
      seen.add(next!)
    }
    useDuelStore.getState().toggleReady(0)
    expect(useDuelStore.getState().reroll(0)).toBeNull()
    expect(useDuelStore.getState().reroll(1)).toBeTruthy()
  })

  it('both players ready → countdown', () => {
    useDuelStore.getState().newDuel()
    useDuelStore.getState().toggleReady(0)
    expect(useDuelStore.getState().phase).toBe('card')
    useDuelStore.getState().toggleReady(1)
    expect(useDuelStore.getState().phase).toBe('count')
  })

  it('end() scores both boxes once and saves the duel; empty boxes draw at 0', async () => {
    useDuelStore.getState().newDuel()
    useDuelStore.getState().start(90)
    const first = useDuelStore.getState().end()
    expect(useDuelStore.getState().end()).toBe(first)
    expect(first.r.map((x) => x.total)).toEqual([0, 0])
    expect(first.win).toBe(-1)
    expect(first.r[0].lakap).toBeTruthy()
    await expect.poll(() => db.duels.count()).toBe(1)
  })

  it('a new duel draws another task, fresh names and resets ready', () => {
    useDuelStore.getState().newDuel()
    const first = useDuelStore.getState().taskId
    useDuelStore.getState().toggleReady(0)
    useDuelStore.getState().reroll(1)
    useDuelStore.getState().newDuel()
    const next = useDuelStore.getState()
    expect(next.taskId).not.toBe(first)
    expect(next.names[0]).not.toBe(next.names[1])
    expect(next.ready).toEqual([false, false])
    expect(next.shown).toEqual([...next.names])
  })
})

describe('sample day (staff menu)', () => {
  it('is the same every time: 36 scenario games and 16 duels with valid scores', () => {
    const a = demoDay(new Date(2026, 10, 4))
    const b = demoDay(new Date(2026, 10, 4))
    expect(a).toEqual(b)
    expect(a.scores).toHaveLength(36)
    expect(a.duels).toHaveLength(16)
    for (const e of a.scores) {
      expect(e.score).toBeGreaterThanOrEqual(0)
      expect(e.score).toBeLessThanOrEqual(100)
      expect(findScenario(e.senaryo)).toBeTruthy()
    }
    for (const d of a.duels) expect([-1, 0, 1]).toContain(d.kazanan)
  })

  it('loading replaces the tables; ?demo=1 only seeds an empty database', async () => {
    await saveScore(entry('mine', 50))
    await seedDemoIfRequested(true)
    expect((await listScores()).map((e) => e.id)).toEqual(['mine'])
    await loadDemoDay()
    expect(await db.scores.count()).toBe(36)
    expect(await db.duels.count()).toBe(16)
    await seedDemoIfRequested(false)
    expect(await db.scores.count()).toBe(36)
  })
})
