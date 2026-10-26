import { useEffect, useState, type ReactNode } from 'react'
import { changePin, checkNewPin, lockoutRemaining, PIN_LENGTH, verifyPin } from '@/app/staffPin'
import { Icon } from '@/components/Icon'
import { sfx } from '@/audio/sfx'
import s from '@/styles/app.module.css'
import { cn } from '@/utils/cn'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'X', '0', 'DEL']

interface Entry {
  /** shakes the dots, then clears them */
  fail: () => void
  clear: () => void
}

/** Digits typed on the keypad; `onFull` gets the four digits once the last dot is painted. */
function usePinEntry(
  onFull: (value: string, entry: Entry) => void,
  onClose: () => void,
  blocked: boolean,
) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)

  const entry: Entry = {
    fail: () => {
      setError(true)
      sfx.error()
      window.setTimeout(() => {
        setError(false)
        setPin('')
      }, 450)
    },
    clear: () => setPin(''),
  }

  const press = (key: string) => {
    sfx.key()
    if (key === 'X') return onClose()
    if (blocked || error) return
    const next = key === 'DEL' ? pin.slice(0, -1) : (pin + key).slice(0, PIN_LENGTH)
    setPin(next)
    // let the fourth dot paint before hashing
    if (next.length === PIN_LENGTH) window.setTimeout(() => onFull(next, entry), 0)
  }

  return { pin, error, press }
}

interface KeypadProps {
  testId: string
  label: string
  icon: string
  message: ReactNode
  pin: string
  error: boolean
  locked?: boolean
  onKey: (key: string) => void
}

function Keypad({ testId, label, icon, message, pin, error, locked = false, onKey }: KeypadProps) {
  return (
    <div
      className={s.overlay}
      data-testid={testId}
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <div className={s.pinbox}>
        <h3>
          <Icon name={icon} />
          {label}
        </h3>
        {message}
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
              onClick={() => onKey(k)}
            >
              {k === 'X' ? <Icon name="x" /> : k === 'DEL' ? <Icon name="delete" /> : k}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

interface PinDialogProps {
  onSuccess: () => void
  onClose: () => void
}

/** 4-digit staff PIN keypad. Wrong PIN shakes the dots; 5 wrong attempts lock it for 5 min. */
export function PinDialog({ onSuccess, onClose }: PinDialogProps) {
  const [lockedMs, setLockedMs] = useState(() => lockoutRemaining())
  const locked = lockedMs > 0

  useEffect(() => {
    if (lockedMs <= 0) return
    const id = window.setInterval(() => setLockedMs(lockoutRemaining()), 1000)
    return () => window.clearInterval(id)
  }, [lockedMs])

  const entry = usePinEntry(
    (value, { fail }) => {
      const result = verifyPin(value)
      if (result === 'ok') {
        sfx.unlock()
        window.setTimeout(onSuccess, 180)
        return
      }
      fail()
      if (result === 'locked') setLockedMs(lockoutRemaining())
    },
    onClose,
    locked,
  )

  return (
    <Keypad
      testId="pin-dialog"
      label="Görevli PIN"
      icon="lock"
      message={
        locked ? (
          <p className={s.pinLockMsg} data-testid="pin-locked">
            Çok fazla hatalı deneme. {Math.ceil(lockedMs / 60000)} dakika sonra tekrar dene.
          </p>
        ) : (
          <p>4 haneli görevli PIN&apos;ini gir</p>
        )
      }
      pin={entry.pin}
      error={entry.error}
      locked={locked}
      onKey={entry.press}
    />
  )
}

type SetStep = 'new' | 'repeat' | 'mismatch' | 'default' | 'unsaved'

const SET_HINTS: Record<SetStep, string> = {
  new: "Yeni 4 haneli PIN'i gir",
  repeat: "Aynı PIN'i bir kez daha gir",
  mismatch: "PIN'ler eşleşmedi; yeni PIN'i baştan gir",
  default: '1234 herkesin bildiği varsayılan PIN; başka bir PIN seç',
  unsaved: "Bu cihaz PIN'i kaydedemedi; eski PIN geçerli",
}

/**
 * Sets this device's own staff PIN: typed twice on the same keypad. It is kept only on the
 * tablet (staffPin.ts), so the real PIN never appears in the public code.
 */
export function PinSetDialog({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const [step, setStep] = useState<SetStep>('new')
  const [first, setFirst] = useState('')
  const asking = step === 'repeat' ? 'repeat' : 'new'

  const entry = usePinEntry(
    (value, { fail, clear }) => {
      if (asking === 'new') {
        if (checkNewPin(value) !== 'ok') {
          setStep('default')
          fail()
          return
        }
        setFirst(value)
        setStep('repeat')
        clear()
        return
      }
      if (value !== first) {
        setFirst('')
        setStep('mismatch')
        fail()
        return
      }
      if (!changePin(value)) {
        setFirst('')
        setStep('unsaved')
        fail()
        return
      }
      sfx.unlock()
      window.setTimeout(onDone, 180)
    },
    onClose,
    false,
  )

  return (
    <Keypad
      testId="pin-set-dialog"
      label="Yeni görevli PIN"
      icon="key-round"
      message={
        <p
          className={cn(step !== 'new' && step !== 'repeat' && s.pinLockMsg)}
          data-testid="pin-set-hint"
          data-step={step}
        >
          {SET_HINTS[step]}
        </p>
      }
      pin={entry.pin}
      error={entry.error}
      onKey={entry.press}
    />
  )
}
