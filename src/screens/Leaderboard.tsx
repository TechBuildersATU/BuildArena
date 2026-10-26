import { useEffect, useState, type CSSProperties } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { ROUTES } from '@/app/routes'
import { useIdle } from '@/app/useIdle'
import { usePressGuard } from '@/app/usePress'
import { Icon } from '@/components/Icon'
import { PinDialog } from '@/components/PinDialog'
import { Logo } from '@/components/Bits'
import { findTask } from '@/data/duelBank'
import { findScenario, SCENARIOS, shortName } from '@/data/scenarioBank'
import { useDuels, useScores, type DuelRecord, type ScoreEntry } from '@/db/database'
import { clearFx } from '@/game/fx'
import { rankEntries, shortTitle } from '@/game/scoring'
import { sfx } from '@/audio/sfx'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useUiStore } from '@/stores/uiStore'
import s from '@/styles/app.module.css'
import { cn } from '@/utils/cn'
import { formatClock, initialOf } from '@/utils/text'

const MEDAL = ['var(--gold)', 'var(--silver)', 'var(--bronze)']

type Tab = 'sen' | 'duel'

// Today's leaderboard (§8): the Scenario tab (podium, list, scenario filter, "SEN" highlight)
// and today's duels (newest first, crown on the winner). ?sekme=duel opens the duel tab.
export function Leaderboard() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const scores = useScores()
  const duels = useDuels()
  const me = useScenarioStore((st) => st.entry?.id)
  const reset = useScenarioStore((st) => st.reset)
  const unlockStaff = useUiStore((st) => st.unlockStaff)
  const [tab, setTab] = useState<Tab>(() => (params.get('sekme') === 'duel' ? 'duel' : 'sen'))
  const [filter, setFilter] = useState('all')
  const [round, setRound] = useState(0)
  const [pinOpen, setPinOpen] = useState(false)

  useIdle(() => void navigate(ROUTES.home), undefined, !pinOpen)

  useEffect(() => {
    clearFx()
    sfx.pick()
  }, [])

  const list = rankEntries(scores ?? []).filter((e) => filter === 'all' || e.senaryo === filter)
  const [date] = useState(() =>
    new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }),
  )

  const choose = (f: string) => {
    sfx.key()
    setFilter(f)
    setRound((r) => r + 1)
  }
  const chooseTab = (next: Tab) => {
    if (next === tab) return
    sfx.key()
    setTab(next)
    setRound((r) => r + 1)
  }
  const newPlayer = usePressGuard(() => {
    sfx.tap()
    reset()
    void navigate(ROUTES.scenarioNickname)
  })
  const home = usePressGuard(() => {
    sfx.tap()
    void navigate(ROUTES.home)
  })

  return (
    <main className={s.screen} data-testid="leaderboard">
      <header className={s.bar}>
        <div className={s.brand}>
          <Logo />
          Günün Skor Tablosu
        </div>
        <span className={s.chip}>
          <Icon name="calendar" />
          {date} · {tab === 'sen' ? 'Senaryo' : 'Düello'}
        </span>
        <div className={s.barR}>
          <div className={s.tabs} role="tablist" aria-label="Skor tablosu">
            {(
              [
                ['sen', 'route', 'Senaryo'],
                ['duel', 'swords', 'Günün Düelloları'],
              ] as const
            ).map(([id, icon, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                className={cn(s.tab, tab === id && s.tabOn)}
                data-testid={`tab-${id}`}
                onClick={() => chooseTab(id)}
              >
                <Icon name={icon} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {tab === 'sen' ? (
        <div className={cn(s.pane, s.boardGo)} key={`sen${round}`} data-testid="pane-sen">
          <div className={s.fltrow}>
            <span className={s.eyebrow}>
              <Icon name="filter" />
              SENARYO
            </span>
            <div className={s.flt} role="group" aria-label="Senaryo filtresi">
              <button
                type="button"
                className={cn(s.fltBtn, filter === 'all' && s.fltOn)}
                aria-pressed={filter === 'all'}
                data-testid="filter-all"
                onClick={() => choose('all')}
              >
                <Icon name="layers" />
                Tümü
              </button>
              {SCENARIOS.map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  className={cn(s.fltBtn, filter === sc.id && s.fltOn)}
                  aria-pressed={filter === sc.id}
                  aria-label={shortName(sc)}
                  title={shortName(sc)}
                  data-testid={`filter-${sc.id}`}
                  onClick={() => choose(sc.id)}
                >
                  <Icon name={sc.ikon} />
                </button>
              ))}
            </div>
          </div>
          {scores && <Board list={list} me={me} />}
          <div className={s.kvkk}>
            <Icon name="shield-check" />
            <div>
              Skor tablosunda yalnızca takma adın görünür. İzin verdiysen ilk 3&apos;e girdiğinde
              takma adın ATÜ TechBuilders hesaplarında paylaşılır; gerçek ad, telefon ya da e-posta
              alınmaz.
            </div>
          </div>
          <div className={s.legend}>
            <span>
              <Icon name="megaphone" />
              paylaşım izni var
            </span>
          </div>
        </div>
      ) : (
        <div className={cn(s.pane, s.boardGo)} key={`duel${round}`} data-testid="pane-duel">
          <div className={s.fltrow}>
            <span className={s.eyebrow}>
              <Icon name="swords" />
              BUGÜN OYNANAN DÜELLOLAR
            </span>
            <span className={s.chip} data-testid="duel-count">
              <Icon name="swords" />
              {duels?.length ?? 0} düello
            </span>
          </div>
          {duels && <DuelList duels={duels} />}
        </div>
      )}

      <div className={s.bfoot}>
        <button
          type="button"
          className={s.lockb}
          data-testid="btn-staff"
          onClick={() => {
            sfx.tap()
            setPinOpen(true)
          }}
        >
          <Icon name="lock" />
          Görevli
        </button>
        <span className={s.sp} />
        <button type="button" className={s.btn} data-testid="btn-home" onClick={home}>
          <Icon name="house" />
          Ana Menü
        </button>
        <button
          type="button"
          className={cn(s.btn, s.btnPri)}
          data-testid="scenario-new-player"
          onClick={newPlayer}
        >
          <Icon name="user-plus" />
          Yeni oyuncu
        </button>
      </div>

      {pinOpen && (
        <PinDialog
          onClose={() => setPinOpen(false)}
          onSuccess={() => {
            unlockStaff()
            void navigate(ROUTES.admin)
          }}
        />
      )}
    </main>
  )
}

function Board({ list, me }: { list: ScoreEntry[]; me: string | undefined }) {
  const podium = [list[1], list[0], list[2]]
  const heights = [150, 200, 112]
  const places = [1, 0, 2]
  const meIndex = list.findIndex((e) => e.id === me)
  const rows = list.slice(3, 13)

  return (
    <>
      <div className={s.podium} data-testid="podium">
        {podium.map((e, j) => {
          const place = places[j]
          const style = { '--m': MEDAL[place], '--h': `${heights[j]}px`, '--o': j } as CSSProperties
          if (!e) {
            return (
              <div
                key={place}
                className={cn(s.pd, s.pdEmpty)}
                style={style}
                data-testid={`podium-${place + 1}`}
              >
                <div className={s.pdTop}>
                  <div className={s.pav}>–</div>
                  <div className={s.pdName} style={{ color: 'var(--ink-2)' }}>
                    Boş
                  </div>
                </div>
                <div className={s.bar2}>
                  <b>{place + 1}</b>
                </div>
              </div>
            )
          }
          const sc = findScenario(e.senaryo)
          return (
            <div
              key={place}
              className={cn(s.pd, e.id === me && s.pdMe)}
              style={style}
              data-testid={`podium-${place + 1}`}
              data-me={e.id === me}
            >
              <div className={s.pdTop}>
                <div className={s.pav}>
                  {place === 0 && (
                    <span className={s.crown}>
                      <Icon name="crown" />
                    </span>
                  )}
                  {initialOf(e.nick)}
                </div>
                <div className={s.pdName}>{e.nick}</div>
                <div className={s.ps}>
                  {e.score}
                  <small> /100</small>
                </div>
                <div className={s.pu}>{shortTitle(e.unvan)}</div>
              </div>
              <div className={s.bar2}>
                <b>{place + 1}</b>
                {sc && <Icon name={sc.ikon} />}
                {e.izin && <Icon name="megaphone" aria-label="paylaşım izni var" />}
              </div>
            </div>
          )
        })}
      </div>

      <div className={s.tbl} data-testid="leaderboard-table">
        <div className={s.th}>
          <span>SIRA</span>
          <span />
          <span>TAKMA AD</span>
          <span>SENARYO</span>
          <span>UNVAN</span>
          <span>SAAT</span>
          <span className={s.right}>PUAN</span>
        </div>
        <div>
          {list.length <= 3 ? (
            <div className={s.tempty} data-testid="leaderboard-empty">
              {list.length
                ? "İlk 3'ten sonrası burada listelenir."
                : 'Henüz oyun yok. İlk krizi sen çöz!'}
            </div>
          ) : (
            <>
              {rows.map((e, i) => (
                <Row key={e.id} entry={e} rank={i + 4} order={i} me={me} />
              ))}
              {meIndex >= 13 && (
                <>
                  <div className={cn(s.tr2, s.rowGap)}>• • •</div>
                  <Row entry={list[meIndex]} rank={meIndex + 1} order={11} me={me} />
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}

function DuelList({ duels }: { duels: DuelRecord[] }) {
  const list = [...duels].sort((a, b) => b.zaman - a.zaman).slice(0, 8)
  return (
    <div className={s.dlist} data-testid="duel-list">
      <div className={s.dh}>
        <span>SAAT</span>
        <span>GÖREV</span>
        <span>OYUNCU 1</span>
        <span />
        <span className={s.right}>OYUNCU 2</span>
      </div>
      {list.length === 0 ? (
        <div className={s.tempty}>Bugün henüz düello oynanmadı.</div>
      ) : (
        list.map((d, i) => {
          const task = findTask(d.gorev)
          const player = (k: 0 | 1) => (
            <span className={cn(s.dpl, k === 1 && s.dplR, d.kazanan === 1 - k && s.dLoser)}>
              <i className={s.ddot} style={{ '--m': `var(--p${k + 1})` } as CSSProperties} />
              <span>{d.p[k].nick}</span>
              <span className={s.dpts}>{d.p[k].total}</span>
              {d.kazanan === k && <Icon name="crown" aria-label="kazanan" />}
            </span>
          )
          return (
            <div
              key={d.id}
              className={s.dr}
              style={{ '--r': i } as CSSProperties}
              data-testid="duel-row"
              data-winner={d.kazanan}
            >
              <span className={s.tm}>{formatClock(d.zaman)}</span>
              <span className={s.dtk}>
                {task && <Icon name={task.ikon} />}
                {task ? task.kisa : d.gorev}
              </span>
              {player(0)}
              <span className={s.vs2}>{d.kazanan === -1 ? 'BERABERE' : 'VS'}</span>
              {player(1)}
            </div>
          )
        })
      )}
    </div>
  )
}

function Row({
  entry,
  rank,
  order,
  me,
}: {
  entry: ScoreEntry
  rank: number
  order: number
  me?: string
}) {
  const sc = findScenario(entry.senaryo)
  const mine = entry.id === me
  return (
    <div
      className={cn(s.tr2, mine && s.rowMe)}
      style={{ '--r': order } as CSSProperties}
      data-testid="leaderboard-row"
      data-rank={rank}
      data-me={mine}
    >
      <span className={s.rowRank}>{rank}</span>
      <span className={s.iv}>{initialOf(entry.nick)}</span>
      <span className={s.rowName}>
        <span>{entry.nick}</span>
        {mine && <span className={s.tag}>SEN</span>}
        {entry.izin && <Icon name="megaphone" aria-label="paylaşım izni var" />}
      </span>
      <span className={s.sn}>
        {sc && <Icon name={sc.ikon} />}
        <span>{sc ? shortName(sc) : entry.senaryo}</span>
      </span>
      <span className={s.un}>{shortTitle(entry.unvan)}</span>
      <span className={s.tm}>{formatClock(entry.zaman)}</span>
      <span className={s.sc}>{entry.score}</span>
    </div>
  )
}
