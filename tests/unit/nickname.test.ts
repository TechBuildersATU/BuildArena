import { describe, expect, it } from 'vitest'
import nicknames from '@/data/nicknames.json'
import {
  checkNick,
  GENERATED_NICKNAMES,
  isClean,
  isValidNick,
  NICKNAME_POOL,
  normalizeForFilter,
  rollNickname,
  tidyTyped,
  uniqueNick,
} from '@/game/nickname'
import { seeded } from '@/game/random'

describe('nickname rules (scenario doc §7)', () => {
  it('3–16 characters, surrounding spaces not counted', () => {
    expect(checkNick('ab').len).toBe(false)
    expect(checkNick('abc').len).toBe(true)
    expect(checkNick('  abc  ').len).toBe(true)
    expect(checkNick('a'.repeat(16)).len).toBe(true)
    expect(checkNick('a'.repeat(17)).len).toBe(false)
  })

  it('letters (Turkish included), digits, space, _ and - only', () => {
    expect(checkNick('Çağrı_Öz-2').chars).toBe(true)
    expect(checkNick('İlkşen Ünlü').chars).toBe(true)
    expect(checkNick('Korkut!').chars).toBe(false)
    expect(checkNick('<img src=x onerror=alert(1)>').chars).toBe(false)
    expect(isValidNick('<img src=x onerror=alert(1)>')).toBe(false)
  })

  it('normalises Turkish letters, digits and look-alike symbols before filtering', () => {
    expect(normalizeForFilter('Ş1Ğ')).toBe('sig')
    expect(normalizeForFilter('ÇÖÜ İı')).toBe('cou ii')
    expect(normalizeForFilter('4mk')).toBe('amk')
  })

  it('same name today gets a number suffix, case-insensitively and within 16 characters', () => {
    expect(uniqueNick('Korkut', ['Async Ahtapot'])).toBe('Korkut')
    expect(uniqueNick('Korkut', ['korkut'])).toBe('Korkut_2')
    expect(uniqueNick('Korkut', ['Korkut', 'Korkut_2'])).toBe('Korkut_3')
    expect(uniqueNick('İLKER', ['ilker'])).toBe('İLKER_2')
    const long = uniqueNick('Turbo Kaplumbağa', ['Turbo Kaplumbağa'])
    expect(long).toBe('Turbo Kaplumba_2')
    expect(long).toHaveLength(16)
  })

  it('typed text: no leading or double spaces, clipped to 16 characters', () => {
    expect(tidyTyped('   Korkut')).toBe('Korkut')
    expect(tidyTyped('Kod   Kartalı')).toBe('Kod Kartalı')
    expect(tidyTyped('a'.repeat(30))).toHaveLength(16)
  })
})

describe('Turkish profanity filter', () => {
  it.each([
    'Siktir Git',
    'S1kt1r',
    'oRoSpU',
    'Salak Kedi',
    'Aptal Kodcu',
    'Gerizekalı',
    'Mal Herif',
    '4mk',
    'amk',
    'AQ Kral',
    'Amına Koyim',
    'Orrrospu',
    'S.i.k.t.i.r',
    'S i k t i r',
    'Pezevenk_1',
    'Piç Kurusu',
    'Göt Herif',
    'Yarrak',
    'Yarak Kafa',
    'Kahpe',
    'Şerefsiz',
    'Ibne',
    'Puşt',
    'Sürtük',
    'Fuck You',
    'Bitch Panda',
    'Ananı Sikeyim',
    'Siktiğim',
    'Sikerim Seni',
    'Orospu Cocugu',
    'Oç Kral',
    'Hassiktir',
    'Dallama',
    'Ezik Kodcu',
    'Kaltak',
    'Amcık',
  ])('rejects "%s"', (name) => {
    expect(isClean(name)).toBe(false)
  })

  it.each(['PKK Kral', 'Hitler', 'Nazi Kodcu', 'Feto'])(
    'rejects the political/terror name "%s"',
    (name) => {
      expect(isClean(name)).toBe(false)
    },
  )

  // Ordinary names, cities and words that contain a bad word inside them must pass.
  const ORDINARY = [
    'Korkut',
    'Kemal',
    'Gamze',
    'Ahmet_2',
    'Mehmet',
    'Ayşe',
    'Fatma',
    'Zeynep',
    'Elif',
    'Emre',
    'Burak',
    'Can',
    'Cem',
    'Deniz',
    'Ece',
    'Ebru',
    'Esra',
    'Gizem',
    'Hakan',
    'Hande',
    'İlker',
    'İrem',
    'Kaan',
    'Kerem',
    'Leyla',
    'Mert',
    'Merve',
    'Murat',
    'Nazlı',
    'Nihat',
    'Okan',
    'Onur',
    'Özge',
    'Pınar',
    'Selin',
    'Serkan',
    'Sibel',
    'Sinan',
    'Tolga',
    'Tuğba',
    'Ufuk',
    'Umut',
    'Volkan',
    'Yasemin',
    'Yusuf',
    'Zafer',
    'Amine',
    'Amir',
    'Amil',
    'Amaç',
    'Ambar',
    'Kamil',
    'Samet',
    'Samimi Kodcu',
    'Hamit',
    'Hamza',
    'Lamia',
    'Ramazan',
    'Tamer',
    'Yamaç',
    'Damla',
    'Mamak',
    'Malatyalı',
    'Malik',
    'Malkoç',
    'Kemalettin',
    'Normal Kişi',
    'Ankara',
    'Adıyaman',
    'Amasya',
    'Kastamonu',
    'Sakarya',
    'Samsun',
    'Siirt',
    'Sivas',
    'Isparta',
    'Ordu',
    'Kırşehir',
    'Kars',
    'Sinop',
    'Çorum',
    'Bartın',
    'Bitlis',
    'Muş',
    'Iğdır',
    'Göksu',
    'Gökhan',
    'Gökçe',
    'Gökay',
    'Götürü Kodcu',
    'Pikachu',
    'Piksel Panda',
    'Picasso',
    'Kodlama Pici',
    'Sıkı Takipçi',
    'Sıkıcı Değil',
    'Sikke',
    'Sikkeci',
    'Şükrü',
    'Kasık',
    'Asik',
    'Aşık Veysel',
    'Yaramaz Kedi',
    'Yarasa',
    'Yaratıcı',
    'Yarın',
    'Yarışçı',
    'Dalak',
    'Daltonlar',
    'Dallas',
    'Cihat',
    'Oral',
    'Kurt',
    'Bozkurt',
    'Itır',
    'Mallık Yok',
    'Malzeme',
    'Salkım',
    'Salata',
    'Salamander',
    'Apple Fan',
    'Gerçekçi',
    'Pezo',
    'Siyah Kedi',
    'Amca',
    'Amcam',
    'Analist',
    'Anakart',
    'Ana Kodcu',
    'Basit Kod',
    'Async Ahtapot',
    'Cache Kedisi',
    'Amatör Kodcu',
    'Bugsız Baykuş',
    'Regex Rakunu',
    'Null Baykuş',
    'Git Sincabı',
    'Byte Böceği',
    'Docker Yunusu',
    'Kernel Kirpi',
    'Lambda Lama',
    'Sprint Çitası',
    'Turbo Kaplumbağa',
    'Deploy Kartalı',
    'Kod Kartalı',
    'Kuantum Koala',
    'Matris Martı',
    'Holo Ceylan',
    'Veri Vaşağı',
    'Nano Kunduz',
    'Siber Tilki',
    'Kahvesiz Kodcu',
    'Debug Dedektifi',
    'Refactor Rakunu',
    'Commit Tavşanı',
    'Retro Rakun',
    'Hızlı Kartal',
    'Bit Kelebeği',
    'Neon Ahtapot',
    'Mikro Penguen',
    'Lojik Lemur',
    'Kod Ustası',
    'Takımın Yıldızı',
    'Sakin Kafa',
    'Sabahçı',
    'Gece Kuşu',
    'Masa Tenisi',
    'Ceku',
    'Tekno Tilki',
  ]

  it(`accepts ${ORDINARY.length} ordinary names, cities and look-alike words`, () => {
    expect(ORDINARY.length).toBeGreaterThanOrEqual(150)
    const rejected = ORDINARY.filter((n) => !isValidNick(n))
    expect(rejected).toEqual([])
  })
})

describe('nickname generator', () => {
  it('generates thousands of different names, all valid', () => {
    expect(GENERATED_NICKNAMES.length).toBeGreaterThan(3000)
    expect(new Set(GENERATED_NICKNAMES).size).toBe(GENERATED_NICKNAMES.length)
    for (const n of GENERATED_NICKNAMES) {
      expect(n.length, n).toBeLessThanOrEqual(16)
      expect(isValidNick(n), n).toBe(true)
    }
  })

  it('every hand-picked dice name follows the rules; duel names pass the filter', () => {
    for (const n of nicknames.senaryoZar) expect(isValidNick(n), n).toBe(true)
    // duel names are assigned by the app (no 16-character limit), but must be clean too
    for (const n of nicknames.duello) expect(isClean(n), n).toBe(true)
    expect(NICKNAME_POOL.length).toBeGreaterThan(GENERATED_NICKNAMES.length)
  })

  it('the dice rolls valid pool names, never one taken today', () => {
    const taken = nicknames.senaryoZar.slice(0, 20)
    const lowered = taken.map((t) => t.toLocaleLowerCase('tr'))
    const random = seeded(42)
    for (let i = 0; i < 300; i++) {
      const name = rollNickname(taken, [], random)
      expect(NICKNAME_POOL).toContain(name)
      expect(isValidNick(name), name).toBe(true)
      expect(lowered).not.toContain(name.toLocaleLowerCase('tr'))
    }
  })

  it('pressing the dice again and again keeps bringing new combinations', () => {
    const random = seeded(3)
    const recent: string[] = []
    for (let i = 0; i < 40; i++) {
      const name = rollNickname([], recent, random)
      expect(recent).not.toContain(name)
      recent.unshift(name)
    }
    expect(new Set(recent).size).toBe(40)
    // mostly generated Tech + Animal pairs, now and then a hand-picked name
    const many = Array.from({ length: 400 }, () => rollNickname([], [], random))
    const curated = many.filter((n) => nicknames.senaryoZar.includes(n)).length
    expect(curated).toBeGreaterThan(40)
    expect(curated).toBeLessThan(200)
    expect(new Set(many).size).toBeGreaterThan(250)
  })

  it('is reproducible with a seed', () => {
    const roll = (seed: number) => {
      const random = seeded(seed)
      return Array.from({ length: 6 }, () => rollNickname([], [], random))
    }
    expect(roll(7)).toEqual(roll(7))
    expect(roll(7)).not.toEqual(roll(8))
  })
})
