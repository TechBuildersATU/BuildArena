import badwords from '@/data/badwords.json'
import nicknames from '@/data/nicknames.json'
import { lowerTr } from '@/utils/text'

// Scenario nickname rules (scenario doc §7): 3–16 characters; letters (Turkish included),
// digits, space, _ and -; clean language; same name today gets a number suffix.

export const NICK_MIN = 3
export const NICK_MAX = 16

const ALLOWED = /^[A-Za-zÇĞİÖŞÜçğıöşü0-9 _-]+$/
/** Characters a physical keyboard may type into the field. */
export const ALLOWED_CHAR = /^[A-Za-zÇĞİÖŞÜçğıöşü0-9 _-]$/

// ---------------------------------------------------------------- language filter

const LEET: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b',
  '@': 'a',
  $: 's',
  '!': 'i',
  '|': 'i',
  '€': 'e',
}
const PLAIN: Record<string, string> = {
  ç: 'c',
  ğ: 'g',
  ı: 'i',
  ö: 'o',
  ş: 's',
  ü: 'u',
  â: 'a',
  î: 'i',
  û: 'u',
}

/** Lower-case, Turkish letters → ASCII, digit/symbol spellings → letters ("S1k" → "sik"). */
export function normalizeForFilter(s: string): string {
  return lowerTr(s.normalize('NFKC'))
    .replace(/[çğıöşüâîû]/g, (c) => PLAIN[c])
    .replace(/[0134578@$!|€]/g, (c) => LEET[c])
}

/** Words of a normalized name; runs of single letters are joined ("s i k" → "sik"). */
function words(normalized: string): string[] {
  const out: string[] = []
  let letters = ''
  for (const token of normalized.split(/[^a-z]+/).filter(Boolean)) {
    if (token.length === 1) {
      letters += token
      continue
    }
    if (letters) out.push(letters)
    letters = ''
    out.push(token)
  }
  if (letters) out.push(letters)
  return out
}

/** "siiiktir" → "siktir" */
const collapse = (w: string) => w.replace(/(.)\1+/g, '$1')

const LISTS = {
  kok: badwords.kok,
  /** root → the clean words that may start with it ("oc" → Ocak, "bok" → Boks, "got" → Gotik) */
  kokIstisna: Object.entries(badwords.kokIstisna),
  sonek: badwords.sonek,
  parca: badwords.parca,
  kelime: new Set([...badwords.kelime, ...badwords.hassas]),
}

function badWord(form: string): boolean {
  return (
    LISTS.kelime.has(form) ||
    LISTS.kok.some((k) => form.startsWith(k)) ||
    LISTS.kokIstisna.some(
      ([root, clean]) => form.startsWith(root) && !clean.some((w) => form.startsWith(w)),
    ) ||
    LISTS.sonek.some((s) => form.endsWith(s)) ||
    LISTS.parca.some((p) => form.includes(p))
  )
}

/** "31" on its own or next to letters ("Kral31"), not inside a longer number ("2031"). */
const THIRTY_ONE = /(^|[^0-9])31($|[^0-9])/

/** Local filter only (the club decided against an AI moderation call). */
export function isClean(nick: string): boolean {
  if (THIRTY_ONE.test(nick)) return false
  const list = words(normalizeForFilter(nick))
  for (const w of list) if (badWord(w) || badWord(collapse(w))) return false
  const flat = list.join('')
  return !LISTS.parca.some((p) => flat.includes(p) || collapse(flat).includes(p))
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

/** Every "Tech Animal" combination that fits in 16 characters and passes the rules. */
export const GENERATED_NICKNAMES: readonly string[] = nicknames.uretec.on
  .flatMap((a) => nicknames.uretec.hayvan.map((b) => `${a} ${b}`))
  .filter((n) => n.length <= NICK_MAX && isValidNick(n))

const CURATED_NICKNAMES: readonly string[] = nicknames.senaryoZar.filter(isValidNick)

/** Hand-picked names first, then the generated ones. */
export const NICKNAME_POOL: readonly string[] = [
  ...new Set([...CURATED_NICKNAMES, ...GENERATED_NICKNAMES]),
]

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
    const source = random() < 0.25 ? CURATED_NICKNAMES : GENERATED_NICKNAMES
    const name = source[Math.floor(random() * source.length)]
    if (!avoid.has(lowerTr(name))) return name
  }
  return NICKNAME_POOL.find((n) => !avoid.has(lowerTr(n))) ?? GENERATED_NICKNAMES[0]
}
