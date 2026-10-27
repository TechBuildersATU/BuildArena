import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from 'react'
import { useLocation, useNavigate } from 'react-router'
import { sfx } from '@/audio/sfx'
import { markTutorialSeen } from '@/app/firstLaunch'
import { ROUTES } from '@/app/routes'
import { prefersReducedMotion } from '@/app/timing'
import { useLogoSrc } from '@/app/useLogoSrc'
import { Hero } from '@/components/Hero'
import { Icon } from '@/components/Icon'
import tutorial from '@/data/tutorial.json'
import { useSettingsStore } from '@/stores/settingsStore'
import app from '@/styles/app.module.css'
import h from '@/styles/home.module.css'
import { cn } from '@/utils/cn'

const SLIDES = tutorial.slaytlar
const SWIPE_PX = 60
/** how long the slide that was just left stays on screen while it slides out (ms) */
const LEAVE_MS = 460

// First-launch tutorial: 5 slides, segmented slide bar, Skip / Back / Next, swipe, hold to pause,
// auto-advance (document §4). With `state.loop` it cycles silently on the idle screen and the
// first touch goes home.
export function Onboarding() {
  const navigate = useNavigate()
  const logo = useLogoSrc()
  const loop = (useLocation().state as { loop?: boolean } | null)?.loop === true
  const [index, setIndex] = useState(0)
  /** the slide sliding out, and to which side (-1 left for Next, 1 right for Back) */
  const [leaving, setLeaving] = useState<{ i: number; to: -1 | 1 } | null>(null)
  const [held, setHeld] = useState(false)
  const swipeX = useRef<number | null>(null)
  /** ms left on the current slide; kept while the slide is held */
  const remaining = useRef(SLIDES[0].sure * 1000)
  const autoAdvance = loop || !prefersReducedMotion()

  const finish = () => {
    markTutorialSeen()
    void navigate(ROUTES.home, { replace: true })
  }
  const go = (to: number, forward = to > index) => {
    const i = Math.max(0, Math.min(SLIDES.length - 1, to))
    if (i === index) return
    setLeaving({ i: index, to: forward ? -1 : 1 })
    setIndex(i)
  }
  const next = () => {
    if (index === SLIDES.length - 1) {
      if (loop) go(0, true)
      else finish()
    } else go(index + 1)
  }

  // the slide that was left keeps its picture while it slides out, then rests out of sight
  useEffect(() => {
    if (!leaving) return
    const id = window.setTimeout(() => setLeaving(null), LEAVE_MS)
    return () => window.clearTimeout(id)
  }, [leaving])

  // auto-advance: each slide stays for its own duration; holding pauses it
  const advance = useEffectEvent(() => {
    if (index < SLIDES.length - 1) go(index + 1)
    else if (loop) go(0, true)
  })
  useEffect(() => {
    remaining.current = SLIDES[index].sure * 1000
  }, [index])
  useEffect(() => {
    if (!autoAdvance || held) return
    const started = performance.now()
    const id = window.setTimeout(advance, remaining.current)
    return () => {
      window.clearTimeout(id)
      remaining.current = Math.max(0, remaining.current - (performance.now() - started))
    }
  }, [index, held, autoAdvance, loop])

  const onDown = (e: PointerEvent) => {
    swipeX.current = e.clientX
    setHeld(true)
  }
  const onUp = (e: PointerEvent) => {
    if (swipeX.current === null) return
    const scale = e.currentTarget.getBoundingClientRect().width / 1280 || 1
    const dx = (e.clientX - swipeX.current) / scale
    swipeX.current = null
    setHeld(false)
    if (dx < -SWIPE_PX && index < SLIDES.length - 1) {
      sfx.tap()
      go(index + 1)
    } else if (dx > SWIPE_PX && index > 0) {
      sfx.tap()
      go(index - 1)
    }
  }

  const last = index === SLIDES.length - 1
  return (
    <main
      className={cn(app.screen, held && h.paused)}
      data-testid="onboarding"
      data-slide={index + 1}
      data-loop={loop}
      onPointerDownCapture={loop ? finish : undefined}
    >
      <div className={h.tbar}>
        <img className={h.logoSm} src={logo} alt="" />
        <span className={h.club}>ATÜ TECHBUILDERS</span>
        <div className={h.segs}>
          {SLIDES.map((sl, i) => (
            <button
              key={sl.etiket}
              type="button"
              className={cn(h.seg, i < index && h.segDone, i === index && autoAdvance && h.segCur)}
              style={{ '--dur': `${sl.sure}s` } as CSSProperties}
              aria-label={`Slayt ${i + 1}`}
              aria-current={i === index}
              data-testid={`tutorial-seg-${i + 1}`}
              onClick={() => {
                sfx.tap()
                go(i)
              }}
            >
              <i key={i === index ? `cur-${index}` : 'idle'} />
            </button>
          ))}
        </div>
        <button type="button" className={h.skip} data-testid="tutorial-skip" onClick={finish}>
          Atla <Icon name="skip-forward" />
        </button>
      </div>

      <div className={h.tslides} onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={onUp}>
        {SLIDES.map((sl, i) => {
          const out = leaving?.i === i
          return (
            <div
              key={sl.etiket}
              className={cn(
                h.tslide,
                (i === index || out) && h.tslideOn,
                out && (leaving.to < 0 ? h.tslideOutL : h.tslideOutR),
                i < index && !out && h.tslideLeft,
              )}
              aria-hidden={i !== index}
              data-testid={`tutorial-slide-${i + 1}`}
              data-state={i === index ? 'on' : out ? 'out' : 'rest'}
            >
              <div className={h.tvis}>{(i === index || out) && <SlideVisual index={i} />}</div>
              <div className={h.ttxt}>
                <div className={h.eyebrow}>
                  {i + 1} / 5 · {sl.etiket}
                </div>
                <h2>
                  {sl.baslik} <span>{sl.vurgu}</span>
                </h2>
                <p>{sl.metin}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className={h.tnav}>
        <button
          type="button"
          className={cn(app.btn, h.tnavBtn, index === 0 && h.hide)}
          data-testid="tutorial-prev"
          disabled={index === 0}
          onClick={() => {
            sfx.tap()
            go(index - 1)
          }}
        >
          <Icon name="chevron-left" />
          Geri
        </button>
        <div className={h.tdots} data-testid="tutorial-counter">
          {SLIDES.map((sl, i) => (
            <i key={sl.etiket} className={cn(i === index && h.tdotOn)} />
          ))}
          <span>
            {index + 1} / {SLIDES.length}
          </span>
        </div>
        <button
          type="button"
          className={cn(app.btn, app.btnPri, h.tnavBtn)}
          data-testid={last ? 'tutorial-letsgo' : 'tutorial-next'}
          onClick={() => {
            sfx.tap()
            next()
          }}
        >
          {last ? 'Hadi Başlayalım' : 'İleri'}
          <Icon name={last ? 'rocket' : 'chevron-right'} />
        </button>
      </div>
    </main>
  )
}

function SlideVisual({ index }: { index: number }) {
  const duelSec = useSettingsStore((st) => st.duelSec)
  switch (index) {
    case 0:
      return (
        <>
          <div className={cn(h.miniMode, h.miniModeD)}>
            <div className={h.mi}>
              <Icon name="swords" />
            </div>
            <div>
              <b>Düello</b>
              <small>2 oyuncu · {duelSec} sn</small>
            </div>
          </div>
          <div className={h.tHero}>
            <Hero />
          </div>
          <div className={cn(h.miniMode, h.miniModeS)}>
            <div className={h.mi}>
              <Icon name="route" />
            </div>
            <div>
              <b>Senaryo</b>
              <small>1 oyuncu · 5 adım</small>
            </div>
          </div>
        </>
      )
    case 1:
      return (
        <>
          <div className={h.taskc}>
            <div className={h.taskIc}>
              <Icon name="hospital" />
            </div>
            <b>Hastane Bilgi Yönetim Sistemi</b>
            <div className={h.taskAud}>
              {(
                [
                  ['user', 'Hasta'],
                  ['stethoscope', 'Doktor'],
                  ['heart-pulse', 'Hemşire'],
                ] as const
              ).map(([icon, label]) => (
                <span key={label} className={h.chip}>
                  <Icon name={icon} />
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div className={h.verdicts}>
            {(
              [
                ['calendar-plus', 'Randevu Al', true],
                ['lock', 'Veri Şifreleme', true],
                ['shopping-cart', 'Sepet', false],
              ] as const
            ).map(([icon, label, ok]) => (
              <div key={label} className={cn(h.vd, ok ? h.vdOk : h.vdNo)}>
                <span className={h.vi}>
                  <Icon name={icon} />
                </span>
                {label}
                <span className={h.vk}>
                  <Icon name={ok ? 'check' : 'x'} />
                </span>
              </div>
            ))}
          </div>
        </>
      )
    case 2:
      return (
        <div className={h.tduel}>
          <div className={h.tpool}>
            {(
              [
                ['calendar-plus', 'Randevu Al', true],
                ['shopping-cart', 'Sepet', false],
                ['pill', 'E-Reçete', false],
                ['lock', 'Veri Şifreleme', false],
                ['flask-conical', 'Tahlil', false],
                ['gift', 'Sadakat', false],
              ] as const
            ).map(([icon, label, src]) => (
              <div key={label} className={cn(h.tt, src && h.ttSrc)}>
                <div className={h.tic}>
                  <Icon name={icon} />
                </div>
                {label}
              </div>
            ))}
            <div className={h.flyer}>
              <div className={h.tic}>
                <Icon name="calendar-plus" />
              </div>
              Randevu Al
              <i className={h.fing} />
            </div>
          </div>
          <div className={h.tphone}>
            <div className={h.tscr}>
              <div className={h.tsl}>
                <i className={h.tslK}>
                  <Icon name="clipboard-list" />
                </i>
                Hasta Kaydı
              </div>
              <div className={h.tsl}>
                <i className={h.tslK}>
                  <Icon name="key-round" />
                </i>
                Rol Bazlı Erişim
              </div>
              <div className={cn(h.tsl, h.tslT)}>
                <Icon name="arrow-down-to-line" />
              </div>
              <div className={cn(h.tsl, h.tslE)}>
                <Icon name="plus" />
              </div>
              <div className={cn(h.tsl, h.tslE)}>
                <Icon name="plus" />
              </div>
            </div>
          </div>
          <div className={h.tchips}>
            <span className={h.chip}>
              <Icon name="users" />2 oyuncu
            </span>
            <span className={h.chip}>
              <Icon name="timer" />
              {duelSec} sn
            </span>
            <span className={h.chip}>
              <Icon name="smartphone" />8 slot
            </span>
          </div>
        </div>
      )
    case 3:
      return (
        <div className={h.tscen}>
          <div className={h.tchain}>
            {['nfc', 'shield-check', 'database-zap', 'salad', 'zap'].map((icon, i) => (
              <span key={icon} style={{ display: 'contents' }}>
                <div className={h.tn} style={{ animationDelay: `${0.4 + i * 0.7}s` }}>
                  <Icon name={icon} />
                </div>
                {i < 4 && (
                  <div className={h.ts}>
                    <i style={{ animationDelay: `${0.6 + i * 0.7}s` }} />
                  </div>
                )}
              </span>
            ))}
          </div>
          <div className={h.topts}>
            {(
              [
                ['door-open', 'Önce kapı açılsın', false],
                ['shield-check', 'Tek işlemde', true],
                ['moon', 'Gün sonunda toplu', false],
                ['ban', 'Kontrol kaldırılsın', false],
              ] as const
            ).map(([icon, label, best]) => (
              <div key={label} className={best ? h.pickme : h.dimme}>
                <span className={h.tic}>
                  <Icon name={icon} />
                </span>
                {label}
              </div>
            ))}
          </div>
        </div>
      )
    default:
      return (
        <div className={h.tscore}>
          <div className={h.tring}>
            <svg viewBox="0 0 220 220" aria-hidden="true">
              <circle cx="110" cy="110" r="95" fill="none" stroke="var(--card)" strokeWidth="16" />
              <circle cx="110" cy="110" r="104" fill="none" stroke="var(--ink)" strokeWidth="2" />
              <circle
                cx="110"
                cy="110"
                r="86"
                fill="var(--card)"
                stroke="var(--ink)"
                strokeWidth="2"
              />
              <circle
                className={h.tarc}
                cx="110"
                cy="110"
                r="95"
                fill="none"
                stroke="var(--scn-ink)"
                strokeWidth="16"
                strokeLinecap="butt"
              />
            </svg>
            <b>88</b>
            <small>/ 100</small>
          </div>
          <div className={h.trows}>
            {(
              [
                ['var(--gold)', 'A', 'Async Ahtapot', 96, false],
                ['var(--silver)', 'T', 'Turbo Kaplumbağa', 92, false],
                ['var(--bronze)', 'K', 'Sen', 88, true],
              ] as const
            ).map(([medal, initial, nick, score, me], i) => (
              <div key={nick} className={cn(me && h.trowMe)}>
                <span>{i + 1}</span>
                <span className={h.trowM} style={{ '--m': medal } as CSSProperties}>
                  {initial}
                </span>
                {nick}
                <span>{score}</span>
              </div>
            ))}
          </div>
        </div>
      )
  }
}
