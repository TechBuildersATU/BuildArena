import type { Task } from '@/ai/schemas'
import { cardOf } from '@/data/duelBank'
import type { DuelScore } from '@/game/scoring'
import { lowerTr } from '@/utils/text'

// Local funny title (lakap) and jury comment for a duel player (document §6.5): one sincere
// compliment and one gentle tease, built from this round's choices.

export function duelJury(
  task: Task,
  s: DuelScore,
  random: () => number = Math.random,
): { lakap: string; yorum: string } {
  const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)]
  const name = (id: string) => cardOf(id).ad
  const place = lowerTr(task.kisa)
  const allCombos = s.done.length === task.birlesimler.length

  let lakap: string
  if (s.n === 0) lakap = pick(['Boş Ekran Sanatçısı', 'Sessiz Mimar'])
  else if (s.total >= 90)
    lakap = pick(['Gereksinim Gurusu', 'Analiz Makinesi', 'Product Owner Adayı', 'Kusursuz Mimar'])
  else if (s.traps.length >= 2) lakap = `${name(s.traps[0])} Koleksiyoncusu`
  else if (s.traps.length === 1)
    lakap = pick([`Gizli ${name(s.traps[0])} Hayranı`, `${name(s.traps[0])} Meraklısı`])
  else if (s.n <= 4) lakap = pick(['Minimalist Mimar', 'Az Olsun Benim Olsun'])
  else if (s.kalan >= 30 && s.total >= 60) lakap = pick(['Hız Treni Analist', 'Turbo Tasarımcı'])
  else if (allCombos) lakap = 'Kombo Ustası'
  else lakap = pick(['Sağlam Temel Ustası', 'Dengeli Tasarımcı', 'Gereksinim Avcısı'])

  const praise =
    s.n === 0
      ? 'Ekranı tertemiz bıraktın, hiç tuzağa düşmedin.'
      : s.done.length
        ? `"${s.done[0].ad}" birleşimini kurman çok yerinde.`
        : s.missing.length <= 2
          ? 'Kritik kartların neredeyse hepsini doğru seçtin.'
          : 'Cesur bir tasarım denemesi oldu.'
  const tease =
    s.n === 0
      ? `Ama kullanıcılar boş bir ${place} uygulamasıyla ne yapacak?`
      : s.traps.length
        ? `Ama ${place} uygulamasında "${name(s.traps[0])}" ne arıyor?`
        : s.missing.length
          ? `Yalnız "${name(s.missing[0])}" olmadan kullanıcılar biraz zorlanacak.`
          : 'Bir dahaki sefere daha da hızlı ol, rekor senin!'
  return { lakap, yorum: `${praise} ${tease}` }
}
