import { useEffect, useEffectEvent } from 'react'

/** IDLE_MS without a touch: home goes into idle mode, results return home (document §5, §6.3). */
export const IDLE_MS = 60_000

/** Calls `onIdle` after `ms` without a touch or key press; any touch restarts the wait. */
export function useIdle(onIdle: () => void, ms = IDLE_MS, enabled = true): void {
  const fire = useEffectEvent(onIdle)
  useEffect(() => {
    if (!enabled) return
    let timer = window.setTimeout(() => fire(), ms)
    const reset = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => fire(), ms)
    }
    document.addEventListener('pointerdown', reset, { capture: true, passive: true })
    document.addEventListener('keydown', reset, { capture: true })
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('pointerdown', reset, { capture: true })
      document.removeEventListener('keydown', reset, { capture: true })
    }
  }, [ms, enabled])
}
