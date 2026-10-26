import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ROUTES } from '@/app/routes'
import { db, type DuelRecord, type ScoreEntry } from '@/db/database'
import { useScenarioStore } from '@/stores/scenarioStore'
import { renderApp } from './renderApp'

const SCENARIO_IDS = ['yemekhane', 'kutuphane', 'kafe', 'hastane', 'magaza']

function entries(count: number): ScoreEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `e${i}`,
    nick: `Oyuncu ${i + 1}`,
    score: 100 - i * 5,
    unvan: 'Mid Analist',
    senaryo: SCENARIO_IDS[i % 5],
    sure: 60,
    zaman: i,
    izin: i % 2 === 0,
  }))
}

async function openBoard(list: ScoreEntry[]) {
  await db.scores.bulkPut(list)
  const router = renderApp(ROUTES.home, ROUTES.leaderboard)
  await screen.findByTestId('podium')
  return router
}

const rows = () => screen.queryAllByTestId('leaderboard-row')

function duel(
  id: string,
  zaman: number,
  kazanan: 0 | 1 | -1,
  totals: [number, number],
): DuelRecord {
  const p = (nick: string, total: number) => ({
    nick,
    total,
    uyum: 0,
    isabet: 0,
    birlesim: 0,
    hiz: 0,
    ceza: 0,
    kalan: 0,
    box: [],
    tuzak: 0,
    lakap: 'Kod Kartalı',
  })
  return {
    id,
    zaman,
    gorev: 'hbys',
    kazanan,
    p: [p(`Sol ${id}`, totals[0]), p(`Sağ ${id}`, totals[1])],
  }
}

describe('leaderboard', () => {
  it('podium shows the top 3 and the table continues from rank 4', async () => {
    await openBoard(entries(6))
    expect(screen.getByTestId('podium-1')).toHaveTextContent('Oyuncu 1')
    expect(screen.getByTestId('podium-2')).toHaveTextContent('Oyuncu 2')
    expect(screen.getByTestId('podium-3')).toHaveTextContent('Oyuncu 3')
    await waitFor(() => expect(rows().map((r) => r.dataset.rank)).toEqual(['4', '5', '6']))
  })

  it('with three players or fewer the table explains itself and empty places say "Boş"', async () => {
    await openBoard(entries(2))
    expect(screen.getByTestId('leaderboard-table')).toHaveTextContent(
      "İlk 3'ten sonrası burada listelenir.",
    )
    expect(screen.getByTestId('podium-3')).toHaveTextContent('Boş')
  })

  it('lists ranks 4–13 and appends my row after "• • •" when I am lower', async () => {
    const list = entries(16)
    useScenarioStore.setState({ entry: list[14] })
    await openBoard(list)
    await waitFor(() => expect(rows()).toHaveLength(11))
    const mine = rows().at(-1)!
    expect(mine.dataset.rank).toBe('15')
    expect(mine.dataset.me).toBe('true')
    expect(within(mine).getByText('SEN')).toBeInTheDocument()
    expect(screen.getByText('• • •')).toBeInTheDocument()
  })

  it('highlights me on the podium', async () => {
    const list = entries(5)
    useScenarioStore.setState({ entry: list[1] })
    await openBoard(list)
    expect(screen.getByTestId('podium-2')).toHaveAttribute('data-me', 'true')
  })

  it('the scenario filter shows only that crisis and Tümü brings everything back', async () => {
    await openBoard(entries(10))
    await userEvent.click(screen.getByTestId('filter-kafe'))
    expect(screen.getByTestId('filter-kafe')).toHaveAttribute('aria-pressed', 'true')
    await waitFor(() => expect(screen.getByTestId('podium-1')).toHaveTextContent('Oyuncu 3'))
    expect(screen.getByTestId('podium-2')).toHaveTextContent('Oyuncu 8')
    expect(rows()).toHaveLength(0)
    await userEvent.click(screen.getByTestId('filter-all'))
    await waitFor(() => expect(rows()).toHaveLength(7))
  })

  it('Görevli opens the PIN keypad and the right PIN opens the staff menu', async () => {
    const router = await openBoard(entries(3))
    await userEvent.click(screen.getByTestId('btn-staff'))
    for (const d of '1234') await userEvent.click(screen.getByTestId(`pin-key-${d}`))
    await waitFor(() => expect(router.state.location.pathname).toBe(ROUTES.admin))
    expect(await screen.findByTestId('admin')).toBeInTheDocument()
  })

  it('an empty day invites the first player', async () => {
    await openBoard([])
    expect(screen.getByTestId('leaderboard-empty')).toHaveTextContent(
      'Henüz oyun yok. İlk krizi sen çöz!',
    )
  })

  it('the filter has all sixteen crises', async () => {
    await openBoard(entries(1))
    for (const id of [...SCENARIO_IDS, 'obs', 'servis', 'yurt', 'ring', 'otostop', 'wifi', 'bilet'])
      expect(screen.getByTestId(`filter-${id}`)).toBeInTheDocument()
  })

  it('the duel tab lists the duels of the day, newest first, with the winner crowned', async () => {
    await db.duels.bulkPut([
      duel('a', 1, 0, [70, 40]),
      duel('b', 3, -1, [50, 50]),
      duel('c', 2, 1, [30, 80]),
    ])
    await openBoard(entries(2))
    expect(screen.getByTestId('tab-sen')).toHaveAttribute('aria-selected', 'true')
    await userEvent.click(screen.getByTestId('tab-duel'))
    expect(screen.getByTestId('tab-duel')).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByTestId('podium')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getAllByTestId('duel-row')).toHaveLength(3))
    const list = screen.getAllByTestId('duel-row')
    expect(list.map((r) => r.dataset.winner)).toEqual(['-1', '1', '0'])
    expect(list[0]).toHaveTextContent('BERABERE')
    expect(list[1]).toHaveTextContent('Sağ c')
    expect(within(list[1]).getByLabelText('kazanan')).toBeInTheDocument()
    expect(screen.getByTestId('duel-count')).toHaveTextContent('3 düello')
    await userEvent.click(screen.getByTestId('tab-sen'))
    expect(await screen.findByTestId('podium')).toBeInTheDocument()
  })

  it('?sekme=duel opens the duel tab; an empty day says so', async () => {
    renderApp(`${ROUTES.leaderboard}?sekme=duel`)
    const pane = await screen.findByTestId('pane-duel')
    expect(await within(pane).findByText('Bugün henüz düello oynanmadı.')).toBeInTheDocument()
    expect(screen.getByTestId('tab-duel')).toHaveAttribute('aria-selected', 'true')
  })

  it('Ana Menü goes home', async () => {
    const router = await openBoard(entries(1))
    await userEvent.click(screen.getByTestId('btn-home'))
    expect(router.state.location.pathname).toBe(ROUTES.home)
  })

  it('Yeni oyuncu starts a fresh game on the nickname screen', async () => {
    useScenarioStore.setState({ nick: 'Korkut', entry: entries(1)[0] })
    const router = await openBoard(entries(3))
    await userEvent.click(screen.getByTestId('scenario-new-player'))
    expect(router.state.location.pathname).toBe(ROUTES.scenarioNickname)
    expect(useScenarioStore.getState()).toMatchObject({ nick: '', entry: null })
  })
})
