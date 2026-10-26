import { describe, expect, it } from 'vitest'
import { ScenarioBankSchema, ScenarioSchema, wordCount } from '@/ai/schemas'
import { SCENARIO_BANK, SCENARIOS, crisisName, shortName } from '@/data/scenarioBank'
import raw from '@/data/scenarios.json'

const clone = <T>(v: T): T => structuredClone(v)

describe('scenario bank (scenario doc §5, §9.1)', () => {
  it('passes schema validation', () => {
    expect(ScenarioBankSchema.safeParse(raw).success).toBe(true)
  })

  it('has the sixteen crises in wheel order: the club eight first, then eight new ones', () => {
    expect(SCENARIOS.map((s) => s.id)).toEqual([
      'yemekhane',
      'kutuphane',
      'kafe',
      'hastane',
      'magaza',
      'obs',
      'servis',
      'yurt',
      'eticaret',
      'ring',
      'otostop',
      'sinav',
      'banka',
      'deprem',
      'bilet',
      'wifi',
    ])
    expect(shortName(SCENARIOS[0])).toBe('Yemekhane')
    expect(crisisName(SCENARIOS[0])).toBe('Öğle Saati Krizi')
  })

  it('every step has exactly one 20-point option and texts of at most 6 words', () => {
    for (const s of SCENARIOS) {
      for (const a of s.adimlar) {
        expect(a.secenekler.filter((o) => o.puan === 20)).toHaveLength(1)
        for (const o of a.secenekler) expect(wordCount(o.metin), o.metin).toBeLessThanOrEqual(6)
      }
    }
  })

  it('fifteen of the sixteen scenarios follow the 20 / 10–14 / 2×0–8 spread exactly', () => {
    // Yemekhane keeps the club document's scores, where two steps have no 10–14 option.
    const strict = SCENARIOS.filter((s) =>
      s.adimlar.every((a) => {
        const p = a.secenekler.map((o) => o.puan).sort((x, y) => y - x)
        return p[0] === 20 && p[1] >= 10 && p[1] <= 14 && p[2] <= 8 && p[3] <= 8
      }),
    )
    expect(strict.map((s) => s.id)).toEqual(
      SCENARIOS.map((s) => s.id).filter((id) => id !== 'yemekhane'),
    )
  })

  it('step 5 asks one plain question everywhere; no "fonksiyonel olmayan" jargon', () => {
    for (const s of SCENARIOS) {
      const last = s.adimlar[4]
      expect(last.soru, s.id).toBe('Sistem büyürken asla vazgeçilmemesi gereken özellik hangisi?')
      expect(last.konu, s.id).toBe('olmazsa olmaz')
      expect(JSON.stringify(s).toLocaleLowerCase('tr'), s.id).not.toContain('fonksiyonel')
    }
  })

  it('texts fit the screen: situation ≤ 150, question ≤ 70, effect ≤ 70, summary ≤ 22 characters', () => {
    for (const s of SCENARIOS)
      for (const a of s.adimlar) {
        expect(a.durum.length, a.durum).toBeLessThanOrEqual(150)
        expect(a.soru.length, a.soru).toBeLessThanOrEqual(70)
        for (const o of a.secenekler) {
          expect(o.etki.length, o.etki).toBeLessThanOrEqual(70)
          expect(o.ozet.length, o.ozet).toBeLessThanOrEqual(22)
        }
      }
  })

  it('some crises come from our own campus (ring bus, campus carpool, online exam, Wi-Fi)', () => {
    const ids = SCENARIOS.map((s) => s.id)
    for (const id of ['ring', 'otostop', 'sinav', 'wifi']) expect(ids).toContain(id)
  })

  it('title bands cover 0–100 without gaps', () => {
    const covered = new Set<number>()
    for (const b of SCENARIO_BANK.unvanlar) for (let p = b.min; p <= b.max; p++) covered.add(p)
    expect(covered.size).toBe(101)
  })

  describe('rejects invalid AI output', () => {
    const base = () => clone(raw.senaryolar[0])

    it('an option longer than 6 words', () => {
      const s = base()
      s.adimlar[0].secenekler[0].metin = 'bir iki üç dört beş altı yedi'
      expect(ScenarioSchema.safeParse(s).success).toBe(false)
    })

    it('two 20-point options in a step', () => {
      const s = base()
      s.adimlar[0].secenekler[1].puan = 20
      expect(ScenarioSchema.safeParse(s).success).toBe(false)
    })

    it('an icon outside the allow-list', () => {
      const s = base()
      s.adimlar[0].secenekler[0].ikon = 'skull'
      expect(ScenarioSchema.safeParse(s).success).toBe(false)
    })

    it('four steps instead of five', () => {
      const s = base()
      s.adimlar.pop()
      expect(ScenarioSchema.safeParse(s).success).toBe(false)
    })

    it('a general step in place of a detail step', () => {
      const s = base()
      s.adimlar[2].seviye = 'genel'
      expect(ScenarioSchema.safeParse(s).success).toBe(false)
    })

    it('unknown fields such as injected HTML', () => {
      const s = { ...base(), html: '<script>alert(1)</script>' }
      expect(ScenarioSchema.safeParse(s).success).toBe(false)
    })
  })
})
