import { useEffect, useId, useRef } from 'react'
import { useNavigate } from 'react-router'
import { ROUTES } from '@/app/routes'
import { LOGO_HOLD_MS } from '@/app/timing'
import { useLongPress } from '@/app/usePress'
import { sparkBurst } from '@/game/heroSparks'
import h from '@/styles/home.module.css'
import { cn } from '@/utils/cn'
import { LOGO_SRC } from './Bits'

/** The logo's four colours, as text colours so the ring stays readable in the dark theme too. */
const RING_INKS = ['var(--brand-ink)', 'var(--p1-ink)', 'var(--p2-ink)', 'var(--scn-ink)']

interface HeroProps {
  className?: string
  /** idle mode: sparkles twice as often */
  intense?: boolean
  /** hold the logo 3 s → staff PIN (home screen) */
  staffHold?: boolean
}

/**
 * Club logo with the "ATÜ • TECHBUILDERS" ring turning once every 26 s in the logo's four colors,
 * and mini confetti from its sparkly points. The logo artwork itself is never modified.
 */
export function Hero({ className, intense = false, staffHold = false }: HeroProps) {
  const id = useId().replace(/:/g, '')
  const layer = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const hold = useLongPress(() => void navigate(ROUTES.admin), LOGO_HOLD_MS)

  useEffect(() => {
    let i = 0
    const timer = window.setInterval(() => {
      if (!layer.current) return
      sparkBurst(layer.current, i)
      if (intense) sparkBurst(layer.current, i + 2)
      i += 1
    }, 1200)
    return () => window.clearInterval(timer)
  }, [intense])

  return (
    <div className={cn(h.hero, className)} data-testid="hero">
      <svg className={h.ring} viewBox="0 0 384 384" aria-hidden="true">
        <defs>
          <path id={`circ${id}`} d="M192,192 m-172,0 a172,172 0 1,1 344,0 a172,172 0 1,1 -344,0" />
          <linearGradient id={`tg${id}`} x1="0" y1="0" x2="1" y2="1">
            {RING_INKS.map((color, i) => (
              <stop key={color} offset={i / (RING_INKS.length - 1)} stopColor={color} />
            ))}
          </linearGradient>
        </defs>
        <text fontSize="17" fill={`url(#tg${id})`}>
          <textPath href={`#circ${id}`} textLength="1075" lengthAdjust="spacing">
            ATÜ • TECHBUILDERS • ATÜ • TECHBUILDERS • ATÜ • TECHBUILDERS •{' '}
          </textPath>
        </text>
      </svg>
      <div className={h.logo} {...(staffHold ? hold : {})}>
        <img
          src={LOGO_SRC}
          alt="ATÜ TechBuilders logosu"
          data-testid={staffHold ? 'hero-logo' : undefined}
        />
        <div className={h.confetti} ref={layer} />
      </div>
    </div>
  )
}
