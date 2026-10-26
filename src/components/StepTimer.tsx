import { useEffect, useEffectEvent, useState } from 'react'
import { sfx } from '@/audio/sfx'
import s from '@/styles/app.module.css'
import { cn } from '@/utils/cn'

const CIRCUMFERENCE = 2 * Math.PI * 23

interface StepTimerProps {
  /** performance.now() when the step started; null while stopped */
  startedAt: number | null
  /** seconds shown while stopped */
  frozenLeft: number
  onTimeout: () => void
  /** the step's time limit in seconds */
  limit: number
}

/** 20 s ring: red and pulsing in the last 5 s, with a tick each second (scenario doc §2.1). */
export function StepTimer({ startedAt, frozenLeft, onTimeout, limit }: StepTimerProps) {
  const [running, setRunning] = useState(limit)
  const fireTimeout = useEffectEvent(onTimeout)

  useEffect(() => {
    if (startedAt === null) return
    let raf = 0
    let lastWhole = limit
    const frame = (now: number) => {
      const remaining = Math.max(0, limit - (now - startedAt) / 1000)
      setRunning(remaining)
      const whole = Math.ceil(remaining)
      if (whole !== lastWhole) {
        lastWhole = whole
        if (whole <= 5 && whole > 0) sfx.tick(whole <= 3)
      }
      if (remaining <= 0) {
        fireTimeout()
        return
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [startedAt, limit])

  const left = startedAt === null ? frozenLeft : running
  const low = left <= 5
  return (
    <div
      className={cn(s.timer, low && s.timerLow)}
      data-testid="step-timer"
      data-low={low}
      role="timer"
      aria-label={`Kalan süre ${Math.ceil(left)} saniye`}
    >
      <svg viewBox="0 0 56 56" aria-hidden="true">
        <circle cx="28" cy="28" r="23" fill="var(--card)" stroke="var(--sunk)" strokeWidth="5" />
        <circle
          className={s.arc}
          cx="28"
          cy="28"
          r="23"
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - left / limit)}
        />
      </svg>
      <span className={s.tn}>{Math.ceil(left)}</span>
    </div>
  )
}
