// Local profanity filter for player nicknames: no network, no AI (the club decided against an API).
// Pure functions; the word lists live in `src/data/badwords.json` and are wired in `nickname.ts`.
//
// How a name is read
// 1. Unicode NFKC. Spaces, symbols and a lower-case letter followed by an upper-case one end a
//    word ("KralAmbiti" → "Kral", "Ambiti"). Digits are read as letters ("S1kt1r" → "siktir")
//    and, in a second reading, as spaces ("sg123" → "sg").
// 2. Turkish lower case, then every character becomes exactly one character in two parallel
//    strings (same positions):
//    - `tr`    keeps the Turkish letters ("sıkı"): only clean words are matched against it;
//    - `ascii` folds them (ç→c, ğ→g, ı→i, ö→o, ş→s, ü→u, other accents dropped) and turns digit
//              and symbol spellings into letters (0→o, 1→i, 3→e, 4→a …): bad words are matched
//              against it.
//    Runs of single letters are joined into one word ("s i k" → "sik").
// 3. Every word is read as typed and squeezed three ways — runs cut to two ("yarrrak" →
//    "yarrak"), vowel runs cut to one and consonant runs to two ("naaamuuussuuuz" →
//    "namussuz"), every run cut to one ("siiiktir" → "siktir") — and each of those once more
//    with q→k and w→v ("amq" → "amk").
// 4. A hit is the whole word being an `exact` or `sensitive` word (letter-only acronyms also
//    stretched: "ppkk"), the word starting with a `root`, ending with a `suffix`, or containing
//    a `fragment` anywhere. The whole name glued together is checked too — exact words and
//    fragments ("A m c ı k", "an an"), roots when its first word is short ("si ki") — but there
//    a hit must begin where a word begins or end where one ends ("Si Kerim", "Amc ık"), so two
//    clean words such as "Işık Erdem" never make a bad one between them.
// 5. A hit is forgiven only when a clean word typed there, with its Turkish letters, covers it
//    completely: "Sikke" covers the root "sik" and "Amca" covers "am", but nothing covers
//    "Amcı", "Ambiti", "Sikkerim" or "sikilmiş" (only "sıkılmış" with a dotless ı is clean).

export interface FilterLists {
  /** whole word only */
  exact: readonly string[]
  /** the start of a word */
  roots: readonly string[]
  /** the end of a word */
  suffixes: readonly string[]
  /** anywhere in a word, and in the whole name with the separators removed */
  fragments: readonly string[]
  /** politics, terror, hate and real people: whole word only */
  sensitive: readonly string[]
  /** clean words that forgive a hit lying completely inside them */
  cleanWords: readonly string[]
}

/** One word in two aligned spellings: `tr` keeps ç ğ ı ö ş ü, `ascii` is folded to a–z. */
export interface Reading {
  tr: string
  ascii: string
}

const TURKISH = 'çğıöşü'
const TURKISH_FOLD: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' }
const VOWELS = 'aeiou'

/** Digit and symbol spellings of letters ("S1kt1r", "4mk", "$ik"). */
const LEET: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '6': 'g',
  '7': 't',
  '8': 'b',
  '9': 'g',
  '@': 'a',
  $: 's',
  '!': 'i',
  '|': 'i',
  '€': 'e',
}

/** One lower-case character → [tr, ascii], or null for a separator. */
function mapChar(c: string): [string, string] | null {
  const leet = LEET[c]
  if (leet) return [leet, leet]
  if (TURKISH.includes(c)) return [c, TURKISH_FOLD[c]]
  const folded = c.normalize('NFKD').replace(/\p{M}/gu, '')
  if (folded.length === 1 && folded >= 'a' && folded <= 'z') return [folded, folded]
  return null
}

/** "KralAmbiti" → "Kral Ambiti" */
const splitCamel = (s: string) => s.replace(/(\p{Ll})(\p{Lu})/gu, '$1 $2')

/** "sg123" → "sg   " (the second reading) */
const withoutDigits = (s: string) => s.replace(/[0-9]/g, ' ')

/** The words of a name, single letters joined ("S.i.k" → "sik", "A Mcık" → "a", "mcik"). */
export function readWords(text: string): Reading[] {
  const tokens: Reading[] = []
  let tr = ''
  let ascii = ''
  for (const ch of splitCamel(text.normalize('NFKC')).toLocaleLowerCase('tr')) {
    const m = mapChar(ch)
    if (m) {
      tr += m[0]
      ascii += m[1]
    } else if (ascii) {
      tokens.push({ tr, ascii })
      tr = ''
      ascii = ''
    }
  }
  if (ascii) tokens.push({ tr, ascii })

  const words: Reading[] = []
  let run: Reading | null = null
  for (const t of tokens) {
    if (t.ascii.length === 1) {
      run = run ? { tr: run.tr + t.tr, ascii: run.ascii + t.ascii } : t
      continue
    }
    if (run) words.push(run)
    run = null
    words.push(t)
  }
  if (run) words.push(run)
  return words
}

/** Lower-case, Turkish letters → ASCII, digit/symbol spellings → letters ("S1k" → "sik"). */
export function normalizeForFilter(s: string): string {
  let out = ''
  for (const ch of s.normalize('NFKC').toLocaleLowerCase('tr')) out += mapChar(ch)?.[1] ?? ch
  return out
}

/** How repeated letters are read: as typed, runs ≤ 2, vowels 1 + consonants ≤ 2, runs 1. */
type Level = 'typed' | 'two' | 'vowels' | 'one'
const LEVELS: readonly Level[] = ['typed', 'two', 'vowels', 'one']

/** A reading after squeezing, with the typed position of every letter it kept. */
interface Squeezed extends Reading {
  index: number[]
}

/**
 * Cuts runs of equal letters (judged on the ASCII spelling; both spellings stay aligned). A run
 * never continues across the start of a word in a glued name ("beyli ışıker").
 */
function squeeze(w: Reading, level: Level, wordStarts?: Edges['starts']): Squeezed {
  let tr = ''
  let ascii = ''
  const index: number[] = []
  let run = 0
  for (let i = 0; i < w.ascii.length; i++) {
    const c = w.ascii[i]
    run = i > 0 && c === w.ascii[i - 1] && !wordStarts?.has(i) ? run + 1 : 1
    const max =
      level === 'typed'
        ? Infinity
        : level === 'one' || (level === 'vowels' && VOWELS.includes(c))
          ? 1
          : 2
    if (run <= max) {
      tr += w.tr[i]
      ascii += c
      index.push(i)
    }
  }
  return { tr, ascii, index }
}

/** q → k, w → v ("amq" → "amk"); only the ASCII spelling changes. */
const phonetic = (w: Squeezed): Squeezed => ({
  ...w,
  ascii: w.ascii.replace(/q/g, 'k').replace(/w/g, 'v'),
})

/** Words grouped by their first two letters, for a quick lookup at every position. */
function byFirstTwo(words: readonly string[]): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const w of words) map.set(w.slice(0, 2), [...(map.get(w.slice(0, 2)) ?? []), w])
  return map
}

const join = (words: readonly Reading[]): Reading => ({
  tr: words.map((w) => w.tr).join(''),
  ascii: words.map((w) => w.ascii).join(''),
})

type Span = readonly [number, number]

/**
 * Where the words of a glued name begin and end (typed positions; `ends` holds last letters),
 * each with whether that word is itself one whole clean word ("Sıkı" in "Sıkı Savunma").
 */
interface Edges {
  starts: ReadonlyMap<number, boolean>
  ends: ReadonlyMap<number, boolean>
}

/** What is checked: one word, or the whole name glued (with or without the roots). */
type Scope = 'word' | 'glued' | 'gluedShortStart'

interface CleanWord {
  tr: string
  squeezed: Record<Level, string>
}

export interface ProfanityFilter {
  /** true when no hit is left uncovered by a clean word */
  isClean(name: string): boolean
  /** the bad words found (ASCII spelling), for tests and debugging */
  explain(name: string): string[]
}

export function createProfanityFilter(lists: FilterLists): ProfanityFilter {
  const prep = (words: readonly string[]) => [
    ...new Set(words.map((w) => join(readWords(w)).ascii).filter(Boolean)),
  ]
  const exact = new Set([...prep(lists.exact), ...prep(lists.sensitive)])
  /** letter-only acronyms (pkk, sg, sktr) also match stretched: "ppkk", "sgg" */
  const acronyms = new Set(
    [...exact]
      .filter((w) => ![...w].some((c) => VOWELS.includes(c)))
      .map((w) => squeeze({ tr: w, ascii: w }, 'one').ascii)
      .filter((w) => w.length >= 2),
  )
  const roots = byFirstTwo(prep(lists.roots))
  const suffixes = prep(lists.suffixes)
  const fragments = byFirstTwo(prep(lists.fragments))

  const clean: CleanWord[] = lists.cleanWords
    .map((w) => join(readWords(w)))
    .filter((w) => w.ascii.length > 0)
    .map((w) => ({
      tr: w.tr,
      squeezed: {
        typed: w.tr,
        two: squeeze(w, 'two').tr,
        vowels: squeeze(w, 'vowels').tr,
        one: squeeze(w, 'one').tr,
      },
    }))
  const cleanWhole = new Set(clean.map((c) => c.tr))
  const cleanIndex = new Map<string, CleanWord[]>()
  for (const c of clean) {
    const key = c.tr.slice(0, 2)
    cleanIndex.set(key, [...(cleanIndex.get(key) ?? []), c])
  }

  /** The clean words typed somewhere in `tr`. */
  function cleanIn(tr: string): CleanWord[] {
    const found: CleanWord[] = []
    for (let k = 0; k < tr.length; k++) {
      for (const c of cleanIndex.get(tr.slice(k, k + 2)) ?? [])
        if (tr.startsWith(c.tr, k)) found.push(c)
    }
    return found
  }

  function covered(tr: string, [i, j]: Span, covers: readonly string[]): boolean {
    for (const c of covers) {
      if (c.length < j - i) continue
      for (
        let k = tr.indexOf(c, Math.max(0, j - c.length));
        k !== -1 && k <= i;
        k = tr.indexOf(c, k + 1)
      ) {
        if (k + c.length >= j) return true
      }
    }
    return false
  }

  /** Bad words in one spelling that no clean word covers. */
  function hitsIn(w: Squeezed, scope: Scope, covers: readonly string[], edges?: Edges): string[] {
    const a = w.ascii
    const found: Array<[string, Span]> = []
    if (exact.has(a)) found.push([a, [0, a.length]])
    else if (acronyms.has(squeeze(w, 'one').ascii)) found.push([a, [0, a.length]])
    if (scope !== 'glued') {
      for (const r of roots.get(a.slice(0, 2)) ?? [])
        if (a.startsWith(r)) found.push([r, [0, r.length]])
    }
    if (scope === 'word') {
      for (const s of suffixes) if (a.endsWith(s)) found.push([s, [a.length - s.length, a.length]])
    }
    for (let k = 0; k < a.length - 1; k++) {
      for (const f of fragments.get(a.slice(k, k + 2)) ?? []) {
        if (a.startsWith(f, k)) found.push([f, [k, k + f.length]])
      }
    }
    // In a glued name a hit counts only where it begins or ends with a word that is not one
    // whole clean word: "Si Kerim" and "Amc ık" count; "Sıkı Savunma" and "Işık Erdem" don't.
    const atEdge = ([i, j]: Span) =>
      !edges || edges.starts.get(w.index[i]) === false || edges.ends.get(w.index[j - 1]) === false
    return found
      .filter(([, span]) => atEdge(span) && !covered(w.tr, span, covers))
      .map(([word]) => word)
  }

  function check(w: Reading, scope: Scope, out: Set<string>, edges?: Edges) {
    // Only clean words really typed here may forgive a hit, at any squeeze level: "Book" is
    // clean, "Bbok" (→ "bok") is not.
    const typed = cleanIn(w.tr)
    const seen = new Set<string>()
    for (const level of LEVELS) {
      const v = squeeze(w, level, edges?.starts)
      // A level that changes nothing reads exactly like the one before it (most names).
      if (seen.has(v.ascii)) continue
      seen.add(v.ascii)
      const covers = typed.map((c) => c.squeezed[level])
      for (const word of hitsIn(v, scope, covers, edges)) out.add(word)
      const p = phonetic(v)
      if (p.ascii !== v.ascii) for (const word of hitsIn(p, scope, covers, edges)) out.add(word)
    }
  }

  function explain(name: string): string[] {
    const out = new Set<string>()
    for (const reading of new Set([name, withoutDigits(name)])) {
      const words = readWords(reading)
      for (const w of words) check(w, 'word', out)
      if (words.length < 2) continue
      const starts = new Map<number, boolean>()
      const ends = new Map<number, boolean>()
      let at = 0
      for (const w of words) {
        const whole = cleanWhole.has(w.tr)
        starts.set(at, whole)
        at += w.ascii.length
        ends.set(at - 1, whole)
      }
      const scope = words[0].ascii.length <= 3 ? 'gluedShortStart' : 'glued'
      check(join(words), scope, out, { starts, ends })
    }
    return [...out]
  }

  return { isClean: (name) => explain(name).length === 0, explain }
}
