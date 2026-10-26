import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { sfx } from '@/audio/sfx'
import { ROUTES } from '@/app/routes'
import { dur, ignoreAbort, prefersReducedMotion, sleep } from '@/app/timing'
import { useIdle } from '@/app/useIdle'
import { usePressGuard } from '@/app/usePress'
import { SocialButton } from '@/components/Bits'
import { Icon } from '@/components/Icon'
import { findTask } from '@/data/duelBank'
import { confetti, countUp, typewrite } from '@/game/fx'
import { DUEL_RULES } from '@/game/scoring'
import { useDuelStore, type DuelResult as Result, type PlayerResult } from '@/stores/duelStore'
import app from '@/styles/app.module.css'
import d from '@/styles/duel.module.css'
import { cn } from '@/utils/cn'

const RING_C = 2 * Math.PI * 80
const T0 = 1400

// Duel 3 · results: each half shows its score ring, the breakdown, the funny title (stamped)
// and the jury comment (typed); crown and confetti for the winner (document §6.5).
export function DuelResult() {
  const result = useDuelStore((st) => st.result)
  const task = findTask(useDuelStore((st) => st.taskId))
  if (!result || !task) return <Navigate to={ROUTES.duelIntro} replace />
  return <ResultView result={result} taskTitle={task.baslik} taskIcon={task.ikon} />
}

function ResultView({
  result,
  taskTitle,
  taskIcon,
}: {
  result: Result
  taskTitle: string
  taskIcon: string
}) {
  const navigate = useNavigate()
  const names = useDuelStore((st) => st.names)

  useIdle(() => void navigate(ROUTES.home))

  useEffect(() => {
    if (result.win === -1) {
      const id = window.setTimeout(() => sfx.tie(), dur(T0 + 300))
      return () => window.clearTimeout(id)
    }
    const x0 = result.win === 0 ? 0 : 652
    const id = window.setTimeout(
      () => {
        confetti(70, x0, x0 + 628)
        sfx.win()
      },
      dur(T0 + 300),
    )
    return () => window.clearTimeout(id)
  }, [result.win])

  const home = usePressGuard(() => {
    sfx.tap()
    void navigate(ROUTES.home)
  })
  const board = usePressGuard(() => {
    sfx.tap()
    void navigate(`${ROUTES.leaderboard}?sekme=duel`)
  })

  return (
    <main className={app.screen} data-testid="duel-result" data-winner={result.win}>
      <header className={d.rtop}>
        <div className={d.rtopT}>
          <Icon name="trophy" />
          Sonuçlar
        </div>
        <span className={app.chip}>
          <Icon name={taskIcon} />
          {taskTitle}
        </span>
      </header>
      {([0, 1] as const).map((side) => (
        <ResultHalf key={side} side={side} name={names[side]} x={result.r[side]} win={result.win} />
      ))}
      <div className={d.rdiv} />
      <div className={d.rbottom}>
        {/* No rematch at the booth: a finished pair makes room for the next visitors. */}
        <button
          type="button"
          className={cn(app.btn, app.btnInk)}
          data-testid="btn-home"
          onClick={home}
        >
          <Icon name="house" />
          Ana Menü
        </button>
        <button type="button" className={app.btn} data-testid="btn-leaderboard" onClick={board}>
          <Icon name="trophy" />
          Günün Liderleri
        </button>
        <SocialButton />
      </div>
    </main>
  )
}

interface HalfProps {
  side: 0 | 1
  name: string
  x: PlayerResult
  win: 0 | 1 | -1
}

function ResultHalf({ side, name, x, win }: HalfProps) {
  const [barsIn, setBarsIn] = useState(false)
  const [stamped, setStamped] = useState(false)
  const [badge, setBadge] = useState(false)
  const arc = useRef<SVGCircleElement>(null)
  const num = useRef<HTMLElement>(null)
  const comment = useRef<HTMLParagraphElement>(null)
  const tag = `p${side + 1}`

  const parts = [
    { icon: 'users', label: 'Hedef kitle uyumu', value: x.uyum, max: DUEL_RULES.coverage },
    { icon: 'target', label: 'İsabet', value: x.isabet, max: DUEL_RULES.precision },
    { icon: 'link-2', label: 'Birleşimler', value: x.birlesim, max: DUEL_RULES.combos },
    { icon: 'timer', label: 'Hız bonusu', value: x.hiz, max: DUEL_RULES.speed },
  ]

  useEffect(() => {
    const run = new AbortController()
    const { signal } = run
    void (async () => {
      const end = RING_C * (1 - x.total / 100)
      if (arc.current) {
        if (prefersReducedMotion()) arc.current.style.strokeDashoffset = String(end)
        else {
          const el = arc.current
          el.animate([{ strokeDashoffset: RING_C }, { strokeDashoffset: end }], {
            duration: dur(T0),
            easing: 'cubic-bezier(.2,.8,.2,1)',
            fill: 'forwards',
          })
            .finished.then(() => (el.style.strokeDashoffset = String(end)))
            .catch(() => {})
        }
      }
      window.setTimeout(() => !signal.aborted && setBarsIn(true), dur(300))
      if (num.current) await countUp(num.current, x.total, dur(T0), signal, sfx.countTick)
      await sleep(dur(150), signal)
      setStamped(true)
      if (side === 0) sfx.stamp()
      await sleep(dur(150), signal)
      setBadge(true)
      await sleep(dur(400), signal)
      if (comment.current) await typewrite(comment.current, x.yorum, dur(18), signal)
    })().catch(ignoreAbort)
    return () => run.abort()
  }, [x, side])

  return (
    <section
      className={cn(d.rhalf, side === 0 ? cn(d.p1, d.rhalfP1) : cn(d.p2, d.rhalfP2))}
      data-testid={`${tag}-result`}
      data-score={x.total}
    >
      <div className={d.hdr2}>
        <div className={cn(app.avatar, side === 0 ? app.avatarP1 : app.avatarP2)}>{side + 1}</div>
        <div className={d.pname}>{name}</div>
        {win === side && (
          <div className={cn(d.win, badge && d.winOn)} data-testid={`${tag}-winner`}>
            <Icon name="crown" />
            Kazanan
          </div>
        )}
        {win === -1 && (
          <div className={cn(d.win, d.winTie, badge && d.winOn)} data-testid={`${tag}-tie`}>
            <Icon name="equal" />
            Berabere
          </div>
        )}
      </div>
      <div className={d.nick2}>
        <small>
          <Icon name="tag" />
          LAKABIN
        </small>
        <b className={cn(stamped && d.stampOn)} data-testid={`${tag}-title`}>
          “{x.lakap}”
        </b>
      </div>
      <div className={d.srow}>
        <div className={d.ring2}>
          <svg viewBox="0 0 188 188" aria-hidden="true">
            <circle cx="94" cy="94" r="80" fill="none" stroke="var(--card)" strokeWidth="14" />
            <circle cx="94" cy="94" r="88" fill="none" stroke="var(--ink)" strokeWidth="2" />
            <circle cx="94" cy="94" r="72" fill="var(--card)" stroke="var(--ink)" strokeWidth="2" />
            <circle
              ref={arc}
              cx="94"
              cy="94"
              r="80"
              fill="none"
              stroke="var(--pci)"
              strokeWidth="14"
              strokeLinecap="butt"
              strokeDasharray={RING_C}
              strokeDashoffset={RING_C}
            />
          </svg>
          <div className={d.ringV}>
            <b ref={num} data-testid={`${tag}-score`}>
              0
            </b>
            <small>/ 100</small>
          </div>
        </div>
        <div className={d.bd}>
          {parts.map((part, k) => (
            <div key={part.label} className={d.brow} data-testid={`${tag}-part-${k}`}>
              <div className={d.ri}>
                <Icon name={part.icon} />
              </div>
              <span>{part.label}</span>
              <em>
                {part.value}/{part.max}
              </em>
              <div className={d.tr3}>
                <i
                  style={
                    {
                      '--delay': `${k * 150}ms`,
                      ...(barsIn ? { transform: `scaleX(${part.value / part.max})` } : {}),
                    } as CSSProperties
                  }
                />
              </div>
            </div>
          ))}
          {x.ceza < 0 && (
            <div className={cn(d.brow, d.browPenalty)} data-testid={`${tag}-penalty`}>
              <div className={d.ri}>
                <Icon name="ban" />
              </div>
              <span>Tuzak cezası · {x.traps.length} kart</span>
              <em>{x.ceza}</em>
            </div>
          )}
        </div>
      </div>
      <div className={d.bubble}>
        <small>
          <Icon name="message-circle" />
          JÜRİ YORUMU
        </small>
        <p ref={comment} data-testid={`${tag}-comment`} />
      </div>
    </section>
  )
}
