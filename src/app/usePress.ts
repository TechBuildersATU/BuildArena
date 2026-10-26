import { useRef, type PointerEvent } from 'react'

/** Double-tap guard (§16.5): presses closer together than `guardMs` run the action once. */
export function usePressGuard(action: (() => void) | undefined, guardMs = 400): () => void {
  const last = useRef(Number.NEGATIVE_INFINITY)
  return () => {
    const now = performance.now()
    if (now - last.current < guardMs) return
    last.current = now
    action?.()
  }
}

/** Press-and-hold (e.g. the logo for 3 s → staff PIN). Releasing early does nothing. */
export function useLongPress(action: () => void, ms: number) {
  const timer = useRef<number | undefined>(undefined)
  const cancel = () => window.clearTimeout(timer.current)
  return {
    onPointerDown: (e: PointerEvent) => {
      e.preventDefault()
      cancel()
      timer.current = window.setTimeout(action, ms)
    },
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onContextMenu: (e: { preventDefault: () => void }) => e.preventDefault(),
  }
}
