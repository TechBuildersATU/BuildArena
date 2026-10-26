import type { Scenario } from '@/ai/schemas'
import type { ScenarioPick } from '@/game/scoring'
import { capTr, joinTr } from '@/utils/text'

// Local jury analysis template (scenario doc §9.3) — used whenever /api/comment doesn't answer.
// At most 3 sentences: the strong decisions, the better move on the weakest step, a closing line.

export function juryAnalysis(
  scenario: Scenario,
  picks: readonly ScenarioPick[],
  total: number,
): string {
  const step = (p: ScenarioPick) => scenario.adimlar[p.stepIndex]
  const strong = picks.filter((p) => p.puan === 20).map((p) => step(p).konu)
  const weak = picks.filter((p) => p.puan < 20).sort((a, b) => a.puan - b.puan)[0]

  let text =
    strong.length >= 2
      ? `${capTr(joinTr(strong.slice(0, 3)))} kararların çok sağlam. `
      : strong.length === 1
        ? `${capTr(strong[0])} kararın çok sağlam. `
        : 'Kriz seni zorladı ama sonuna kadar karar verdin. '

  if (weak) {
    const s = step(weak)
    const best = s.secenekler.find((o) => o.puan === 20)
    if (best) {
      text +=
        weak.optionIndex === null
          ? `${capTr(s.konu)} adımında süre doldu; doğru hamle "${best.metin}" olurdu. `
          : `${capTr(s.konu)} tarafında küçük bir eksik var: "${best.metin}" daha iyi işlerdi. `
    }
  }

  text +=
    total >= 90
      ? 'Bu sistemi gönül rahatlığıyla teslim ederiz!'
      : total >= 75
        ? 'Biraz cila ile kusursuz olur.'
        : total >= 55
          ? 'Temel sağlam; detaylar biraz daha özen istiyor.'
          : total >= 35
            ? 'Kriz atlatıldı ama yara izi kaldı.'
            : 'Stajyerlik bir başlangıç; bir tur daha dene!'
  return text
}
