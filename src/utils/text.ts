// Turkish-aware text helpers (İ/ı casing).

export const lowerTr = (s: string): string => s.toLocaleLowerCase('tr')
export const upperTr = (s: string): string => s.toLocaleUpperCase('tr')

/** "turnike geçişi" → "Turnike geçişi" */
export const capTr = (s: string): string => upperTr(s.charAt(0)) + s.slice(1)

/** First letter for an avatar; "?" when empty. */
export const initialOf = (nick: string): string => upperTr(nick.trim().charAt(0) || '?')

/** ["a", "b", "c"] → "a, b ve c" */
export function joinTr(items: readonly string[]): string {
  if (items.length < 2) return items.join('')
  return `${items.slice(0, -1).join(', ')} ve ${items[items.length - 1]}`
}

/** 62 → "1:02" */
export function formatDuration(seconds: number): string {
  const s = Math.round(seconds)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Timestamp → "12:04" */
export function formatClock(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}
