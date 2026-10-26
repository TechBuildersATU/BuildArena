import { useEffect, useState } from 'react'
import { lockoutRemaining, PIN_LENGTH, verifyPin } from '@/app/staffPin'
import { Icon } from '@/components/Icon'
import { sfx } from '@/audio/sfx'
import s from '@/styles/app.module.css'
import { cn } from '@/utils/cn'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'X', '0', 'DEL']

interface PinDialogProps {
  onSuccess: () => void
  onClose: () => void
}

/** 4-digit staff PIN keypad. Wrong PIN shakes the dots; 5 wrong attempts lock it for 5 min. */
export function PinDialog({ onSuccess, onClose }: PinDialogProps) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [lockedMs, setLockedMs] = useState(() => lockoutRemaining())

  useEffect(() => {
    if (lockedMs <= 0) return
    const id = window.setInterval(() => setLockedMs(lockoutRemaining()), 1000)
    return () => window.clearInterval(id)
  }, [lockedMs])

  const check = (value: string) => {
    const result = verifyPin(value)
    if (result === 'ok') {
      sfx.unlock()
      window.setTimeout(onSuccess, 180)
      return
    }
    setError(true)
    sfx.error()
    if (result === 'locked') setLockedMs(lockoutRemaining())
    window.setTimeout(() => {
      setError(false)
      setPin('')
    }, 450)
  }

  const press = (key: string) => {
    sfx.key()
    if (key === 'X') return onClose()
    if (lockedMs > 0 || error) return
    const next = key === 'DEL' ? pin.slice(0, -1) : (pin + key).slice(0, PIN_LENGTH)
    setPin(next)
    // let the fourth dot paint before hashing
    if (next.length === PIN_LENGTH) window.setTimeout(() => check(next), 0)
  }

  const locked = lockedMs > 0

  return (
    <div
      className={s.overlay}
      data-testid="pin-dialog"
      role="dialog"
      aria-modal="true"
      aria-label="Görevli PIN"
    >
      <div className={s.pinbox}>
        <h3>
          <Icon name="lock" />
          Görevli PIN
        </h3>
        {locked ? (
          <p className={s.pinLockMsg} data-testid="pin-locked">
            Çok fazla hatalı deneme. {Math.ceil(lockedMs / 60000)} dakika sonra tekrar dene.
          </p>
        ) : (
          <p>4 haneli görevli PIN&apos;ini gir</p>
        )}
        <div className={cn(s.pdots, error && s.pdotsErr)} data-testid="pin-dots" data-error={error}>
          {Array.from({ length: PIN_LENGTH }, (_, i) => (
            <i
              key={i}
              className={cn(i < pin.length && s.pdotFilled)}
              data-filled={i < pin.length}
            />
          ))}
        </div>
        <div className={s.pkeys}>
          {KEYS.map((k) => (
            <button
              key={k}
              type="button"
              disabled={locked && k !== 'X'}
              aria-label={k === 'X' ? 'Kapat' : k === 'DEL' ? 'Sil' : k}
              data-testid={k === 'X' ? 'pin-close' : k === 'DEL' ? 'pin-del' : `pin-key-${k}`}
              onClick={() => press(k)}
            >
              {k === 'X' ? <Icon name="x" /> : k === 'DEL' ? <Icon name="delete" /> : k}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
