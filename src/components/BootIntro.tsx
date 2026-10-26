import { useEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from '@/app/timing'
import { sparkBurst } from '@/game/heroSparks'
import i from '@/styles/intro.module.css'
import { cn } from '@/utils/cn'
import { Hero } from './Hero'

const BUILD = [...'Build']
const ARENA = [...'Arena']

/** How long the opening plays before the curtain lifts, and how long the lift takes (ms). */
const HOLD_MS = 2150
const LIFT_MS = 520

/**
 * The APK's opening: the logo springs in on the paper with its turning ring and sparkles, the
 * name rises letter by letter, four ink bars fill like a loading bar, then the page lifts like a
 * curtain onto the game. A tap skips it.
 */
export function BootIntro({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false)
  const sparks = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const burst = (n: number) => () => {
      if (sparks.current) sparkBurst(sparks.current, n)
    }
    const timers = [
      window.setTimeout(burst(0), 620),
      window.setTimeout(burst(1), 860),
      window.setTimeout(burst(3), 1100),
      window.setTimeout(() => setLeaving(true), prefersReducedMotion() ? 500 : HOLD_MS),
    ]
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [])

  useEffect(() => {
    if (!leaving) return
    const t = window.setTimeout(onDone, LIFT_MS)
    return () => window.clearTimeout(t)
  }, [leaving, onDone])

  return (
    <div
      className={cn(i.intro, leaving && i.leave)}
      data-testid="boot-intro"
      data-leaving={leaving}
      role="status"
      aria-label="BuildArena açılıyor"
      onPointerDown={() => setLeaving(true)}
    >
      <div className={i.logo}>
        <Hero className={i.hero} />
        <div className={i.sparks} ref={sparks} />
      </div>
      <div className={i.word} aria-hidden="true">
        {[...BUILD, ...ARENA].map((ch, n) => (
          <span
            key={n}
            className={cn(n >= BUILD.length && i.arena)}
            style={{ animationDelay: `${0.55 + n * 0.05}s` }}
          >
            {ch}
          </span>
        ))}
      </div>
      <div className={i.tag}>ATÜ TECHBUILDERS · GEREKSİNİM DÜELLOSU · SENARYO</div>
      <div className={i.bars} aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>
    </div>
  )
}
