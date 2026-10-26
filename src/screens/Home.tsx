import { useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { useNavigate } from 'react-router'
import { sfx } from '@/audio/sfx'
import { ROUTES } from '@/app/routes'
import { useIdle } from '@/app/useIdle'
import { usePressGuard } from '@/app/usePress'
import { AudioToggles, SocialButton } from '@/components/Bits'
import { Hero } from '@/components/Hero'
import { Icon } from '@/components/Icon'
import { PinDialog } from '@/components/PinDialog'
import { useScores } from '@/db/database'
import { rankEntries } from '@/game/scoring'
import { useDuelStore } from '@/stores/duelStore'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUiStore } from '@/stores/uiStore'
import app from '@/styles/app.module.css'
import h from '@/styles/home.module.css'
import { cn } from '@/utils/cn'

const MEDAL = ['var(--gold)', 'var(--silver)', 'var(--bronze)']

// Home screen (document §5) and idle mode: after 60 s without a touch the logo grows,
// "Dokun ve oyna" and the day's top 3 appear; the first touch only wakes the screen.
export function Home() {
  const navigate = useNavigate()
  const duelSec = useSettingsStore((st) => st.duelSec)
  const idleTut = useSettingsStore((st) => st.idleTut)
  const newDuel = useDuelStore((st) => st.newDuel)
  const resetScenario = useScenarioStore((st) => st.reset)
  const unlockStaff = useUiStore((st) => st.unlockStaff)
  const scores = useScores()
  const [idle, setIdle] = useState(false)
  const [pinOpen, setPinOpen] = useState(false)
  const swallowClick = useRef(false)

  useIdle(() => {
    if (pinOpen) return
    if (idleTut) void navigate(ROUTES.tutorial, { state: { loop: true } })
    else setIdle(true)
  })

  // the first touch on the idle screen only wakes it up (no accidental mode start)
  const wake = (e: PointerEvent) => {
    if (!idle) return
    e.preventDefault()
    e.stopPropagation()
    swallowClick.current = true
    window.setTimeout(() => (swallowClick.current = false), 600)
    setIdle(false)
    sfx.wake()
  }

  const toDuel = usePressGuard(() => {
    sfx.tap()
    newDuel()
    void navigate(ROUTES.duelIntro)
  })
  const toScenario = usePressGuard(() => {
    sfx.tap()
    resetScenario()
    void navigate(ROUTES.scenarioNickname)
  })
  const top = rankEntries(scores ?? []).slice(0, 3)

  return (
    <main
      className={cn(app.screen, idle && h.idle)}
      data-testid="home"
      data-idle={idle}
      onPointerDownCapture={wake}
      onClickCapture={(e) => {
        if (swallowClick.current) {
          e.preventDefault()
          e.stopPropagation()
          swallowClick.current = false
        }
      }}
    >
      <Traces />
      <div className={h.homeClub}>ATÜ TECHBUILDERS · COMMUNITY</div>
      <div className={h.icons}>
        <AudioToggles />
        <button
          type="button"
          className={app.ib}
          aria-label="Skor tablosu"
          data-testid="btn-leaderboard"
          onClick={() => {
            sfx.tap()
            void navigate(ROUTES.leaderboard)
          }}
        >
          <Icon name="trophy" />
        </button>
        <button
          type="button"
          className={app.ib}
          aria-label="Nasıl oynanır"
          data-testid="btn-howto"
          onClick={() => {
            sfx.tap()
            void navigate(ROUTES.tutorial)
          }}
        >
          <Icon name="info" />
        </button>
        <button
          type="button"
          className={app.ib}
          aria-label="Ayarlar"
          data-testid="btn-settings"
          onClick={() => {
            sfx.tap()
            setPinOpen(true)
          }}
        >
          <Icon name="settings" />
        </button>
      </div>

      <Hero className={h.homeHero} intense={idle} staffHold />
      <div className={h.htitle}>
        Build<span>Arena</span>
      </div>
      <div className={h.htag}>
        <span>
          <Icon name="users" />
          Hedef kitleyi anla
        </span>
        <span>
          <Icon name="hand" />
          Sürükle
        </span>
        <span>
          <Icon name="trophy" />
          Kazan
        </span>
      </div>

      <div className={h.modes}>
        <button
          type="button"
          className={cn(h.mode, h.modeDuel)}
          data-testid="btn-duel"
          onClick={toDuel}
        >
          <div className={h.modeIc}>
            <Icon name="swords" />
          </div>
          <div>
            <h3>Düello</h3>
            <div className={h.modeMeta}>
              <span className={app.chip}>
                <Icon name="users" />2 oyuncu
              </span>
              <span className={app.chip} data-testid="home-duel-sec">
                <Icon name="timer" />
                {duelSec} sn
              </span>
            </div>
          </div>
          <div className={h.modeGo}>
            <Icon name="chevron-right" />
          </div>
        </button>
        <button
          type="button"
          className={cn(h.mode, h.modeScen)}
          data-testid="btn-scenario"
          onClick={toScenario}
        >
          <div className={h.modeIc}>
            <Icon name="route" />
          </div>
          <div>
            <h3>Senaryo</h3>
            <div className={h.modeMeta}>
              <span className={app.chip}>
                <Icon name="user" />1 oyuncu
              </span>
              <span className={app.chip}>
                <Icon name="git-commit-horizontal" />5 adım
              </span>
            </div>
          </div>
          <div className={h.modeGo}>
            <Icon name="chevron-right" />
          </div>
        </button>
      </div>

      <SocialButton className={h.homeSocial} />

      <div className={h.idlebox} aria-hidden={!idle}>
        <div className={h.tapme}>
          <Icon name="hand" />
          Dokun ve oyna
        </div>
        {top.length > 0 && (
          <div className={h.top3tick} data-testid="idle-top3">
            <span>
              <Icon name="trophy" />
              Günün İlk 3&apos;ü
            </span>
            {top.map((e, i) => (
              <span key={e.id}>
                <i style={{ '--m': MEDAL[i] } as CSSProperties}>{i + 1}</i>
                {e.nick} · {e.score}
              </span>
            ))}
          </div>
        )}
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

function Traces() {
  const paths = (a: string, b: string, c: string) => (
    <>
      <g stroke={a}>
        <path d="M0 200 H120 L150 170 H260" />
        <circle cx="266" cy="170" r="5" />
        <path d="M0 236 H180 L210 206 H330" />
        <circle cx="336" cy="206" r="5" />
      </g>
      <g stroke={b}>
        <path d="M60 260 V150 L90 120 H170" />
        <circle cx="176" cy="120" r="5" />
      </g>
      <g stroke={c}>
        <path d="M0 120 H40 L70 90 H110" />
        <circle cx="116" cy="90" r="5" />
      </g>
    </>
  )
  return (
    <>
      <svg
        className={cn(h.traces, h.tracesL)}
        viewBox="0 0 420 260"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        {paths('var(--p2)', 'var(--brand)', 'var(--p1)')}
      </svg>
      <svg
        className={cn(h.traces, h.tracesR)}
        viewBox="0 0 420 260"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        {paths('var(--p1)', 'var(--brand)', 'var(--p2)')}
      </svg>
    </>
  )
}
