import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { sfx } from '@/audio/sfx'
import { ROUTES } from '@/app/routes'
import { dur, ignoreAbort, sleep } from '@/app/timing'
import { AudioToggles, Logo } from '@/components/Bits'
import { Icon } from '@/components/Icon'
import { findTask } from '@/data/duelBank'
import { useDuelStore } from '@/stores/duelStore'
import { useSettingsStore } from '@/stores/settingsStore'
import app from '@/styles/app.module.css'
import d from '@/styles/duel.module.css'
import { cn } from '@/utils/cn'

const COUNTDOWN = ['3', '2', '1', 'Başla!']

// Duel 1 · task card: task, audience, rules, two nicknames (the dice rolls a new one as often as
// a player likes until they are ready), two "Ready"
// buttons in the players' corners → 3-2-1 → the round (document §6.5).
export function DuelIntro() {
  const navigate = useNavigate()
  const duelSec = useSettingsStore((st) => st.duelSec)
  const { taskId, names, ready, phase, reroll, toggleReady, start } = useDuelStore()
  const [typed, setTyped] = useState<[string | null, string | null]>([null, null])
  const [rolling, setRolling] = useState<[number, number]>([0, 0])
  const [count, setCount] = useState<string | null>(null)
  const started = useRef(false)
  const typing = useRef<[AbortController | null, AbortController | null]>([null, null])

  // a deep link, or coming back from a finished round, starts a new duel (once, on arrival)
  useEffect(() => {
    const s = useDuelStore.getState()
    if (!s.taskId || s.phase === 'play' || s.phase === 'end') s.newDuel()
  }, [])

  // both ready → 3-2-1 → play
  useEffect(() => {
    if (phase !== 'count' || started.current) return
    started.current = true
    const run = new AbortController()
    void (async () => {
      await sleep(dur(350), run.signal)
      for (const [i, n] of COUNTDOWN.entries()) {
        setCount(n)
        if (n.length > 1) sfx.go()
        else sfx.countdown(3 - i)
        await sleep(dur(n.length > 1 ? 560 : 780), run.signal)
      }
      start(duelSec)
      void navigate(ROUTES.duelGame)
    })().catch(ignoreAbort)
    return () => {
      run.abort()
      started.current = false
    }
  }, [phase, duelSec, start, navigate])

  const task = findTask(taskId)
  if (!task) return <main className={app.screen} data-testid="task-card" />

  const doReroll = async (p: 0 | 1) => {
    const next = reroll(p)
    if (!next) return
    // a new roll replaces the name still being typed
    typing.current[p]?.abort()
    const run = new AbortController()
    typing.current[p] = run
    sfx.pick()
    setRolling((r) => (p === 0 ? [r[0] + 1, r[1]] : [r[0], r[1] + 1]))
    for (let i = 1; i <= next.length; i++) {
      if (run.signal.aborted) return
      const part = next.slice(0, i)
      setTyped((t) => (p === 0 ? [part, t[1]] : [t[0], part]))
      sfx.key()
      await new Promise((r) => window.setTimeout(r, dur(35)))
    }
    if (run.signal.aborted) return
    setTyped((t) => (p === 0 ? [null, t[1]] : [t[0], null]))
  }

  return (
    <main className={app.screen} data-testid="task-card" data-task={task.id}>
      <div className={cn(d.floor, d.floorL)} />
      <div className={cn(d.floor, d.floorR)} />
      <header className={cn(app.bar, app.barClear)}>
        <div className={app.brand}>
          <Logo />
          BuildArena
          <span className={app.chip}>
            <Icon name="swords" />
            Düello
          </span>
        </div>
        <div className={app.barR}>
          <AudioToggles />
          <button
            type="button"
            className={app.ib}
            aria-label="Ana ekran"
            data-testid="btn-home"
            onClick={() => {
              sfx.tap()
              void navigate(ROUTES.home)
            }}
          >
            <Icon name="house" />
          </button>
        </div>
      </header>

      <div className={d.dcard}>
        <span className={app.eyebrow} style={{ justifyContent: 'center' }}>
          <Icon name="clipboard-list" />
          GÖREV #{task.no} · ORTA
        </span>
        <div className={d.bigIc}>
          <Icon name={task.ikon} />
        </div>
        <h1 data-testid="task-title">{task.baslik}</h1>
        <p className={d.desc}>{task.aciklama}</p>
        <div className={d.lbl2}>HEDEF KİTLE</div>
        <div className={d.aud}>
          {task.hedefKitle.map((a) => (
            <div key={a.ad} className={d.audItem}>
              <Icon name={a.ikon} />
              {a.ad}
            </div>
          ))}
        </div>
        <div className={d.rules2}>
          <span className={app.chip}>
            <Icon name="layout-grid" />
            14 kart
          </span>
          <span className={app.chip}>
            <Icon name="smartphone" />8 slot
          </span>
          <span className={app.chip}>
            <Icon name="timer" />
            {duelSec} sn
          </span>
          <span className={app.chip}>
            <Icon name="target" />
            100 puan
          </span>
        </div>
      </div>

      {([0, 1] as const).map((p) => (
        <div
          key={p}
          className={cn(d.who, p === 0 ? d.whoP1 : d.whoP2)}
          data-testid={`p${p + 1}-who`}
        >
          <div className={cn(app.avatar, p === 0 ? app.avatarP1 : app.avatarP2)}>{p + 1}</div>
          <span data-testid={`p${p + 1}-name`}>{typed[p] ?? names[p]}</span>
          <button
            key={rolling[p]}
            type="button"
            className={cn(d.rr, rolling[p] > 0 && d.rrRoll)}
            aria-label={`Oyuncu ${p + 1} için yeni ad`}
            disabled={ready[p]}
            data-testid={`p${p + 1}-reroll`}
            onClick={() => void doReroll(p)}
          >
            <Icon name="dices" />
          </button>
          <small style={{ color: ready[p] ? `var(--p${p + 1}-ink)` : undefined }}>
            {ready[p] ? 'Hazır' : 'Bekleniyor…'}
          </small>
        </div>
      ))}
      {([0, 1] as const).map((p) => (
        <button
          key={p}
          type="button"
          className={cn(
            d.ready,
            p === 0 ? cn(d.p1, d.readyP1) : cn(d.p2, d.readyP2),
            ready[p] && d.readyOn,
          )}
          aria-pressed={ready[p]}
          disabled={phase === 'count'}
          data-testid={`p${p + 1}-ready`}
          onClick={() => {
            sfx.ready(p)
            toggleReady(p)
          }}
        >
          <Icon name={ready[p] ? 'circle-check' : 'hand'} />
          <span>{ready[p] ? 'Hazırım' : 'Hazır mısın?'}</span>
        </button>
      ))}
      <div className={d.dstart}>
        <Icon name="hourglass" />
        <span>İki oyuncu da hazır olunca</span>
        <b>3</b>
        <b>2</b>
        <b>1</b>
      </div>

      {count !== null && (
        <div className={app.cd} data-testid="countdown">
          <b key={count} className={cn(app.cdNum, count.length > 1 && app.cdGo)}>
            {count}
          </b>
        </div>
      )}
    </main>
  )
}
