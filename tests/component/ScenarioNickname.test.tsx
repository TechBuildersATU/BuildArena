import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ROUTES } from '@/app/routes'
import { saveScore } from '@/db/database'
import { isValidNick } from '@/game/nickname'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { renderApp } from './renderApp'

async function openNickname() {
  const router = renderApp(ROUTES.home, ROUTES.scenarioNickname)
  await screen.findByTestId('scenario-nickname')
  return router
}

const input = () => screen.getByTestId<HTMLInputElement>('nick-input')
const text = () => input().value
const rule = (key: string) => screen.getByTestId(`rule-${key}`).dataset.state
const type = (value: string) => fireEvent.change(input(), { target: { value } })

describe('scenario nickname screen', () => {
  it('has no on-screen keyboard and no ready-name panel: a text field with a dice', async () => {
    await openNickname()
    expect(screen.queryByTestId('keyboard')).not.toBeInTheDocument()
    expect(screen.queryByTestId('key-A')).not.toBeInTheDocument()
    expect(input()).toHaveAttribute('maxLength', '16')
    expect(screen.getByTestId('nick-dice')).toBeInTheDocument()
    for (const id of ['nick-studio', 'reel-spin', 'reel-use', 'sug-0'])
      expect(screen.queryByTestId(id)).not.toBeInTheDocument()
  })

  it('typing updates the counter, rules and preview', async () => {
    await openNickname()
    type('Korkut')
    expect(screen.getByTestId('nick-count')).toHaveTextContent('6/16')
    expect(screen.getByTestId('nick-preview')).toHaveTextContent('Korkut')
    expect(rule('len')).toBe('ok')
    expect(rule('chars')).toBe('ok')
    expect(rule('clean')).toBe('ok')
    expect(screen.getByTestId('scenario-start')).toBeEnabled()
  })

  it('Start stays disabled until all three rules pass', async () => {
    await openNickname()
    const start = screen.getByTestId('scenario-start')
    expect(start).toBeDisabled()
    expect(rule('len')).toBe('idle')
    type('AB')
    expect(rule('len')).toBe('bad')
    expect(start).toBeDisabled()
    type('ABC')
    expect(start).toBeEnabled()
    type('ABC!')
    expect(rule('chars')).toBe('bad')
    expect(start).toBeDisabled()
  })

  it.each(['Salak', 'S1kt1r', 'Orrrospu', 'A.m.k Kral', 'Gerizekalı'])(
    'rejects "%s" with the documented message',
    async (name) => {
      await openNickname()
      type(name)
      expect(rule('clean')).toBe('bad')
      expect(screen.getByTestId('rule-clean')).toHaveTextContent(
        'Bu ad kullanılamıyor, başka bir ad dene.',
      )
      expect(screen.getByTestId('scenario-start')).toBeDisabled()
    },
  )

  it('leading and double spaces are tidied; at most 16 characters', async () => {
    await openNickname()
    type('   Kod   Kartalı')
    expect(text()).toBe('Kod Kartalı')
    type('ABCDEFGHIJKLMNOPQR')
    expect(text()).toHaveLength(16)
  })

  it('announces and applies the suffix when the name is taken today', async () => {
    await saveScore({
      id: 'x',
      nick: 'Korkut',
      score: 50,
      unvan: 'Junior Analist',
      senaryo: 'kafe',
      sure: 60,
      zaman: 1,
      izin: true,
    })
    const router = await openNickname()
    type('Korkut')
    await waitFor(() => expect(screen.getByTestId('nick-dup')).toHaveTextContent('Korkut_2'))
    expect(screen.getByTestId('nick-preview')).toHaveTextContent('Korkut_2')
    await userEvent.click(screen.getByTestId('scenario-start'))
    expect(useScenarioStore.getState().nick).toBe('Korkut_2')
    expect(router.state.location.pathname).toBe(ROUTES.scenarioIntro)
  })

  it('consent is on by default and can be switched off', async () => {
    await openNickname()
    const consent = screen.getByTestId('nick-consent')
    expect(consent).toHaveAttribute('aria-checked', 'true')
    await userEvent.click(consent)
    expect(consent).toHaveAttribute('aria-checked', 'false')
    type('Ali')
    await userEvent.click(screen.getByTestId('scenario-start'))
    expect(useScenarioStore.getState()).toMatchObject({ nick: 'Ali', izin: false })
  })

  const field = () => screen.getByTestId('nick-field')
  const rolled = () => waitFor(() => expect(field()).toHaveAttribute('data-spinning', 'false'))

  it('the dice rolls through names and lands on a valid one; Start waits for it', async () => {
    await openNickname()
    await userEvent.click(screen.getByTestId('nick-dice'))
    expect(field()).toHaveAttribute('data-spinning', 'true')
    expect(screen.getByTestId('scenario-start')).toBeDisabled()
    await rolled()
    expect(isValidNick(text())).toBe(true)
    expect(screen.getByTestId('scenario-start')).toBeEnabled()
    expect(screen.getByTestId('nick-preview')).toHaveTextContent(text())
  })

  it('pressing the dice again and again keeps bringing different names', async () => {
    await openNickname()
    const seen = new Set<string>()
    for (let i = 0; i < 6; i++) {
      await userEvent.click(screen.getByTestId('nick-dice'))
      await rolled()
      seen.add(text())
    }
    expect(seen.size).toBe(6)
  })

  it('the dice never lands on a name already taken today', async () => {
    await saveScore({
      id: 'y',
      nick: 'Turbo Tilki',
      score: 40,
      unvan: 'Stajyer',
      senaryo: 'kafe',
      sure: 60,
      zaman: 1,
      izin: true,
    })
    await openNickname()
    for (let i = 0; i < 5; i++) {
      await userEvent.click(screen.getByTestId('nick-dice'))
      await rolled()
      expect(screen.getByTestId('nick-dup')).not.toHaveTextContent('alınmış')
    }
  })

  it('typing during a roll stops it and keeps what was typed', async () => {
    await openNickname()
    await userEvent.click(screen.getByTestId('nick-dice'))
    type('Ece')
    expect(field()).toHaveAttribute('data-spinning', 'false')
    await new Promise((r) => setTimeout(r, 900))
    expect(text()).toBe('Ece')
  })

  it('a physical keyboard types, deletes and starts with Enter', async () => {
    const router = await openNickname()
    await userEvent.click(input())
    await userEvent.keyboard('Ece!x{Backspace}{Backspace}')
    expect(text()).toBe('Ece')
    await userEvent.keyboard('{Enter}')
    expect(router.state.location.pathname).toBe(ROUTES.scenarioIntro)
  })

  it('header buttons: music panel, effects, theme, then leaderboard and home', async () => {
    const router = await openNickname()
    const music = screen.getByTestId('btn-music')
    const sound = screen.getByTestId('btn-sound')
    // the music button opens a panel with the music switch and the volume
    expect(music).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(music)
    expect(music).toHaveAttribute('aria-expanded', 'true')
    const toggle = screen.getByTestId('music-toggle')
    expect(screen.getByTestId('volume-slider')).toHaveValue('80')
    await userEvent.click(toggle)
    expect(useSettingsStore.getState()).toMatchObject({ music: false, sfx: true })
    expect(toggle).toHaveAttribute('aria-checked', 'false')
    expect(music).toHaveAttribute('data-music', 'false')
    // a touch outside closes the panel
    await userEvent.click(screen.getByTestId('nick-input'))
    expect(screen.queryByTestId('audio-pop')).not.toBeInTheDocument()
    await userEvent.click(sound)
    expect(useSettingsStore.getState()).toMatchObject({ music: false, sfx: false })
    expect(sound).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(music)
    await userEvent.click(screen.getByTestId('music-toggle'))
    await userEvent.click(sound)
    expect(useSettingsStore.getState()).toMatchObject({ music: true, sfx: true })
    // the moon switches the palette's dark version on <html>
    const theme = screen.getByTestId('btn-theme')
    expect(theme).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(theme)
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(useSettingsStore.getState().theme).toBe('dark')
    await userEvent.click(theme)
    expect(document.documentElement.dataset.theme).toBe('light')

    await userEvent.click(screen.getByTestId('btn-leaderboard'))
    expect(router.state.location.pathname).toBe(ROUTES.leaderboard)
    await router.navigate(ROUTES.scenarioNickname)
    await screen.findByTestId('scenario-nickname')
    await userEvent.click(screen.getByTestId('btn-home'))
    expect(router.state.location.pathname).toBe(ROUTES.home)
  })
})
