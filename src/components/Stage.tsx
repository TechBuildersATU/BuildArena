import { useEffect, useState, type ReactNode } from 'react'
import { useKeyboardLift } from '@/app/keyboard'
import { setFxRoot } from '@/game/fx'
import { useUiStore } from '@/stores/uiStore'
import s from '@/styles/app.module.css'
import { Icon } from './Icon'

const STAGE_W = 1280
const STAGE_H = 800

function fitScale(): number {
  return Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H)
}

/**
 * Fixed 1280×800 stage scaled to fit any tablet, with the shared effects layer and toast. The
 * on-screen keyboard never shrinks it: the stage only slides up if a field would be covered.
 */
export function Stage({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(fitScale)
  const lift = useKeyboardLift()

  useEffect(() => {
    const onResize = () => setScale(fitScale())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <div
      className="stage"
      data-stage
      data-lift={lift}
      style={{ transform: `translate(-50%, -50%) translateY(${-lift}px) scale(${scale})` }}
    >
      {children}
      <div className="stage-fx" ref={setFxRoot} />
      <ToastHost />
    </div>
  )
}

function ToastHost() {
  const toast = useUiStore((st) => st.toast)
  if (!toast) return null
  return (
    <div key={toast.id} className={s.toast} role="status" data-testid="toast">
      <Icon name={toast.icon} />
      {toast.text}
    </div>
  )
}
