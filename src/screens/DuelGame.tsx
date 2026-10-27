import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { Navigate, useNavigate } from 'react-router'
import type { Task } from '@/ai/schemas'
import { sfx } from '@/audio/sfx'
import { ROUTES } from '@/app/routes'
import { useLogoSrc } from '@/app/useLogoSrc'
import { LeaveGameButton } from '@/components/Bits'
import { Icon } from '@/components/Icon'
import { cardOf, findTask } from '@/data/duelBank'
import {
  BOX_SLOTS,
  clearBox,
  insertCard,
  moveCard,
  removeCard,
  slotAt,
  undo,
  type PlayerBoard,
} from '@/game/duelBox'
import { stageRect, toStage } from '@/game/fx'
import { clampToHalf, isPalm, sideOf } from '@/game/touchIsolation'
import { useDuelStore } from '@/stores/duelStore'
import { useUiStore } from '@/stores/uiStore'
import app from '@/styles/app.module.css'
import d from '@/styles/duel.module.css'
import { cn } from '@/utils/cn'
import { formatDuration } from '@/utils/text'

type Side = 0 | 1
type Pair<T> = [T, T]

interface Drag {
  pid: number
  side: Side
  id: string
  from: 'pool' | 'box'
  /** slot index when dragging from the box */
  k: number
  x: number
  y: number
  phone: { x: number; y: number; w: number; h: number }
  slotsTop: number
  key: string
  target: { full: true } | { ins: number } | null
}

const TIMER_C = 2 * Math.PI * 30
const HOLD_MS = 600

/** Live store state; read at event time so the drag handlers never hold a stale snapshot. */
const store = useDuelStore.getState

// Duel 2 · the round: both players drag at the same time on one tablet, each only on their
// own half (document §6.2, §13.5; full prototype §4.1).
export function DuelGame() {
  const phase = useDuelStore((st) => st.phase)
  const task = findTask(useDuelStore((st) => st.taskId))
  if (phase === 'end') return <Navigate to={ROUTES.duelResult} replace />
  if (phase !== 'play' || !task) return <Navigate to={ROUTES.duelIntro} replace />
  return <DuelBoard task={task} />
}

function DuelBoard({ task }: { task: Task }) {
  const navigate = useNavigate()
  const logo = useLogoSrc()
  const names = useDuelStore((st) => st.names)
  const players = useDuelStore((st) => st.players)
  const duration = useDuelStore((st) => st.duration)
  const showToast = useUiStore((st) => st.showToast)

  const [hot, setHot] = useState<Pair<boolean>>([false, false])
  const [target, setTarget] = useState<Pair<number | null>>([null, null])
  const [lifted, setLifted] = useState<
    Pair<{ id: string; from: 'pool' | 'box'; k: number } | null>
  >([null, null])
  const [shake, setShake] = useState<Pair<number>>([0, 0])
  const [newIn, setNewIn] = useState<Pair<string | null>>([null, null])
  const [ghosts, setGhosts] = useState<Pair<{ id: string; x: number; y: number } | null>>([
    null,
    null,
  ])

  const root = useRef<HTMLElement>(null)
  const ghostEls = useRef<Pair<HTMLDivElement | null>>([null, null])
  const timebars = useRef<Pair<HTMLElement | null>>([null, null])
  const arc = useRef<SVGCircleElement>(null)
  const num = useRef<HTMLElement>(null)
  const timerBox = useRef<HTMLDivElement>(null)
  const drags = useRef(new Map<number, Drag>())
  const sideDrag = useRef<Pair<Drag | null>>([null, null])
  const holds = useRef(new Map<number, { side: Side; t0: number; btn: HTMLElement; raf: number }>())
  const startedAt = useRef(0)
  const ended = useRef(false)

  const setPair = <T,>(set: (fn: (p: Pair<T>) => Pair<T>) => void, side: Side, value: T) =>
    set((p) => (side === 0 ? [value, p[1]] : [p[0], value]))
  const half = (side: Side) =>
    root.current?.querySelector<HTMLElement>(`[data-half="${side}"]`) ?? null
  const leftSec = () =>
    Math.max(0, Math.floor(duration - (performance.now() - startedAt.current) / 1000))

  // ---------------------------------------------------------------- end of the round
  const endDuel = () => {
    if (ended.current) return
    ended.current = true
    for (const dr of drags.current.values()) sideDrag.current[dr.side] = null
    drags.current.clear()
    setGhosts([null, null])
    setLifted([null, null])
    ;([0, 1] as const).forEach((p) => store().finishSide(p, 0))
    store().end()
    window.setTimeout(() => void navigate(ROUTES.duelResult), 500)
  }
  const onTimeUp = useEffectEvent(() => endDuel())

  // ---------------------------------------------------------------- timer
  useEffect(() => {
    startedAt.current = performance.now()
    let raf = 0
    let lastSec = -1
    const frame = (now: number) => {
      if (ended.current) return
      const left = Math.max(0, duration - (now - startedAt.current) / 1000)
      if (arc.current) arc.current.style.strokeDashoffset = String(TIMER_C * (1 - left / duration))
      const sec = Math.ceil(left)
      if (num.current) num.current.textContent = formatDuration(sec)
      // Renk Paleti: ink → gold in the last 20 s → brick red in the last 10 s
      timerBox.current?.classList.toggle(d.dtimerWarn, left <= 20 && left > 10)
      timerBox.current?.setAttribute('data-warn', String(left <= 20 && left > 10))
      timerBox.current?.classList.toggle(d.dtimerLow, left <= 10)
      timerBox.current?.setAttribute('data-low', String(left <= 10))
      const boards = store().players
      ;([0, 1] as const).forEach((p) => {
        const bar = timebars.current[p]
        if (bar && !boards[p].done) bar.style.transform = `scaleX(${left / duration})`
      })
      if (sec !== lastSec) {
        lastSec = sec
        if (sec <= 10 && sec > 0) sfx.tick(sec <= 3)
      }
      if (left <= 0) return onTimeUp()
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [duration])

  // ---------------------------------------------------------------- drag and drop
  const flyGhost = (side: Side, to: Element | null | undefined, ok: boolean) => {
    const el = ghostEls.current[side]
    if (!el || !to) return setPair(setGhosts, side, null)
    const r = stageRect(to)
    const anim = el.animate(
      [
        { transform: el.style.transform },
        {
          transform: `translate(${r.x + r.w / 2 - 48}px, ${r.y + r.h / 2 - 48}px) rotate(0deg) scale(${ok ? 0.55 : 0.9})`,
          opacity: ok ? 0.2 : 0.6,
        },
      ],
      { duration: ok ? 180 : 250, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' },
    )
    anim.onfinish = () => setPair(setGhosts, side, null)
  }

  const dropTarget = (dr: Drag, board: PlayerBoard): Drag['target'] => {
    const r = dr.phone
    const inside =
      dr.x > r.x - 24 && dr.x < r.x + r.w + 24 && dr.y > r.y - 10 && dr.y < r.y + r.h + 10
    if (!inside) return null
    const idx = slotAt(dr.y - dr.slotsTop - 10)
    if (dr.from === 'pool')
      return board.box.length >= BOX_SLOTS
        ? { full: true }
        : { ins: Math.min(idx, board.box.length) }
    return { ins: Math.min(idx, board.box.length - 1) }
  }

  const moveDrag = (dr: Drag, clientX: number, clientY: number) => {
    const s = toStage(clientX, clientY)
    const p = clampToHalf(dr.side, s.x, s.y)
    dr.x = p.x
    dr.y = p.y
    const el = ghostEls.current[dr.side]
    if (el)
      el.style.transform = `translate(${p.x - 48}px, ${p.y - 48}px) rotate(${dr.side ? 4 : -4}deg) scale(1.06)`
    const board = store().players[dr.side]
    const t = dropTarget(dr, board)
    const key = !t ? 'none' : 'full' in t ? 'full' : `i${t.ins}`
    dr.target = t
    if (key === dr.key) return
    dr.key = key
    setPair(setHot, dr.side, !!t)
    setPair(setTarget, dr.side, t && !('full' in t) && dr.from === 'pool' ? board.box.length : null)
  }

  const beginDrag = (side: Side, el: HTMLElement, e: ReactPointerEvent) => {
    const h = half(side)
    const phone = h?.querySelector('[data-phone]')
    const slots = h?.querySelector('[data-slots]')
    if (!phone || !slots) return
    const p = toStage(e.clientX, e.clientY)
    const dr: Drag = {
      pid: e.pointerId,
      side,
      id: el.dataset.card ?? '',
      from: el.dataset.from === 'box' ? 'box' : 'pool',
      k: Number(el.dataset.k ?? -1),
      x: p.x,
      y: p.y,
      phone: stageRect(phone),
      slotsTop: stageRect(slots).y,
      key: '',
      target: null,
    }
    drags.current.set(e.pointerId, dr)
    sideDrag.current[side] = dr
    setPair(setGhosts, side, { id: dr.id, x: p.x, y: p.y })
    setPair(setLifted, side, { id: dr.id, from: dr.from, k: dr.k })
    sfx.lift()
    moveDrag(dr, e.clientX, e.clientY)
  }

  const endDrag = (dr: Drag, cancel: boolean) => {
    drags.current.delete(dr.pid)
    sideDrag.current[dr.side] = null
    setPair(setHot, dr.side, false)
    setPair(setTarget, dr.side, null)
    setPair(setLifted, dr.side, null)
    const board = store().players[dr.side]
    if (ended.current || board.done) return setPair(setGhosts, dr.side, null)
    const h = half(dr.side)
    const tile = h?.querySelector(`[data-from="pool"][data-card="${dr.id}"]`)
    const t = cancel ? null : dr.target
    if (t && 'full' in t) {
      setShake((s) => (dr.side === 0 ? [s[0] + 1, s[1]] : [s[0], s[1] + 1]))
      sfx.error()
      showToast('smartphone', '8 slot dolu — önce bir kartı çıkar')
      return flyGhost(dr.side, tile, false)
    }
    if (t) {
      const next =
        dr.from === 'pool' ? insertCard(board, dr.id, t.ins) : moveCard(board, dr.k, t.ins)
      if (!next) return flyGhost(dr.side, tile, false)
      const index = next.box.indexOf(dr.id)
      const slot = h?.querySelector(`[data-slot-index="${index}"]`)
      store().setBoard(dr.side, next)
      setPair(setNewIn, dr.side, dr.id)
      sfx.drop()
      return flyGhost(dr.side, slot, true)
    }
    if (dr.from === 'box') {
      store().setBoard(dr.side, removeCard(board, dr.k))
      sfx.slideBack()
    }
    flyGhost(dr.side, tile, false)
  }

  // ---------------------------------------------------------------- Finish (hold 0.6 s)
  const finish = (side: Side) => {
    const board = store().players[side]
    if (board.done || ended.current) return
    const dr = sideDrag.current[side]
    if (dr) {
      drags.current.delete(dr.pid)
      sideDrag.current[side] = null
      setPair(setGhosts, side, null)
      setPair(setLifted, side, null)
    }
    store().finishSide(side, leftSec())
    sfx.finishSide()
    const both = store().players.every((pl) => pl.done)
    if (both) window.setTimeout(() => endDuel(), 700)
  }

  const startHold = (side: Side, e: ReactPointerEvent, btn: HTMLElement) => {
    if ([...holds.current.values()].some((h) => h.side === side)) return
    e.preventDefault()
    const h = { side, t0: performance.now(), btn, raf: 0 }
    holds.current.set(e.pointerId, h)
    sfx.holdStart()
    const step = (now: number) => {
      if (holds.current.get(e.pointerId) !== h) return
      const p = Math.min(1, (now - h.t0) / HOLD_MS)
      btn.style.setProperty('--hp', String(p))
      if (p >= 1) {
        holds.current.delete(e.pointerId)
        btn.style.setProperty('--hp', '0')
        return finish(side)
      }
      h.raf = requestAnimationFrame(step)
    }
    h.raf = requestAnimationFrame(step)
  }

  const stopHold = (pid: number) => {
    const h = holds.current.get(pid)
    if (!h) return
    holds.current.delete(pid)
    cancelAnimationFrame(h.raf)
    h.btn.style.setProperty('--hp', '0')
  }

  // ---------------------------------------------------------------- touch ownership
  const onPointerDown = (e: ReactPointerEvent) => {
    if (ended.current) return
    const p = toStage(e.clientX, e.clientY)
    const side = sideOf(p.x)
    if (side === -1) return // dead zone
    if (isPalm(e)) return // palm or wrist
    if (store().players[side].done) return
    const el = e.target as HTMLElement
    const hold = el.closest<HTMLElement>('[data-hold]')
    if (hold) {
      if (Number(hold.dataset.hold) === side) startHold(side, e, hold)
      return
    }
    const card = el.closest<HTMLElement>('[data-card]')
    if (!card || Number(card.dataset.side) !== side) return // only your own half's cards
    if (sideDrag.current[side]) return // one finger per player
    e.preventDefault()
    beginDrag(side, card, e)
  }

  const onWindowMove = useEffectEvent((e: PointerEvent) => {
    const dr = drags.current.get(e.pointerId)
    if (!dr) return
    e.preventDefault()
    moveDrag(dr, e.clientX, e.clientY)
  })
  const onWindowUp = useEffectEvent((e: PointerEvent, cancel: boolean) => {
    const dr = drags.current.get(e.pointerId)
    if (dr) endDrag(dr, cancel)
    stopHold(e.pointerId)
  })
  useEffect(() => {
    const move = (e: PointerEvent) => onWindowMove(e)
    const up = (e: PointerEvent) => onWindowUp(e, false)
    const cancel = (e: PointerEvent) => onWindowUp(e, true)
    window.addEventListener('pointermove', move, { passive: false })
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
    }
  }, [])

  const act = (side: Side, op: 'undo' | 'clear') => {
    const board = store().players[side]
    if (board.done || ended.current || sideDrag.current[side]) return
    if (op === 'undo' && board.hist.length) {
      store().setBoard(side, undo(board))
      sfx.undo()
    } else if (op === 'clear' && board.box.length) {
      store().setBoard(side, clearBox(board))
      sfx.clear()
    }
  }

  return (
    <main className={app.screen} ref={root} data-testid="duel-game" onPointerDown={onPointerDown}>
      <header className={d.dtop}>
        <div className={d.dbrand}>
          <img src={logo} alt="" />
          BuildArena
        </div>
        <div className={d.dtask}>
          <div className={d.dtic}>
            <Icon name={task.ikon} />
          </div>
          <div>
            <div className={d.dtl}>
              <Icon name="clipboard-list" />
              GÖREV <b>#{task.no}</b>
            </div>
            <div className={d.dtt}>{task.baslik}</div>
          </div>
          <div className={d.aud2}>
            {task.hedefKitle.map((a) => (
              <span key={a.ad} className={app.chip}>
                <Icon name={a.ikon} />
                {a.ad}
              </span>
            ))}
          </div>
        </div>
        <div className={d.dmeta}>
          <span className={app.chip}>
            <Icon name="gauge" />
            Orta
          </span>
          <LeaveGameButton className={app.ib} />
        </div>
      </header>

      {([0, 1] as const).map((side) => {
        const board = players[side]
        const n = board.box.length
        const tag = `p${side + 1}`
        return (
          <section
            key={side}
            className={cn(
              d.half,
              side === 0 ? cn(d.p1, d.halfP1) : cn(d.p2, d.halfP2),
              board.done && d.fin,
            )}
            data-half={side}
            data-testid={`${tag}-half`}
          >
            <div className={d.timebar}>
              <i ref={(el) => void (timebars.current[side] = el)} />
            </div>
            <div className={d.hdr}>
              <div className={cn(app.avatar, side === 0 ? app.avatarP1 : app.avatarP2)}>
                {side + 1}
              </div>
              <div className={d.pname}>{names[side]}</div>
              <div className={d.prog}>
                <Icon name="smartphone" />
                <div className={d.bar3}>
                  <i style={{ width: `${(n / BOX_SLOTS) * 100}%` }} />
                </div>
                <b data-testid={`${tag}-count`}>
                  {n}/{BOX_SLOTS}
                </b>
              </div>
            </div>
            <div className={d.dbody}>
              <div className={d.pool}>
                <div className={d.poolH}>
                  <Icon name="layout-grid" />
                  GEREKSİNİMLER
                </div>
                <div className={d.tiles}>
                  {board.pool.map((id) => {
                    const card = cardOf(id)
                    const used = board.box.includes(id)
                    const isLifted = lifted[side]?.from === 'pool' && lifted[side]?.id === id
                    return (
                      <div
                        key={id}
                        className={cn(d.tile, used && d.tileUsed, isLifted && d.tileLifted)}
                        data-card={id}
                        data-side={side}
                        data-from="pool"
                        data-used={used}
                        data-testid={`${tag}-card-${id}`}
                      >
                        {used && (
                          <b className={d.ok}>
                            <Icon name="check" />
                          </b>
                        )}
                        {card.nfr && <span className={d.nfr}>NFR</span>}
                        <div className={d.tic}>
                          <Icon name={card.ikon} />
                        </div>
                        <span>{card.ad}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div
                key={shake[side]}
                className={cn(d.phone, hot[side] && d.phoneHot, shake[side] > 0 && d.phoneFull)}
                data-phone
                data-testid={`${tag}-box`}
              >
                <div className={d.screen2}>
                  <div className={d.sb}>
                    <span>9:41</span>
                    <span className={d.sbR}>
                      <Icon name="signal" />
                      <Icon name="wifi" />
                      <Icon name="battery-full" />
                    </span>
                  </div>
                  <div className={d.appbar}>
                    <Icon name={task.ikon} />
                    Uygulamam<small>{n}/8</small>
                  </div>
                  <div className={d.slots} data-slots>
                    {Array.from({ length: BOX_SLOTS }, (_, k) => {
                      const id = board.box[k]
                      if (!id) {
                        const isTarget = target[side] === k
                        return (
                          <div
                            key={`e${k}`}
                            className={cn(d.slot, d.slotEmpty, isTarget && d.slotTarget)}
                            data-slot-index={k}
                          >
                            <Icon name={isTarget ? 'arrow-down-to-line' : 'plus'} />
                          </div>
                        )
                      }
                      const card = cardOf(id)
                      const isLifted = lifted[side]?.from === 'box' && lifted[side]?.k === k
                      return (
                        <div
                          key={id}
                          className={cn(
                            d.slot,
                            isLifted && d.slotLift,
                            newIn[side] === id && d.slotNew,
                          )}
                          data-card={id}
                          data-side={side}
                          data-from="box"
                          data-k={k}
                          data-slot-index={k}
                          data-testid={`${tag}-slot-${k}`}
                        >
                          <div className={d.sic}>
                            <Icon name={card.ikon} />
                          </div>
                          <span>{card.ad}</span>
                          <Icon name="grip-vertical" className={d.grip} />
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
            <div className={d.dfoot}>
              <button
                type="button"
                className={d.hold}
                data-hold={side}
                data-testid={`${tag}-finish`}
              >
                <Icon name="check" />
                <span>Bitir</span>
              </button>
              <button
                type="button"
                className={d.dib}
                aria-label={`Oyuncu ${side + 1}: geri al`}
                disabled={!board.hist.length}
                data-testid={`${tag}-undo`}
                onClick={() => act(side, 'undo')}
              >
                <Icon name="undo-2" />
              </button>
              <button
                type="button"
                className={d.dib}
                aria-label={`Oyuncu ${side + 1}: temizle`}
                disabled={!n}
                data-testid={`${tag}-clear`}
                onClick={() => act(side, 'clear')}
              >
                <Icon name="trash-2" />
              </button>
            </div>
            <div className={d.lockov} data-testid={board.done ? `${tag}-lock` : undefined}>
              <div className={d.lk}>
                <Icon name="check" />
              </div>
              <b>Bitti!</b>
              <span>
                {board.kalan ?? 0} sn kala · {n}/8 kart
              </span>
            </div>
          </section>
        )
      })}

      <div className={d.ddiv}>
        <div className={d.vs}>VS</div>
      </div>
      <div className={d.dtimer} ref={timerBox} data-testid="duel-timer">
        <svg viewBox="0 0 80 80" aria-hidden="true">
          <circle cx="40" cy="40" r="38" fill="var(--card)" stroke="var(--ink)" strokeWidth="2" />
          <circle cx="40" cy="40" r="30" fill="none" stroke="var(--sunk)" strokeWidth="7" />
          <circle
            ref={arc}
            className={d.arc}
            cx="40"
            cy="40"
            r="30"
            fill="none"
            stroke="var(--ink)"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={TIMER_C}
            strokeDashoffset="0"
          />
        </svg>
        <b ref={num}>{formatDuration(duration)}</b>
      </div>

      {([0, 1] as const).map((side) => {
        const g = ghosts[side]
        if (!g) return null
        const card = cardOf(g.id)
        return (
          <div
            key={`ghost${side}`}
            ref={(el) => {
              ghostEls.current[side] = el
              // first position only; moveDrag() updates it directly while the finger moves
              if (el && !el.style.transform) {
                el.style.transform = `translate(${g.x - 48}px, ${g.y - 48}px) rotate(${side ? 4 : -4}deg) scale(1.06)`
              }
            }}
            className={`duel-ghost duel-ghost-p${side + 1}`}
            data-testid={`p${side + 1}-ghost`}
          >
            <div className="duel-ghost-ic">
              <Icon name={card.ikon} />
            </div>
            <span>{card.ad}</span>
          </div>
        )
      })}
    </main>
  )
}
