// Hex mirrors of the design tokens (src/styles/tokens.css) for canvas drawing and Web
// Animations, which can't read CSS variables. Keep the two in sync.

export const HEX = {
  paper: '#FFF4E6',
  card: '#FFFFFF',
  sunk: '#F1F3F5',
  ink: '#212529',
  ink2: '#495057',
  brand: '#A61E4D',
  p1: '#1864AB',
  p2: '#D9480F',
  scn: '#087F5B',
  gold: '#FCC419',
} as const

/** Gold, silver, bronze — ranking only; the rank number is written on them in ink. */
export const MEDAL_HEX = ['#FCC419', '#F1F3F5', '#FFE8CC'] as const

/** Confetti, logo sparkles and the butterfly trail: the logo's four printed colors and gold. */
export const CONFETTI = ['#A61E4D', '#1864AB', '#D9480F', '#087F5B', '#FCC419'] as const

/** The logo ring's colors, in order: raspberry → blue → orange → teal. */
export const RING_STOPS = ['#A61E4D', '#1864AB', '#D9480F', '#087F5B'] as const
