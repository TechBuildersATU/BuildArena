import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { db } from '@/db/database'
import { useScenarioStore } from '@/stores/scenarioStore'
import { DEFAULT_SETTINGS, useSettingsStore } from '@/stores/settingsStore'
import { useUiStore } from '@/stores/uiStore'

// jsdom has no canvas; share images are covered by the Playwright tests.
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { value: () => null })
// …and no Web Animations: a finished no-op animation is enough for the effects layer.
if (!Element.prototype.animate) {
  Object.defineProperty(Element.prototype, 'animate', {
    value: () => ({
      finished: Promise.resolve(),
      onfinish: null,
      cancel: () => {},
      finish: () => {},
    }),
  })
}
if (!Element.prototype.getAnimations) {
  Object.defineProperty(Element.prototype, 'getAnimations', { value: () => [] })
}

afterEach(async () => {
  cleanup()
  window.localStorage.clear()
  await db.scores.clear()
  await db.archive.clear()
  await db.duels.clear()
  await db.duelArchive.clear()
  useSettingsStore.setState({ ...DEFAULT_SETTINGS })
  useScenarioStore.getState().reset()
  useUiStore.setState({ staffUnlocked: false, toast: null })
})
