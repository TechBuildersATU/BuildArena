// Every screen's URL. Screens navigate with these constants, never with string literals.
export const ROUTES = {
  tutorial: '/tutorial',
  home: '/',
  duelIntro: '/duel',
  duelGame: '/duel/play',
  duelResult: '/duel/result',
  scenarioNickname: '/scenario',
  /** Crisis wheel + crisis intro + 3-2-1 */
  scenarioIntro: '/scenario/intro',
  scenarioGame: '/scenario/play',
  scenarioResult: '/scenario/result',
  leaderboard: '/leaderboard',
  admin: '/admin',
} as const

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES]
