import { useEffect } from 'react'
import { ambientButterfly } from './fx'

/** A butterfly drifts across the screen 2.5 s after it opens, then every 11 s. */
export function useAmbientButterfly(): void {
  useEffect(() => {
    const first = window.setTimeout(ambientButterfly, 2500)
    const every = window.setInterval(ambientButterfly, 11000)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(every)
    }
  }, [])
}
