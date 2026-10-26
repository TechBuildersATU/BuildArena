import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ROUTES } from '@/app/routes'
import { STORAGE_KEYS } from '@/app/storage'
import { useSettingsStore } from '@/stores/settingsStore'
import { renderApp } from './renderApp'

describe('screen routing', () => {
  it.each([
    [ROUTES.tutorial, 'onboarding'],
    [ROUTES.home, 'home'],
    [ROUTES.duelIntro, 'task-card'],
    [ROUTES.scenarioNickname, 'scenario-nickname'],
    [ROUTES.leaderboard, 'leaderboard'],
  ])('%s renders %s', async (path, testId) => {
    renderApp(path)
    expect(await screen.findByTestId(testId)).toBeInTheDocument()
  })

  it.each([ROUTES.duelGame, ROUTES.duelResult])(
    '%s without a running duel goes to a new task card',
    async (path) => {
      const router = renderApp(path)
      expect(await screen.findByTestId('task-card')).toHaveAttribute('data-task')
      expect(router.state.location.pathname).toBe(ROUTES.duelIntro)
    },
  )

  it.each([ROUTES.scenarioIntro, ROUTES.scenarioGame, ROUTES.scenarioResult])(
    '%s without a nickname goes back to the nickname screen',
    async (path) => {
      const router = renderApp(path)
      expect(await screen.findByTestId('scenario-nickname')).toBeInTheDocument()
      expect(router.state.location.pathname).toBe(ROUTES.scenarioNickname)
    },
  )

  it('Home: no footer text; the music button holds the volume slider', async () => {
    renderApp(ROUTES.home)
    const home = await screen.findByTestId('home')
    expect(home).not.toHaveTextContent('Başlamak için bir moda dokun')
    expect(home).not.toHaveTextContent('4 Kasım Stant Etkinliği')
    expect(screen.queryByTestId('volume-slider')).not.toBeInTheDocument()
    await userEvent.click(screen.getByTestId('btn-music'))
    const slider = screen.getByTestId('volume-slider')
    expect(slider).toHaveAttribute('aria-label', 'Ses seviyesi')
    fireEvent.change(slider, { target: { value: '100' } })
    expect(useSettingsStore.getState().volume).toBe(100)
    expect(screen.getByTestId('volume-slider-value')).toHaveTextContent('%100')
    fireEvent.change(slider, { target: { value: '0' } })
    expect(useSettingsStore.getState().volume).toBe(0)
  })

  it('the staff menu asks for the PIN first', async () => {
    renderApp(ROUTES.admin)
    expect(await screen.findByTestId('pin-dialog')).toBeInTheDocument()
    expect(screen.queryByTestId('admin')).not.toBeInTheDocument()
  })

  it('unknown paths fall back to Home', async () => {
    renderApp('/does-not-exist')
    expect(await screen.findByTestId('home')).toBeInTheDocument()
  })

  it('tutorial Skip saves the record and opens Home', async () => {
    const router = renderApp(ROUTES.tutorial)
    await userEvent.click(await screen.findByTestId('tutorial-skip'))
    expect(window.localStorage.getItem(STORAGE_KEYS.tutorialSeen)).toBe('1')
    expect(router.state.location.pathname).toBe(ROUTES.home)
  })

  it('Leaderboard Ana Menü returns home', async () => {
    const router = renderApp(ROUTES.duelIntro, ROUTES.leaderboard)
    await userEvent.click(await screen.findByTestId('btn-home'))
    expect(router.state.location.pathname).toBe(ROUTES.home)
  })

  it('closing the PIN keypad goes Home when the app was opened on the staff menu', async () => {
    const router = renderApp(ROUTES.admin)
    await userEvent.click(await screen.findByTestId('pin-close'))
    expect(router.state.location.pathname).toBe(ROUTES.home)
  })
})
