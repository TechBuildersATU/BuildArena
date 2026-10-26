import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { sfx } from '@/audio/sfx'
import { ROUTES } from '@/app/routes'
import { dur, prefersReducedMotion } from '@/app/timing'
import { usePressGuard } from '@/app/usePress'
import { AudioToggles, Logo } from '@/components/Bits'
import { Icon } from '@/components/Icon'
import { useScores } from '@/db/database'
import { clearFx } from '@/game/fx'
import { checkNick, NICK_MAX, rollNickname, tidyTyped, uniqueNick } from '@/game/nickname'
import { useAmbientButterfly } from '@/game/useAmbientButterfly'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useSettingsStore } from '@/stores/settingsStore'
import s from '@/styles/app.module.css'
import { cn } from '@/utils/cn'
import { initialOf } from '@/utils/text'

const RULES = [
  { key: 'len', text: '3–16 karakter' },
  { key: 'chars', text: 'Harf, rakam, boşluk, _ ve -' },
  { key: 'clean', text: 'Herkese uygun bir ad' },
] as const

/** Names flashing in the field before the dice lands, and the pause between them (ms). */
const SPIN_FRAMES = 8
const SPIN_STEP = 65
/** How many recent dice names are not offered again. */
const RECENT = 40

// Scenario 1 · nickname (scenario doc §3.1, §7). The tablet's own keyboard types into the field;
// the dice in the field rolls through ready-made names (about 3,700 "Tech Animal" pairs plus
// hand-picked ones) like a slot machine, so a visitor can start without typing at all.
export function ScenarioNickname() {
  const navigate = useNavigate()
  const begin = useScenarioStore((st) => st.begin)
  const stepSec = useSettingsStore((st) => st.stepSec)
  const scores = useScores()
  const taken = useMemo(() => (scores ?? []).map((e) => e.nick), [scores])

  const [nick, setNick] = useState('')
  const [izin, setIzin] = useState(true)
  const [shaking, setShaking] = useState(false)
  const [rolling, setRolling] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const spinTimers = useRef<number[]>([])
  const recent = useRef<string[]>([])

  const stopSpin = () => {
    spinTimers.current.forEach((id) => window.clearTimeout(id))
    spinTimers.current = []
  }

  useAmbientButterfly()
  useEffect(() => {
    clearFx()
    return stopSpin
  }, [])

  const trimmed = nick.trim()
  const empty = trimmed.length === 0
  const checks = checkNick(nick)
  const valid = checks.len && checks.chars && checks.clean
  const unique = valid ? uniqueNick(trimmed, taken) : ''

  const bump = () => {
    setShaking(false)
    requestAnimationFrame(() => setShaking(true))
    window.setTimeout(() => setShaking(false), 400)
  }

  const start = () => {
    if (spinning) return
    if (!valid) {
      sfx.error()
      return bump()
    }
    sfx.tap()
    begin(uniqueNick(trimmed, taken), izin)
    void navigate(ROUTES.scenarioIntro)
  }
  const guardedStart = usePressGuard(start)

  /** Rolls through a few names in the field and lands on one nobody used today. */
  const rollDice = () => {
    stopSpin()
    setRolling((r) => r + 1)
    setSpinning(true)
    sfx.pick()
    const final = rollNickname(taken, recent.current)
    recent.current = [final, ...recent.current].slice(0, RECENT)
    for (let i = 0; i < SPIN_FRAMES; i++) {
      spinTimers.current.push(
        window.setTimeout(
          () => {
            setNick(rollNickname(taken, recent.current))
            sfx.reel()
          },
          dur(i * SPIN_STEP),
        ),
      )
    }
    spinTimers.current.push(
      window.setTimeout(
        () => {
          setNick(final)
          setSpinning(false)
          sfx.reelStop()
          if (!prefersReducedMotion())
            input.current?.animate(
              [{ transform: 'translateY(-14px) scale(1.08)' }, { transform: 'none' }],
              { duration: 400, easing: 'cubic-bezier(0.3, 1.5, 0.5, 1)' },
            )
        },
        dur(SPIN_FRAMES * SPIN_STEP + 40),
      ),
    )
  }

  return (
    <main className={s.screen} data-testid="scenario-nickname">
      <header className={cn(s.bar, s.barClear)}>
        <div className={s.brand}>
          <Logo />
          BuildArena
          <span className={cn(s.chip, s.chipScn)}>
            <Icon name="route" />
            Senaryo
          </span>
        </div>
        <div className={s.barR}>
          <AudioToggles />
          <button
            type="button"
            className={s.ib}
            aria-label="Skor tablosu"
            data-testid="btn-leaderboard"
            onClick={() => {
              sfx.tap()
              void navigate(ROUTES.leaderboard)
            }}
          >
            <Icon name="trophy" />
          </button>
          <button
            type="button"
            className={s.ib}
            aria-label="Ana menü"
            data-testid="btn-home"
            onClick={() => {
              sfx.tap()
              void navigate(ROUTES.home)
            }}
          >
            <Icon name="house" />
          </button>
        </div>
      </header>

      <div className={s.nickLeft}>
        <div className={s.eyebrow}>
          <Icon name="route" />
          SENARYO MODU · 1 OYUNCU
        </div>
        <h1 className={s.nickTitle}>
          Kriz masasına <span>hoş geldin.</span>
        </h1>
        <p className={s.lead}>
          5 karar, her biri {stepSec} saniye. Zor kararlar daha çok puan değerinde; sonunda karar
          zincirin 100 üzerinden puanlanır ve skor tablosuna yazılır.
        </p>
        <div className={s.facts}>
          <span className={s.chip}>
            <Icon name="git-commit-horizontal" />5 karar
          </span>
          <span className={s.chip}>
            <Icon name="timer" />
            {stepSec} sn / karar
          </span>
          <span className={s.chip}>
            <Icon name="target" />
            100 puan
          </span>
          <span className={s.chip}>
            <Icon name="trophy" />
            Skor tablosu
          </span>
        </div>

        <div className={s.pv}>
          <div className={s.eyebrow}>
            <Icon name="eye" />
            SKOR TABLOSUNDA BÖYLE GÖRÜNECEKSİN
          </div>
          <div className={s.pvRow} data-testid="nick-preview">
            <span className={s.pvRank}>#?</span>
            <span className={s.av}>{empty ? '?' : initialOf(nick)}</span>
            <b className={cn(s.pvName, empty && s.pvEmpty)}>
              {empty ? 'Takma adın' : valid ? unique : nick}
            </b>
            <span className={s.pvScore}>— / 100</span>
          </div>
        </div>
        <span className={s.priv}>
          <Icon name="shield-check" />
          Gerçek ad, telefon ve e-posta istenmez.
        </span>
      </div>

      <div className={s.nickRight}>
        <label className={s.eyebrow} htmlFor="nick-input">
          <Icon name="tag" />
          TAKMA ADIN
        </label>
        <div
          className={cn(s.field, shaking && s.fieldErr, spinning && s.fieldSpin)}
          data-testid="nick-field"
          data-keyboard-anchor
          data-spinning={spinning}
        >
          <input
            ref={input}
            id="nick-input"
            className={s.fieldInput}
            value={nick}
            maxLength={NICK_MAX}
            placeholder="Yaz ya da zara dokun…"
            enterKeyHint="go"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="words"
            spellCheck={false}
            data-testid="nick-input"
            onChange={(e) => {
              stopSpin()
              setSpinning(false)
              setNick(tidyTyped(e.target.value))
              sfx.key()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                guardedStart()
              }
            }}
          />
          <span className={s.cnt} data-testid="nick-count">
            {nick.length}/{NICK_MAX}
          </span>
          <button
            key={rolling}
            type="button"
            className={cn(s.dice, rolling > 0 && s.diceRoll)}
            aria-label="Rastgele ad"
            data-testid="nick-dice"
            onClick={rollDice}
          >
            <Icon name="dices" />
          </button>
        </div>

        <ul className={s.rules}>
          {RULES.map((r) => {
            const ok = checks[r.key]
            const state = empty ? 'idle' : ok ? 'ok' : 'bad'
            return (
              <li
                key={r.key}
                className={cn(s.rule, state === 'ok' && s.ruleOk, state === 'bad' && s.ruleBad)}
                data-testid={`rule-${r.key}`}
                data-state={state}
              >
                <span className={s.ruleDot}>
                  <Icon name={state === 'bad' ? 'x' : 'check'} />
                </span>
                {r.key === 'clean' && state === 'bad'
                  ? 'Bu ad kullanılamıyor, başka bir ad dene.'
                  : r.text}
              </li>
            )
          })}
        </ul>

        <div className={cn(s.dup, valid && unique !== trimmed && s.dupOn)} data-testid="nick-dup">
          <Icon name="info" />
          {valid && unique !== trimmed && (
            <span>
              Bugün bu ad alınmış → <b>{unique}</b> olarak kaydedilecek.
            </span>
          )}
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={izin}
          className={s.consent}
          data-testid="nick-consent"
          onClick={() => {
            setIzin((v) => !v)
            if (izin) sfx.toggleOff()
            else sfx.toggleOn()
          }}
        >
          <span className={cn(s.switch, izin && s.switchOn)} />
          <span>
            Takma adımın ve puanımın ATÜ TechBuilders sosyal medya hesaplarında paylaşılmasına izin
            veriyorum.
            <small>İzin vermesen de oynar ve skor tablosunda görünürsün.</small>
          </span>
        </button>

        <button
          type="button"
          className={cn(s.btn, s.btnPri, s.nickStart)}
          disabled={!valid || spinning}
          data-testid="scenario-start"
          onClick={guardedStart}
        >
          Krize gir <Icon name="arrow-right" />
        </button>
      </div>
    </main>
  )
}
