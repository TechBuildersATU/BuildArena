import { duelJury } from '@/ai/duelJury'
import { findTask, taskCards, TASKS } from '@/data/duelBank'
import nicknames from '@/data/nicknames.json'
import { findScenario, SCENARIOS } from '@/data/scenarioBank'
import { duelWinner, scoreDuel, scoreScenario, titleFor, type ScenarioPick } from '@/game/scoring'
import { db, type DuelRecord, type ScoreEntry } from './database'

// Sample day for rehearsals and presentations (staff menu → "Örnek verileri yükle", or ?demo=1
// in development): 36 scenario games and 16 duels. Seeded, so it is the same every time.

function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const NICKS = [
  'Async Ahtapot',
  'Turbo Kaplumbağa',
  'Regex Rakunu',
  'Null Baykuş',
  'Piksel Panda',
  'Lambda Lama',
  'Git Sincabı',
  'Byte Böceği',
  'Sprint Çitası',
  'Kernel Kirpi',
  'Cache Kedisi',
  'Deploy Kartalı',
  'Commit Tavşanı',
  'Docker Yunusu',
  'Cursor Kunduzu',
  'Bulut Baykuşu',
  'Debug Dedektifi',
  'Piksel Penguen',
  'Kod Kartalı',
  'Stack Sincabı',
  'Refactor Rakunu',
  'Firewall Foku',
  'Kahvesiz Kodcu',
  'Bugsız Baykuş',
  'Siber Tilki',
  'Kuantum Koala',
  'Nano Kunduz',
  'Retro Rakun',
  'Veri Vaşağı',
  'Hızlı Kartal',
  'Bit Kelebeği',
  'Neon Ahtapot',
  'Matris Martı',
  'Mikro Penguen',
  'Holo Ceylan',
  'Lojik Lemur',
]
const WEIGHT: Record<string, number> = {
  yemekhane: 7,
  kutuphane: 5,
  kafe: 5,
  hastane: 4,
  magaza: 4,
  obs: 6,
  servis: 3,
  yurt: 2,
}

export function demoDay(now = new Date()): { scores: ScoreEntry[]; duels: DuelRecord[] } {
  const R = mulberry32(20261104)
  const pick = <T>(list: readonly T[]) => list[Math.floor(R() * list.length)]
  const at = (h: number, m: number) => new Date(now).setHours(h, m, 0, 0)
  const scenarioPool = SCENARIOS.flatMap((s) => Array<string>(WEIGHT[s.id] ?? 2).fill(s.id))

  const scores = NICKS.map<ScoreEntry>((nick, i) => {
    const sc = findScenario(i === 0 ? 'hastane' : i === 1 ? 'magaza' : pick(scenarioPool))!
    const picks = sc.adimlar.map<ScenarioPick>((a, k) => {
      const byScore = a.secenekler.map((o, idx) => ({ o, idx })).sort((x, y) => y.o.puan - x.o.puan)
      const r = R()
      const chosen =
        i < 2 || r < 0.58
          ? byScore[0]
          : r < 0.83
            ? byScore[1]
            : R() < 0.1
              ? null
              : pick(byScore.slice(2))
      const sure = 4 + R() * 14
      return {
        stepIndex: k,
        optionIndex: chosen ? chosen.idx : null,
        puan: chosen ? chosen.o.puan : 0,
        sure: chosen ? sure : 20,
        limit: 20,
      }
    })
    const { total } = scoreScenario(sc, picks)
    return {
      id: `ornek${i}`,
      nick,
      score: total,
      unvan: titleFor(total),
      senaryo: sc.id,
      sure: Math.round(picks.reduce((s, p) => s + p.sure, 0)),
      zaman: at(9 + Math.floor(R() * 8), Math.floor(R() * 60)),
      izin: i === 1 ? false : R() < 0.75,
      secimler: picks.map((p) =>
        p.optionIndex === null ? null : sc.adimlar[p.stepIndex].secenekler[p.optionIndex].id,
      ),
    }
  })

  const duelNames = nicknames.duello
  const duels: DuelRecord[] = []
  for (let i = 0; i < 16; i++) {
    const task = findTask(pick(TASKS).id)!
    const names = [pick(duelNames), pick(duelNames)]
    if (names[0] === names[1])
      names[1] = duelNames[(duelNames.indexOf(names[0]) + 1) % duelNames.length]
    const required = taskCards(task).filter((c) => !task.tuzak.includes(c))
    const results = names.map((nick) => {
      const box = required
        .filter(() => R() < 0.78)
        .concat(task.tuzak.filter(() => R() < 0.14))
        .slice(0, 8)
      const kalan = R() < 0.5 ? 0 : Math.floor(R() * 40)
      return { nick, box, s: scoreDuel(task, box, kalan, 90) }
    })
    const winner = duelWinner([results[0].s, results[1].s])
    duels.push({
      id: `ornekd${i}`,
      zaman: at(9 + Math.floor(R() * 8), Math.floor(R() * 60)),
      gorev: task.id,
      kazanan: winner,
      p: results.map(({ nick, box, s }) => ({
        nick,
        total: s.total,
        uyum: s.uyum,
        isabet: s.isabet,
        birlesim: s.birlesim,
        hiz: s.hiz,
        ceza: s.ceza,
        kalan: s.kalan,
        box,
        tuzak: s.traps.length,
        lakap: duelJury(task, s, R).lakap,
      })) as DuelRecord['p'],
    })
  }
  return { scores, duels }
}

/** Replaces today's tables with the sample day. */
export async function loadDemoDay(): Promise<void> {
  const { scores, duels } = demoDay()
  await db.transaction('rw', db.scores, db.duels, async () => {
    await db.scores.clear()
    await db.duels.clear()
    await db.scores.bulkPut(scores)
    await db.duels.bulkPut(duels)
  })
}

/** ?demo=1 in development/tests: load the sample day into empty tables. */
export async function seedDemoIfRequested(flag: boolean): Promise<void> {
  if (!flag) return
  if ((await db.scores.count()) + (await db.duels.count()) > 0) return
  await loadDemoDay()
}
