import Dexie from 'dexie'
import { describe, expect, it, vi } from 'vitest'
import { SCENARIOS } from '@/data/scenarioBank'
import { CARDS, TASKS } from '@/data/duelBank'
import { BuildArenaDb } from '@/db/database'
import {
  LEGACY_CARD_IDS,
  LEGACY_SCENARIO_IDS,
  LEGACY_TASK_IDS,
  upgradeDuelRecord,
  upgradeScoreRecord,
} from '@/db/legacy'

// The first booth builds saved records with Turkish field names and ids. A tablet that already
// played must keep its leaderboard after the update.

const oldScore = {
  id: 'k1',
  nick: 'Kod Kartalı',
  score: 82,
  sure: 41,
  zaman: 1_700_000_000_000,
  unvan: 'Senior Analist',
  senaryo: 'kafe',
  izin: true,
  secimler: ['a', null, 'c', 'b', 'd'],
}

const oldPlayer = (nick: string, total: number) => ({
  nick,
  total,
  uyum: 40,
  isabet: 15,
  birlesim: 10,
  hiz: 5,
  ceza: -5,
  kalan: 12,
  box: ['randevu', 'sepet', 'sifreleme'],
  tuzak: 1,
  lakap: 'Sepet Koleksiyoncusu',
})

const oldDuel = {
  id: 'd1',
  zaman: 1_700_000_100_000,
  gorev: 'hbys',
  kazanan: 0,
  p: [oldPlayer('A', 65), oldPlayer('B', 40)],
}

describe('records saved by the first booth builds', () => {
  it('every old id maps to an id the game still has', () => {
    const scenarios = new Set(SCENARIOS.map((s) => s.id))
    const tasks = new Set(TASKS.map((t) => t.id))
    const cards = new Set(CARDS.map((c) => c.id))
    for (const id of Object.values(LEGACY_SCENARIO_IDS)) expect(scenarios.has(id), id).toBe(true)
    for (const id of Object.values(LEGACY_TASK_IDS)) expect(tasks.has(id), id).toBe(true)
    for (const id of Object.values(LEGACY_CARD_IDS)) expect(cards.has(id), id).toBe(true)
  })

  it('a scenario score gets English fields and the new scenario id', () => {
    expect(upgradeScoreRecord(oldScore)).toEqual({
      id: 'k1',
      nick: 'Kod Kartalı',
      score: 82,
      seconds: 41,
      playedAt: 1_700_000_000_000,
      title: 'Senior Analist',
      scenarioId: 'cafe',
      consent: true,
      choices: ['a', null, 'c', 'b', 'd'],
    })
    // an archived copy keeps its day
    expect(upgradeScoreRecord({ ...oldScore, arsivGunu: '2026-11-03' }).archiveDay).toBe(
      '2026-11-03',
    )
  })

  it('a duel gets English fields, the new task id and the new card ids', () => {
    const d = upgradeDuelRecord(oldDuel) as {
      taskId: string
      winner: number
      playedAt: number
      p: Record<string, unknown>[]
    }
    expect(d).toMatchObject({
      id: 'd1',
      taskId: 'hospital',
      winner: 0,
      playedAt: 1_700_000_100_000,
    })
    expect(d.p[0]).toEqual({
      nick: 'A',
      total: 65,
      coverage: 40,
      accuracy: 15,
      combo: 10,
      speed: 5,
      penalty: -5,
      secondsLeft: 12,
      box: ['appointment', 'cart', 'encryption'],
      trapCount: 1,
      epithet: 'Sepet Koleksiyoncusu',
    })
  })

  it('records already in the current shape stay exactly as they are', () => {
    const current = upgradeScoreRecord(oldScore)
    expect(upgradeScoreRecord(current)).toEqual(current)
    const duel = upgradeDuelRecord(oldDuel)
    expect(upgradeDuelRecord(duel)).toEqual(duel)
  })

  it('opening the database upgrades what an older build saved', async () => {
    const name = 'buildarena-upgrade-test'
    const old = new Dexie(name)
    old.version(1).stores({ scores: 'id, zaman', archive: 'id, arsivGunu' })
    old.version(2).stores({ duels: 'id, zaman', duelArchive: 'id, arsivGunu' })
    await old.open()
    await old.table('scores').put(oldScore)
    await old.table('archive').put({ ...oldScore, id: 'k0', arsivGunu: '2026-11-02' })
    await old.table('duels').put(oldDuel)
    old.close()

    const db = new BuildArenaDb(name)
    const [score] = await db.scores.toArray()
    expect(score).toMatchObject({ scenarioId: 'cafe', title: 'Senior Analist', seconds: 41 })
    expect(await db.archive.where('archiveDay').equals('2026-11-02').count()).toBe(1)
    const [duel] = await db.duels.orderBy('playedAt').toArray()
    expect(duel.taskId).toBe('hospital')
    expect(duel.p[1].box).toEqual(['appointment', 'cart', 'encryption'])
    db.close()
    await Dexie.delete(name)
  })

  it('settings saved under the old Turkish key are kept and moved to the new key', async () => {
    window.localStorage.setItem(
      'buildarena.ayarlar.v1',
      JSON.stringify({ duelSec: 45, volume: 35 }),
    )
    vi.resetModules()
    const fresh = await import('@/stores/settingsStore')
    expect(fresh.useSettingsStore.getState()).toMatchObject({ duelSec: 45, volume: 35 })
    expect(window.localStorage.getItem('buildarena.ayarlar.v1')).toBeNull()
    expect(JSON.parse(window.localStorage.getItem('buildarena.settings.v1') ?? '{}')).toMatchObject(
      {
        duelSec: 45,
      },
    )
  })
})
