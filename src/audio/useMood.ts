import { useEffect } from 'react'
import { ROUTES } from '@/app/routes'
import { setMood, type Mood } from './music'

const SCENARIO_ROUTES: readonly string[] = [
  ROUTES.scenarioNickname,
  ROUTES.scenarioIntro,
  ROUTES.scenarioGame,
  ROUTES.scenarioResult,
]

/**
 * The background piece for a screen: the scenario mode has its own calm, mysterious piece; the
 * duel builds up on the task card and drops the beat when the round starts; everything else
 * (home, tutorial, results, leaderboard, staff menu) plays the chill menu piece.
 */
export function moodFor(pathname: string): Mood {
  if (pathname === ROUTES.duelGame) return 'duel'
  if (pathname === ROUTES.duelIntro) return 'duelBuild'
  if (SCENARIO_ROUTES.includes(pathname)) return 'scenario'
  return 'menu'
}

/** Sets the background music's mood while a screen is shown. */
export function useMood(mood: Mood): void {
  useEffect(() => setMood(mood), [mood])
}
