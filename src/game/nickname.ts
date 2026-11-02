import badwords from '@/data/badwords.json'
import nicknames from '@/data/nicknames.json'
import { createProfanityFilter } from '@/game/profanity'
import { lowerTr } from '@/utils/text'

export { normalizeForFilter } from '@/game/profanity'

// Scenario nickname rules (scenario doc §7): 3–16 characters; letters (Turkish included),
// digits, space, _ and -; clean language; same name today gets a number suffix.

export const NICK_MIN = 3
export const NICK_MAX = 16

const ALLOWED = /^[A-Za-zÇĞİÖŞÜçğıöşü0-9 _-]+$/
/** Characters a physical keyboard may type into the field. */
export const ALLOWED_CHAR = /^[A-Za-zÇĞİÖŞÜçğıöşü0-9 _-]$/

// ---------------------------------------------------------------- language filter

const profanity = createProfanityFilter(badwords)

/**
 * "31" and "69" on their own or next to letters ("Kral31", "3 1"), not inside a longer number
 * ("2031", "Kod 314").
 */
const SEXUAL_NUMBER = /(^|[^0-9])(31|69)($|[^0-9])/
const joinDigits = (s: string) => s.replace(/(\d)[\s._-]+(?=\d)/g, '$1')

/** Local filter only (the club decided against an AI moderation call); see `profanity.ts`. */
export function isClean(nick: string): boolean {
  return !SEXUAL_NUMBER.test(joinDigits(nick)) && profanity.isClean(nick)
}

/** The bad words found in a name (folded spelling), for tests and debugging. */
export function explainBadWords(nick: string): string[] {
  return [...(SEXUAL_NUMBER.test(joinDigits(nick)) ? ['31/69'] : []), ...profanity.explain(nick)]
}

// ---------------------------------------------------------------- rules

export interface NickChecks {
  len: boolean
  chars: boolean
  clean: boolean
}

export function checkNick(nick: string): NickChecks {
  const n = nick.trim()
  return {
    len: n.length >= NICK_MIN && n.length <= NICK_MAX,
    chars: n.length > 0 && ALLOWED.test(n),
    clean: n.length > 0 && isClean(n),
  }
}

export function isValidNick(nick: string): boolean {
  const c = checkNick(nick)
  return c.len && c.chars && c.clean
}

/** "Korkut" taken today → "Korkut_2" (then _3 …), still within 16 characters. */
export function uniqueNick(nick: string, taken: Iterable<string>): string {
  const used = new Set([...taken].map(lowerTr))
  if (!used.has(lowerTr(nick))) return nick
  for (let k = 2; k < 100; k++) {
    const suffix = `_${k}`
    const candidate = nick.slice(0, NICK_MAX - suffix.length) + suffix
    if (!used.has(lowerTr(candidate))) return candidate
  }
  return nick
}

/** Clips typed text to the rules: no leading space, no double spaces, at most 16 characters. */
export function tidyTyped(raw: string): string {
  return raw
    .replace(/^\s+/, '')
    .replace(/\s{2,}/g, ' ')
    .slice(0, NICK_MAX)
}

// ---------------------------------------------------------------- name generator

let generated: readonly string[] | undefined
let curated: readonly string[] | undefined
let pool: readonly string[] | undefined

/**
 * Every "Tech Animal" combination that fits in 16 characters and passes the rules. Built on first
 * use (a few thousand filter runs), not while the app starts.
 */
export function generatedNicknames(): readonly string[] {
  generated ??= nicknames.generator.prefixes
    .flatMap((a) => nicknames.generator.animals.map((b) => `${a} ${b}`))
    .filter((n) => n.length <= NICK_MAX && isValidNick(n))
  return generated
}

function curatedNicknames(): readonly string[] {
  curated ??= nicknames.scenarioDice.filter(isValidNick)
  return curated
}

/** Hand-picked names first, then the generated ones. */
export function nicknamePool(): readonly string[] {
  pool ??= [...new Set([...curatedNicknames(), ...generatedNicknames()])]
  return pool
}

/**
 * One ready-made name for the dice: usually a generated "Tech Animal" pair, every fourth roll or
 * so a hand-picked one (they are the funniest). Never a name taken today or shown recently, so
 * pressing the dice again and again keeps bringing new combinations.
 */
export function rollNickname(
  taken: Iterable<string> = [],
  recent: Iterable<string> = [],
  random: () => number = Math.random,
): string {
  const avoid = new Set([...taken, ...recent].map(lowerTr))
  for (let guard = 0; guard < 200; guard++) {
    const source = random() < 0.25 ? curatedNicknames() : generatedNicknames()
    const name = source[Math.floor(random() * source.length)]
    if (!avoid.has(lowerTr(name))) return name
  }
  return nicknamePool().find((n) => !avoid.has(lowerTr(n))) ?? generatedNicknames()[0]
}
