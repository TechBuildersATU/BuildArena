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
  const step = (p: ScenarioPick) => scenario.steps[p.stepIndex]
  const strong = picks.filter((p) => p.points === 20).map((p) => step(p).topic)
  const weak = picks.filter((p) => p.points < 20).sort((a, b) => a.points - b.points)[0]

  let text =
    strong.length >= 2
      ? `${capTr(joinTr(strong.slice(0, 3)))} kararların çok sağlam. `
      : strong.length === 1
        ? `${capTr(strong[0])} kararın çok sağlam. `
        : 'Kriz seni zorladı ama sonuna kadar karar verdin. '

  if (weak) {
    const s = step(weak)
    const best = s.options.find((o) => o.points === 20)
    if (best) {
      text +=
        weak.optionIndex === null
          ? `${capTr(s.topic)} adımında süre doldu; doğru hamle "${best.text}" olurdu. `
          : `${capTr(s.topic)} tarafında küçük bir eksik var: "${best.text}" daha iyi işlerdi. `
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
