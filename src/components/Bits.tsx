import { useEffect, useEffectEvent, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router'
import { unlockAudio } from '@/audio/engine'
import { sfx } from '@/audio/sfx'
import { ROUTES } from '@/app/routes'
import '@/app/theme'
import { LOGO_HOLD_MS } from '@/app/timing'
import { useLogoSrc } from '@/app/useLogoSrc'
import { useLongPress } from '@/app/usePress'
import { useSettingsStore } from '@/stores/settingsStore'
import s from '@/styles/app.module.css'
import { cn } from '@/utils/cn'
import { initialOf } from '@/utils/text'
import { ConfirmDialog } from './ConfirmDialog'
import { Icon } from './Icon'

/** The club's Linktree QR (every social media account behind one link). */
export const SOCIAL_QR_SRC = '/social/linktree-qr.png'
export const SOCIAL_URL = 'linktr.ee/atutechbuilders'

/** Dialogs go on the 1280×800 stage, not inside the header that opened them. */
const stageRoot = () => document.querySelector<HTMLElement>('[data-stage]') ?? document.body

/**
 * "Bizi takip et": opens the club's Linktree QR code, so visitors can scan it with their phone
 * (home screen and both result screens).
 */
export function SocialButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        className={cn(s.btn, className)}
        data-testid="btn-social"
        onClick={() => {
          sfx.nav()
          setOpen(true)
        }}
      >
        <Icon name="qr-code" />
        Bizi takip et
      </button>
      {open &&
        createPortal(
          <SocialDialog
            onClose={() => {
              sfx.tap()
              setOpen(false)
            }}
          />,
          stageRoot(),
        )}
    </>
  )
}

function SocialDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div
      className={s.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Sosyal medya hesaplarımız"
      data-testid="social-dialog"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={s.qrbox}>
        <button
          type="button"
          className={cn(s.ib, s.qrClose)}
          aria-label="Kapat"
          data-testid="social-close"
          onClick={onClose}
        >
          <Icon name="x" />
        </button>
        <div className={s.eyebrow}>
          <Icon name="megaphone" />
          ATÜ TECHBUILDERS · SOSYAL MEDYA
        </div>
        <h3>Bizi takip et!</h3>
        <p>Telefonunun kamerasıyla okut; bütün hesaplarımız tek bağlantıda.</p>
        <div className={s.qrimg}>
          <img src={SOCIAL_QR_SRC} alt={`${SOCIAL_URL} QR kodu`} data-testid="social-qr" />
        </div>
        <span className={s.qrurl}>
          <Icon name="smartphone" />
          {SOCIAL_URL}
        </span>
      </div>
    </div>
  )
}

/**
 * Home button inside a round (scenario wheel, crisis, decisions; duel game). It asks first, so a
 * stray tap doesn't end the game; the round is not saved.
 */
export function LeaveGameButton({
  className = s.ib,
  onLeave,
}: {
  className?: string
  onLeave?: () => void
}) {
  const navigate = useNavigate()
  const [asking, setAsking] = useState(false)
  // the round is cleared once this screen is gone; clearing it earlier would make the game
  // screen redirect to its own start before home is shown
  const leaving = useRef(false)
  const leave = useEffectEvent(() => onLeave?.())
  useEffect(
    () => () => {
      if (leaving.current) leave()
    },
    [],
  )
  return (
    <>
      <button
        type="button"
        className={className}
        aria-label="Ana sayfaya dön"
        data-testid="btn-home"
        onClick={() => {
          sfx.tap()
          setAsking(true)
        }}
      >
        <Icon name="house" />
      </button>
      {asking &&
        createPortal(
          <ConfirmDialog
            title="Oyundan çıkılsın mı?"
            message="Bu tur kaydedilmeden ana sayfaya dönülür."
            confirmLabel="Ana sayfaya dön"
            confirmIcon="house"
            onCancel={() => {
              sfx.tap()
              setAsking(false)
            }}
            onConfirm={() => {
              sfx.nav()
              leaving.current = true
              void navigate(ROUTES.home)
            }}
          />,
          stageRoot(),
        )}
    </>
  )
}

/** Small club logo; holding it for 3 s opens the staff PIN (document §13.5). */
export function Logo({ className = s.logoSm }: { className?: string }) {
  const navigate = useNavigate()
  const hold = useLongPress(() => void navigate(ROUTES.admin), LOGO_HOLD_MS)
  const src = useLogoSrc()
  return <img className={className} src={src} alt="ATÜ TechBuilders" data-testid="logo" {...hold} />
}

/**
 * Header display controls, remembered on the device: the music button opens a small panel with
 * the music switch and the master volume; the effects button switches sound effects; the moon
 * switches the palette's dark version.
 */
export function AudioToggles({ className = s.ib }: { className?: string }) {
  const music = useSettingsStore((st) => st.music)
  const effects = useSettingsStore((st) => st.sfx)
  const toggle = useSettingsStore((st) => st.toggle)
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  // a touch anywhere outside the panel closes it
  useEffect(() => {
    if (!open) return
    const close = (e: Event) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close, true)
    return () => document.removeEventListener('pointerdown', close, true)
  }, [open])

  return (
    <>
      <div className={s.audioWrap} ref={box}>
        <button
          type="button"
          className={cn(className, open && s.ibOn)}
          aria-label="Müzik ve ses seviyesi"
          aria-expanded={open}
          aria-haspopup="dialog"
          data-testid="btn-music"
          data-music={music}
          onClick={() => {
            setOpen((v) => !v)
            unlockAudio()
            sfx.nav()
          }}
        >
          <Icon name={music ? 'music' : 'headphone-off'} />
        </button>
        {open && (
          <div
            className={s.audioPop}
            role="dialog"
            aria-label="Müzik ve ses seviyesi"
            data-testid="audio-pop"
          >
            <button
              type="button"
              role="switch"
              aria-checked={music}
              className={s.popRow}
              data-testid="music-toggle"
              onClick={() => {
                toggle('music')
                unlockAudio()
                if (effects) (music ? sfx.toggleOff : sfx.toggleOn)()
              }}
            >
              <Icon name={music ? 'music' : 'headphone-off'} />
              <span>Arka plan müziği</span>
              <span className={cn(s.switch, music && s.switchOn)} />
            </button>
            <VolumeSlider />
          </div>
        )}
      </div>
      <button
        type="button"
        className={className}
        aria-label={effects ? 'Ses efektlerini kapat' : 'Ses efektlerini aç'}
        aria-pressed={effects}
        data-testid="btn-sound"
        onClick={() => {
          toggle('sfx')
          unlockAudio()
          if (!effects) window.setTimeout(() => sfx.toggleOn(), 30)
        }}
      >
        <Icon name={effects ? 'volume-2' : 'volume-x'} />
      </button>
      <ThemeToggle className={className} />
    </>
  )
}

/** Light (paper) ↔ dark (the palette's night version); a moon in light mode, a sun in dark. */
export function ThemeToggle({ className = s.ib }: { className?: string }) {
  const dark = useSettingsStore((st) => st.theme === 'dark')
  const toggleTheme = useSettingsStore((st) => st.toggleTheme)
  return (
    <button
      type="button"
      className={className}
      aria-label={dark ? 'Açık temaya geç' : 'Koyu temaya geç'}
      aria-pressed={dark}
      data-testid="btn-theme"
      onClick={() => {
        toggleTheme()
        sfx.toggleOn()
      }}
    >
      <Icon name={dark ? 'sun' : 'moon'} />
    </button>
  )
}

/**
 * Master volume of music and effects (0–100 %, remembered on the device). A soft tick plays while
 * it moves, so the level can be judged by ear at the booth.
 */
export function VolumeSlider({
  className,
  testId = 'volume-slider',
}: {
  className?: string
  testId?: string
}) {
  const volume = useSettingsStore((st) => st.volume)
  const set = useSettingsStore((st) => st.set)
  return (
    <label className={cn(s.vol, className)} data-testid={`${testId}-box`}>
      <Icon name={volume === 0 ? 'volume-x' : volume < 50 ? 'volume-1' : 'volume-2'} />
      <input
        type="range"
        className={s.volRange}
        min={0}
        max={100}
        step={5}
        value={volume}
        aria-label="Ses seviyesi"
        aria-valuetext={`%${volume}`}
        data-testid={testId}
        style={{ '--v': `${volume}%` } as CSSProperties}
        onChange={(e) => {
          set('volume', Number(e.target.value))
          unlockAudio()
          sfx.countTick()
        }}
      />
      <b data-testid={`${testId}-value`}>%{volume}</b>
    </label>
  )
}

export function NickChip({ nick }: { nick: string }) {
  return (
    <span className={s.nickchip} data-testid="nick-chip">
      <span className={s.av}>{initialOf(nick)}</span>
      <span>{nick}</span>
    </span>
  )
}

/** The scenario mode's mascot, drawn inline (effect card label). */
export function ButterflyMark() {
  return (
    <svg viewBox="0 0 40 32" aria-hidden="true">
      <path d="M20 15C13 3 2 2 3 11c1 6 10 8 17 5z" fill="#A61E4D" />
      <path d="M20 17c-6 1-13 6-11 11 2 4 9 0 11-10z" fill="#087F5B" />
      <circle cx="9" cy="10" r="2.2" fill="#FCC419" />
      <path d="M20 15c7-12 18-13 17-4-1 6-10 8-17 5z" fill="#A61E4D" />
      <path d="M20 17c6 1 13 6 11 11-2 4-9 0-11-10z" fill="#087F5B" />
      <circle cx="31" cy="10" r="2.2" fill="#FCC419" />
      <rect x="19" y="8" width="2" height="16" rx="1" fill="var(--ink)" />
    </svg>
  )
}
