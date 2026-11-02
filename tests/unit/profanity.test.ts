import { describe, expect, it } from 'vitest'
import { explainBadWords, isClean, isValidNick } from '@/game/nickname'
import { readWords } from '@/game/profanity'
import { lowerTr, upperTr } from '@/utils/text'
import { disguises, gluedWithoutBoundary, SWEARS } from './profanityVariants'

// The booth team asked for a much stricter filter (2026-11-03): "amcık" was refused but "amcı" and
// "ambiti" passed, and Turkish lets players build hundreds more. These tests try every swear in
// every disguise, and keep the clean words that look like them usable.

const cap = (s: string) => upperTr(s.charAt(0)) + s.slice(1)

describe('profanity filter: the reported words and their family', () => {
  it.each([
    'amcık',
    'amcı',
    'Amcı',
    'AMCI',
    'ambiti',
    'Ambiti',
    'am biti',
    'AmBiti',
    'KralAmbiti',
    'Kral Amcı',
    'amcııı',
    'a.m.c.ı',
    'Am Cı',
    'Amc Ik',
    'amcı123',
    '4mc1',
    'amq',
    'amk kral',
    'Amına',
    'amın',
    'amini',
    'amsız',
    'amkafa',
    'amcuk',
    'amck',
    'amcıq',
    'aMcIk',
  ])('refuses "%s"', (name) => {
    expect(isClean(name)).toBe(false)
  })

  it('reads Turkish letters exactly where it matters: the dotless word is clean, the dotted one not', () => {
    for (const [clean, bad] of [
      ['Sıkı', 'Siki'],
      ['Sıkılmış', 'Sikilmiş'],
      ['Şık', 'Sik'],
      ['Amca', 'Amcı'],
      ['Ocak', 'Oçak'],
      ['Götürü', 'Göt'],
      ['Öcü', 'Ocu'],
    ]) {
      expect(isClean(clean), clean).toBe(true)
      expect(isClean(bad), bad).toBe(false)
    }
  })

  it('refuses 31 and 69 on their own, not inside a longer number', () => {
    for (const bad of [
      '31',
      'Kral31',
      '3 1',
      '3.1 Kral',
      'Kral_69',
      '69 Kedi',
      'otuz bir',
      'Otuzbir',
    ])
      expect(isClean(bad), bad).toBe(false)
    for (const ok of ['2031 Kodcu', 'Kod 314', 'Ali 1969', 'Kral 2069'])
      expect(isClean(ok), ok).toBe(true)
  })
})

describe('profanity filter: every disguise of every swear', () => {
  // A disguise that happens to be a real clean word stays usable: "sik" written with dotless ı
  // is "sık" (often), "siki" is "sıkı" (tight), "sikilmiş" is "sıkılmış" (bored).
  const REAL_WORDS = new Set(['sık', 'sıkı', 'sıkılmış'])
  // Two real words side by side: a hit split across them is forgiven when one side is a whole
  // clean word ("Sıkı Savunma", "Işık Erdem"), so "taş ağı" (stone net) passes too.
  const TWO_CLEAN_WORDS = new Set(['taş ağı', 'yala rım'])

  const cases = SWEARS.flatMap((w) => disguises(w).map((d) => [w, d] as const)).filter(
    ([, d]) => !REAL_WORDS.has(lowerTr(d)) && !TWO_CLEAN_WORDS.has(lowerTr(d)),
  )

  it(`refuses all ${cases.length} disguised spellings of ${SWEARS.length} swears`, () => {
    expect(cases.length).toBeGreaterThan(5000)
    const passed = cases.filter(([, d]) => isClean(d)).map(([w, d]) => `${w} → ${d}`)
    expect(passed).toEqual([])
  })

  // Short roots can't be searched inside other words without refusing clean ones (programına,
  // anlamsız, kazananı, normalsin, şehitler, eşyalarım …). They are still refused as a word of
  // their own, in CamelCase or split off by a space, digit or symbol.
  const ONLY_AS_OWN_WORD = new Set([
    'amına',
    'amını',
    'amsız',
    'piçin',
    'yarak',
    'ananı',
    'anana',
    'malsın',
    'seksi',
    'yalarım',
    'zenci',
    'hitler',
  ])

  it('refuses long swears glued to other letters with no capital or space between', () => {
    const glued = SWEARS.filter((w) => !ONLY_AS_OWN_WORD.has(w)).flatMap(gluedWithoutBoundary)
    expect(glued.length).toBeGreaterThan(500)
    expect(glued.filter((d) => isClean(d))).toEqual([])
  })

  it.each([...ONLY_AS_OWN_WORD])(
    'refuses "%s" as its own word, in CamelCase and split off',
    (w) => {
      for (const d of [w, `Kral${cap(w)}`, `kral ${w}`, `${w}_kral`, `${w}34`, `Kodcu-${w}`])
        expect(isClean(d), d).toBe(false)
    },
  )
})

describe('profanity filter: clean words that look like swears', () => {
  const CLEAN = [
    // am…
    'Amca',
    'Amcam',
    'Amcazade',
    'Amerikalı',
    'Ambulans',
    'Amatör Kodcu',
    'Amazon',
    'Amigo',
    'Amir',
    'Amine',
    'Amiral',
    'Ampul',
    'Amper',
    'Ambar',
    'Amaç',
    'Aman Kodcu',
    'Amasya',
    'Amazing Kedi',
    'Ambition',
    'Stamina Kral',
    'Vitamin',
    'Programına',
    'Anlamını',
    'Anlamsız Kedi',
    'Adamcık',
    'Kazananı',
    'Normalsin',
    'Zamk',
    // sık / şık / sik…
    'Sıkı Savunma',
    'Sıkı Mert',
    'Sıkı Takipçi',
    'Sıkıntılı Kedi',
    'Sıkılmış Panda',
    'Şık Kedi',
    'Şikayetçi',
    'Sikke',
    'Siklon',
    'Siklet',
    'Işık Erdem',
    'Işık Kerem',
    'Aşıktır',
    'Karmaşıktır',
    'Musiki',
    // göt / got, oç / oc, piç / pic
    'Goto Kral',
    'Gotik Kedi',
    'Götürü Kodcu',
    'Ocak',
    'Öcü',
    'Octopus',
    'Picasso',
    'Picnic',
    // others
    'Book Lover',
    'Memeli',
    'Müfettiş',
    'Megavat',
    'Hipopotam',
    'Asker',
    'Askerim',
    'Bina',
    'Pop Star',
    'Seksen',
    'Saksofon',
    'Phuket',
    'Fukara',
    'Penisilin',
    'Menisküs',
    'Milföy',
    'Skeç',
    'Gibisi Yok',
    'Kral Gibisin',
    'Cocktail',
    'Dickens',
    'Kayarak Gel',
    'Malakit',
    'Doksan Dokuz',
    'Kod 1969',
  ]

  it.each(CLEAN)('accepts "%s"', (name) => {
    expect(explainBadWords(name)).toEqual([])
    expect(isValidNick(name)).toBe(true)
  })
})

describe('profanity filter: how a name is read', () => {
  it('splits CamelCase, joins single letters and reads digits as letters', () => {
    const ascii = (s: string) => readWords(s).map((w) => w.ascii)
    expect(ascii('KralAmbiti')).toEqual(['kral', 'ambiti'])
    expect(ascii('S.i.k Kral')).toEqual(['sik', 'kral'])
    expect(ascii('S1kt1r')).toEqual(['siktir'])
    expect(ascii('Çağrı_Öz')).toEqual(['cagri', 'oz'])
    expect(readWords('Sıkı')[0]).toEqual({ tr: 'sıkı', ascii: 'siki' })
  })

  it('explains what it found', () => {
    expect(explainBadWords('Kral Amcı')).toContain('am')
    expect(explainBadWords('KralSiktir')).toContain('siktir')
    expect(explainBadWords('Kral 31')).toContain('31/69')
    expect(explainBadWords('Kod Kartalı')).toEqual([])
  })
})
