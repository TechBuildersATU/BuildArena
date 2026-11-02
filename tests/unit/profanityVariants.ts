// Swear words and the ways players disguise them, for the nickname filter tests. Pure data and
// string functions (no imports), so a corpus script can load it with Node too.

/** Base spellings: Turkish (with its suffixes and phrases) and English, as people type them. */
export const SWEARS: readonly string[] = [
  // am…
  'am',
  'amı',
  'amın',
  'amına',
  'amını',
  'amcık',
  'amcığı',
  'amcığın',
  'amcı',
  'amcuk',
  'amck',
  'ambiti',
  'am biti',
  'amk',
  'amq',
  'aq',
  'amına koyim',
  'amınakoyim',
  'amına koyayım',
  'amınakoyayım',
  'amına koduğum',
  'amınoğlu',
  'amın oğlu',
  'amsız',
  'amsalak',
  'amkafa',
  'amcık ağızlı',
  'amına sokim',
  // sik…
  'sik',
  'siki',
  'sikik',
  'sikim',
  'sikimi',
  'sikime',
  'sikinde',
  'sikerim',
  'sikeyim',
  'sikiyim',
  'sikecem',
  'sikicem',
  'siktir',
  'siktir git',
  'siktirgit',
  'siktir lan',
  'hassiktir',
  'hasiktir',
  'siktim',
  'siktiğim',
  'siktiğimin',
  'sikiş',
  'sikişmek',
  'sikko',
  'sikmek',
  'sikmiş',
  'sikilmiş',
  'sg',
  'sktr',
  'skrm',
  'skym',
  'sikdir',
  // göt…
  'göt',
  'götü',
  'götün',
  'götüne',
  'götveren',
  'göt veren',
  'götlek',
  'götoş',
  'göt herif',
  'göt kafa',
  // oç / orospu…
  'oç',
  'o.ç',
  'ocu',
  'orospu',
  'orospu çocuğu',
  'orospuçocuğu',
  'orsp',
  'orspu',
  'oruspu',
  'orosbu',
  'orospunun',
  'orospu evladı',
  // piç…
  'piç',
  'piçi',
  'piçin',
  'piç kurusu',
  'piçkurusu',
  // yarak / taşak…
  'yarak',
  'yarrak',
  'yarram',
  'yarrağım',
  'yarağı',
  'dalyarak',
  'yarak kafa',
  'taşak',
  'taşşak',
  'daşşak',
  'taşaklı',
  'taşağı',
  // family insults
  'anan',
  'ananı',
  'ananın',
  'anana',
  'ananı sikeyim',
  'ananısikeyim',
  'ananın amı',
  'anasını',
  'anasını sikeyim',
  'anneni sikeyim',
  'bacını',
  'bacını sikeyim',
  'avradını',
  'sülaleni',
  'ecdadını',
  // other insults
  'pezevenk',
  'pezevengin',
  'pzvnk',
  'gavat',
  'kahpe',
  'kahbe',
  'ibne',
  'ipne',
  'yavşak',
  'kaltak',
  'sürtük',
  'kancık',
  'fahişe',
  'kevaşe',
  'puşt',
  'şerefsiz',
  'haysiyetsiz',
  'namussuz',
  'gerizekalı',
  'geri zekalı',
  'salak',
  'aptal',
  'ahmak',
  'dangalak',
  'mal',
  'malsın',
  'embesil',
  'mankafa',
  'beyinsiz',
  'angut',
  'dingil',
  'gerzek',
  'hödük',
  'hıyar',
  'denyo',
  'lavuk',
  'dallama',
  'ezik',
  'bok',
  'boktan',
  'bok kafa',
  // sexual
  'meme',
  'memeler',
  'pipi',
  'çük',
  'sakso',
  'seks',
  'seksi',
  'porno',
  'otuzbir',
  'osuruk',
  'sıçarım',
  'sıçayım',
  'yalarım',
  'sokarım',
  'sokayım',
  'koyim',
  'kodumun',
  'domal',
  'abazan',
  'azgın',
  'sapık',
  'tecavüz',
  // hate, terror, politics
  'zenci',
  'pkk',
  'fetö',
  'hitler',
  'nazi',
  // English
  'fuck',
  'fuck you',
  'fucker',
  'motherfucker',
  'shit',
  'bitch',
  'bastard',
  'asshole',
  'dick',
  'dickhead',
  'cock',
  'cunt',
  'pussy',
  'slut',
  'whore',
  'nigger',
  'nigga',
  'faggot',
  'retard',
  'porn',
  'sexy',
  'boobs',
  'tits',
  'penis',
  'dildo',
]

const upper = (s: string) => s.toLocaleUpperCase('tr')
const cap = (s: string) =>
  s
    .split(' ')
    .map((w) => upper(w.charAt(0)) + w.slice(1))
    .join(' ')
const ascii = (s: string) =>
  s.replace(/[çğıöşü]/g, (c) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' })[c] ?? c)
const glued = (s: string) => s.replace(/ /g, '')
const letters = (s: string) => [...glued(s)]

/** Digit spellings: one letter kind at a time, then all of them. */
const LEET: Array<[RegExp, string]> = [
  [/a/g, '4'],
  [/e/g, '3'],
  [/[iı]/g, '1'],
  [/[oö]/g, '0'],
  [/[sş]/g, '5'],
  [/t/g, '7'],
]

/** Every disguise of one swear word that the filter must still refuse. */
export function disguises(word: string): string[] {
  const out = new Set<string>()
  const add = (s: string) => out.add(s)
  const g = glued(word)

  add(word)
  add(upper(word))
  add(cap(word))
  add(ascii(word))
  add(upper(ascii(word)))
  add(word.replace(/i/g, 'ı')) // dotless evasion: sıktır, amına
  add(upper(word).replace(/İ/g, 'I'))
  add(word.replace(/ı/g, 'i'))
  for (const [re, digit] of LEET) add(word.replace(re, digit))
  add(LEET.reduce((s, [re, digit]) => s.replace(re, digit), word))
  add(word.replace(/k/g, 'q').replace(/v/g, 'w'))
  add(word.replace(/c/g, 'ç').replace(/s/g, 'ş'))
  // stretched letters: every vowel tripled, the last letter repeated, the first doubled
  add(word.replace(/[aeıioöuü]/g, (v) => v.repeat(3)))
  add(word + word.slice(-1).repeat(3))
  add(word.charAt(0).repeat(2) + word.slice(1))
  // letters split apart
  if (letters(word).length <= 9) {
    for (const sep of ['.', ' ', '_', '-', '. ']) add(letters(word).join(sep))
    add(upper(letters(word).join('.')))
  }
  // split in the middle of a word
  if (g.length >= 4)
    add(g.slice(0, Math.ceil(g.length / 2)) + ' ' + g.slice(Math.ceil(g.length / 2)))
  // glued to clean words
  add(`Kral${cap(g)}`)
  add(`${cap(g)}Kral`)
  add(`kral ${word}`)
  add(`${word} kral`)
  add(`Kral_${g}`)
  add(`${g}_34`)
  add(`${g}123`)
  add(`Kodcu ${cap(word)}`)
  // alternating case
  add(
    letters(word)
      .map((c, i) => (i % 2 ? upper(c) : c))
      .join(''),
  )
  return [...out]
}

/**
 * Glued to another word with no capital letter or space in between ("kralsiktir", "KRALSIKTIR").
 * Only words searched inside other words can be found like this, so short roots (am, sik, göt,
 * mal …) are left out: "Programına", "Normalsin" and "Kitabın" must stay clean.
 */
export function gluedWithoutBoundary(word: string): string[] {
  const g = glued(word)
  if (glued(ascii(word)).length < 5) return []
  return [`kral${g}`, `${g}kral`, `kodcu${glued(ascii(word))}`, upper(`kral${g}`)]
}
