import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ROUTES } from '@/app/routes'
import { STORAGE_KEYS } from '@/app/storage'
import { db, type ScoreEntry } from '@/db/database'
import { demoDay } from '@/db/demoData'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUiStore } from '@/stores/uiStore'
import { renderApp } from './renderApp'

const entry = (id: string, score: number, izin = true): ScoreEntry => ({
  id,
  nick: `Oyuncu ${id}`,
  score,
  unvan: 'Senior Analist',
  senaryo: 'kafe',
  sure: 60,
  zaman: 1,
  izin,
})

async function openAdmin() {
  useUiStore.setState({ staffUnlocked: true })
  const router = renderApp(ROUTES.home, ROUTES.admin)
  await screen.findByTestId('admin')
  return router
}

describe('staff menu', () => {
  it('İlk 3 lists only consenting players and names the skipped ones', async () => {
    await db.scores.bulkPut([entry('a', 95), entry('b', 90, false), entry('c', 85), entry('d', 80)])
    await openAdmin()
    expect(screen.getByTestId('tab-top')).toHaveAttribute('aria-selected', 'true')
    await waitFor(() => expect(screen.getAllByTestId('admin-top3-row')).toHaveLength(3))
    expect(screen.getAllByTestId('admin-top3-row').map((r) => r.textContent)).toEqual([
      expect.stringContaining('Oyuncu a'),
      expect.stringContaining('Oyuncu c'),
      expect.stringContaining('Oyuncu d'),
    ])
    expect(screen.getByTestId('admin-skipped')).toHaveTextContent('Oyuncu b')
    expect(screen.getByTestId('dl-post')).toBeEnabled()
    expect(screen.getByTestId('dl-story')).toBeEnabled()
  })

  it('Gün sonu shows counts and highlights without personal data', async () => {
    const { scores, duels } = demoDay()
    await db.scores.bulkPut(scores)
    await db.duels.bulkPut(duels)
    await openAdmin()
    await userEvent.click(screen.getByTestId('tab-stats'))
    await waitFor(() => expect(screen.getByTestId('stat-0')).toHaveTextContent('36'))
    expect(screen.getByTestId('stat-1')).toHaveTextContent('16')
    const facts = screen.getAllByTestId('stat-fact')
    expect(facts.length).toBeGreaterThanOrEqual(4)
    expect(screen.getByTestId('stat-facts')).toHaveTextContent('En zor karar')
    expect(screen.getByTestId('stat-facts')).not.toHaveTextContent('Async Ahtapot')
    // every fact carries its icon, which the share image re-uses
    for (const [i] of facts.entries())
      expect(
        screen.getByTestId('stat-facts').querySelector(`[data-fact-icon="${i}"] svg`),
      ).not.toBeNull()
    expect(screen.getByTestId('dl-stats')).toBeEnabled()
    expect(screen.getByTestId('dl-stats-story')).toBeEnabled()
  })

  it('Ayarlar: times and the four switches change the booth settings', async () => {
    await openAdmin()
    await userEvent.click(screen.getByTestId('tab-set'))
    // duel lengths are 45 / 60 / 90 s; the old 120 s option is gone
    for (const sec of [45, 60, 90]) expect(screen.getByTestId(`set-duelSec-${sec}`)).toBeVisible()
    expect(screen.queryByTestId('set-duelSec-120')).not.toBeInTheDocument()
    await userEvent.click(screen.getByTestId('set-duelSec-45'))
    expect(useSettingsStore.getState().duelSec).toBe(45)
    await userEvent.click(screen.getByTestId('set-duelSec-60'))
    await userEvent.click(screen.getByTestId('set-stepSec-25'))
    expect(screen.getByTestId('set-duelSec-60')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('set-duelSec-90')).toHaveAttribute('aria-pressed', 'false')
    for (const key of ['sfx', 'music', 'haptics'] as const) {
      expect(screen.getByTestId(`set-${key}`)).toHaveAttribute('aria-checked', 'true')
      await userEvent.click(screen.getByTestId(`set-${key}`))
      expect(screen.getByTestId(`set-${key}`)).toHaveAttribute('aria-checked', 'false')
    }
    await userEvent.click(screen.getByTestId('set-idleTut'))
    expect(useSettingsStore.getState()).toMatchObject({
      duelSec: 60,
      stepSec: 25,
      sfx: false,
      music: false,
      haptics: false,
      idleTut: true,
    })
  })

  it('Ayarlar: the volume slider is the same setting as on the home screen', async () => {
    const router = await openAdmin()
    await userEvent.click(screen.getByTestId('tab-set'))
    const slider = screen.getByTestId('set-volume')
    expect(slider).toHaveValue('80')
    fireEvent.change(slider, { target: { value: '45' } })
    expect(useSettingsStore.getState().volume).toBe(45)
    expect(screen.getByTestId('set-volume-value')).toHaveTextContent('%45')
    await router.navigate(ROUTES.home)
    await userEvent.click(await screen.findByTestId('btn-music'))
    expect(screen.getByTestId('volume-slider')).toHaveValue('45')
  })

  it('Tutorial reset clears the "seen" record', async () => {
    window.localStorage.setItem(STORAGE_KEYS.tutorialSeen, '1')
    await openAdmin()
    await userEvent.click(screen.getByTestId('tab-set'))
    await userEvent.click(screen.getByTestId('admin-reset-tutorial'))
    expect(window.localStorage.getItem(STORAGE_KEYS.tutorialSeen)).toBeNull()
    expect(await screen.findByTestId('toast')).toHaveTextContent('Tutorial')
  })

  it('archive and reset asks first, then empties both tables into the archive', async () => {
    await db.scores.bulkPut([entry('a', 70)])
    const { duels } = demoDay()
    await db.duels.bulkPut(duels.slice(0, 2))
    await openAdmin()
    await userEvent.click(screen.getByTestId('tab-set'))
    await userEvent.click(screen.getByTestId('admin-reset'))
    const dialog = await screen.findByTestId('confirm-dialog')
    await userEvent.click(within(dialog).getByTestId('confirm-cancel'))
    expect(await db.scores.count()).toBe(1)
    await userEvent.click(screen.getByTestId('admin-reset'))
    await userEvent.click(
      within(await screen.findByTestId('confirm-dialog')).getByTestId('confirm-ok'),
    )
    await waitFor(async () => expect(await db.scores.count()).toBe(0))
    expect(await db.duels.count()).toBe(0)
    expect(await db.archive.count()).toBe(1)
    expect(await db.duelArchive.count()).toBe(2)
  })

  it('sample data loads a full day', async () => {
    await openAdmin()
    await userEvent.click(screen.getByTestId('tab-set'))
    await userEvent.click(screen.getByTestId('admin-demo'))
    await waitFor(async () => expect(await db.scores.count()).toBe(36))
    expect(await db.duels.count()).toBe(16)
    expect(await screen.findByTestId('toast')).toHaveTextContent('Örnek veriler yüklendi')
  })

  it('the home button locks the menu again', async () => {
    const router = await openAdmin()
    await userEvent.click(screen.getByTestId('btn-home'))
    expect(router.state.location.pathname).toBe(ROUTES.home)
    expect(useUiStore.getState().staffUnlocked).toBe(false)
  })
})
