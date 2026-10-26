import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  isTutorialSeen,
  markTutorialSeen,
  resetTutorial,
  shouldShowTutorialOnLaunch,
} from '@/app/firstLaunch'
import { ROUTES } from '@/app/routes'
import { STORAGE_KEYS } from '@/app/storage'

describe('first-launch tutorial record', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('is not seen on a fresh device', () => {
    expect(isTutorialSeen()).toBe(false)
  })

  it('is saved under buildarena.tutorialSeen and can be reset', () => {
    markTutorialSeen()
    expect(window.localStorage.getItem(STORAGE_KEYS.tutorialSeen)).toBe('1')
    expect(isTutorialSeen()).toBe(true)

    resetTutorial()
    expect(isTutorialSeen()).toBe(false)
  })

  it('falls back to showing the tutorial when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(() => markTutorialSeen()).not.toThrow()
    expect(isTutorialSeen()).toBe(false)
  })
})

describe('shouldShowTutorialOnLaunch', () => {
  it('shows the tutorial on first launch', () => {
    expect(shouldShowTutorialOnLaunch({ seen: false, skipTutorial: false, pathname: '/' })).toBe(
      true,
    )
  })

  it('does not show it once seen, with ?skipTutorial=1, or when already there', () => {
    expect(shouldShowTutorialOnLaunch({ seen: true, skipTutorial: false, pathname: '/' })).toBe(
      false,
    )
    expect(shouldShowTutorialOnLaunch({ seen: false, skipTutorial: true, pathname: '/' })).toBe(
      false,
    )
    expect(
      shouldShowTutorialOnLaunch({ seen: false, skipTutorial: false, pathname: ROUTES.tutorial }),
    ).toBe(false)
  })
})
