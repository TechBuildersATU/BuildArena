import { describe, expect, it } from 'vitest'
import { juryAnalysis } from '@/ai/juryAnalysis'
import { findScenario } from '@/data/scenarioBank'
import { scoreScenario, type ScenarioPick } from '@/game/scoring'

const yemekhane = findScenario('yemekhane')!

function picks(choices: (number | null)[]): ScenarioPick[] {
  return choices.map((k, i) => ({
    stepIndex: i,
    optionIndex: k,
    puan: k === null ? 0 : yemekhane.adimlar[i].secenekler[k].puan,
    sure: 10,
    limit: 20,
  }))
}
const totalOf = (p: ScenarioPick[]) => scoreScenario(yemekhane, p).total

describe('local jury analysis template (scenario doc §3.6, §9.3)', () => {
  it('reproduces the document example (4 strong, 1 weak decision)', () => {
    const p = picks([0, 1, 2, 0, 0])
    expect(juryAnalysis(yemekhane, p, totalOf(p))).toBe(
      'Turnike geçişi, atomik işlem ve yoğun saat performansı kararların çok sağlam. ' +
        'Menü bilgisi tarafında küçük bir eksik var: "Menü + kalori + alerjen" daha iyi işlerdi. ' +
        'Biraz cila ile kusursuz olur.',
    )
  })

  it('names the timed-out step and its best move', () => {
    const p = picks([0, null, 2, 3, 0])
    expect(juryAnalysis(yemekhane, p, totalOf(p))).toContain(
      'Atomik işlem adımında süre doldu; doğru hamle "Bakiye ve geçiş tek işlemde" olurdu.',
    )
  })

  it('a perfect game has no weak step', () => {
    const p = picks([0, 1, 2, 3, 0])
    const text = juryAnalysis(yemekhane, p, 100)
    expect(text).not.toContain('eksik')
    expect(text).toMatch(/gönül rahatlığıyla teslim ederiz!$/)
  })

  it('one strong decision uses the singular', () => {
    const p = picks([0, 0, 0, 1, 1])
    expect(juryAnalysis(yemekhane, p, totalOf(p))).toMatch(/^Turnike geçişi kararın çok sağlam\./)
  })

  it('no strong decision gets an encouraging opener and closing', () => {
    const p = picks([null, null, null, null, null])
    const text = juryAnalysis(yemekhane, p, 0)
    expect(text).toMatch(/^Kriz seni zorladı ama sonuna kadar karar verdin\./)
    expect(text).toMatch(/bir tur daha dene!$/)
  })

  it.each([
    [80, 'Biraz cila ile kusursuz olur.'],
    [60, 'Temel sağlam; detaylar biraz daha özen istiyor.'],
    [40, 'Kriz atlatıldı ama yara izi kaldı.'],
  ])('closes a %i-point game with "%s"', (total, closing) => {
    expect(juryAnalysis(yemekhane, picks([0, 0, 0, 0, 0]), total)).toMatch(
      new RegExp(`${closing.replace(/[.;]/g, '\\$&')}$`),
    )
  })
})
