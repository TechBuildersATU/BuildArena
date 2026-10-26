import { ROUTES } from './routes'
import { readFlag, STORAGE_KEYS, writeFlag } from './storage'
import { getTestFlags } from './testFlags'

// First-launch tutorial record (document §4.1).

export function isTutorialSeen(): boolean {
  return readFlag(STORAGE_KEYS.tutorialSeen)
}

export function markTutorialSeen(): void {
  writeFlag(STORAGE_KEYS.tutorialSeen, true)
}

/** Staff menu "Reset tutorial": shows it again on the next launch. */
export function resetTutorial(): void {
  writeFlag(STORAGE_KEYS.tutorialSeen, false)
}

export function shouldShowTutorialOnLaunch(opts: {
  seen: boolean
  skipTutorial: boolean
  pathname: string
}): boolean {
  return !opts.seen && !opts.skipTutorial && opts.pathname !== ROUTES.tutorial
}

/** Runs once before the router starts: sends a first-time visitor to the tutorial. */
export function applyFirstLaunchRedirect(): void {
  const show = shouldShowTutorialOnLaunch({
    seen: isTutorialSeen(),
    skipTutorial: getTestFlags().skipTutorial,
    pathname: window.location.pathname,
  })
  if (show) window.history.replaceState(null, '', ROUTES.tutorial)
}
