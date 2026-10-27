import { useEffect, useEffectEvent, useRef, useState, type CSSProperties } from 'react'
import { Navigate, useNavigate } from 'react-router'
import type { Scenario } from '@/ai/schemas'
import { ROUTES } from '@/app/routes'
import { dur, EFFECT_MS, ignoreAbort, sleep } from '@/app/timing'
import { Icon } from '@/components/Icon'
import { AudioToggles, ButterflyMark, LeaveGameButton, Logo, NickChip } from '@/components/Bits'
import { StepTimer } from '@/components/StepTimer'
import { findScenario } from '@/data/scenarioBank'
import { clearFx, flyButterfly, typewrite } from '@/game/fx'
import { difficultyOf, stepMaxPoints, type ScenarioPick } from '@/game/scoring'
import { sfx } from '@/audio/sfx'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useSettingsStore } from '@/stores/settingsStore'
import s from '@/styles/app.module.css'
import { cn } from '@/utils/cn'
import { capTr } from '@/utils/text'

const LETTERS = ['A', 'B', 'C', 'D']
const TIMEOUT_TEXT = 'Karar verilmedi; kriz kendi kendine büyüdü.'

// Scenario 4 · five decisions of 20 s each, each followed by its butterfly effect (§3.4–3.5).
export function ScenarioGame() {
  const nick = useScenarioStore((st) => st.nick)
  const scenario = findScenario(useScenarioStore((st) => st.scenarioId))
  const finished = useScenarioStore((st) => st.entry !== null)

  if (!nick || !scenario) return <Navigate to={ROUTES.scenarioNickname} replace />
  if (finished) return <Navigate to={ROUTES.scenarioResult} replace />
  return <DecisionSteps nick={nick} scenario={scenario} />
}

interface Sheet {
  id: number
  text: string
  late: boolean
  on: boolean
}

function DecisionSteps({ nick, scenario }: { nick: string; scenario: Scenario }) {
  const navigate = useNavigate()
  const picks = useScenarioStore((st) => st.picks)
  const addPick = useScenarioStore((st) => st.addPick)
  const chooseScenario = useScenarioStore((st) => st.chooseScenario)
  const stepSec = useSettingsStore((st) => st.stepSec)

  const [step, setStep] = useState(0)
  const [questionIn, setQuestionIn] = useState(false)
  const [optionsIn, setOptionsIn] = useState(false)
  const [selected, setSelected] = useState<number | null>(null)
  const [timedOut, setTimedOut] = useState(false)
  /** chain nodes shown as done (the node fills only when the butterfly lands) */
  const [revealed, setRevealed] = useState(0)
  const [justIndex, setJustIndex] = useState(-1)
  const [sheet, setSheet] = useState<Sheet | null>(null)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [frozenLeft, setFrozenLeft] = useState(stepSec)

  const locked = useRef(true)
  const sheetNext = useRef<(() => void) | null>(null)
  const lifetime = useRef(new AbortController())
  const sheetSeq = useRef(0)
  const rootRef = useRef<HTMLElement>(null)
  const situationRef = useRef<HTMLParagraphElement>(null)

  // A fresh game always starts from step 1.
  useEffect(() => {
    clearFx()
    chooseScenario(scenario.id)
    const life = new AbortController()
    lifetime.current = life
    return () => life.abort()
  }, [chooseScenario, scenario.id])

  // Step intro: situation types out → question slides in → options rise → timer starts.
  useEffect(() => {
    const run = new AbortController()
    void (async () => {
      locked.current = true
      if (situationRef.current) {
        await typewrite(situationRef.current, scenario.adimlar[step].durum, dur(14), run.signal)
      }
      if (run.signal.aborted) return
      setQuestionIn(true)
      await sleep(dur(180), run.signal)
      setOptionsIn(true)
      await sleep(dur(380), run.signal)
      locked.current = false
      setStartedAt(performance.now())
    })().catch(ignoreAbort)
    return () => run.abort()
  }, [scenario, step])

  const showEffect = async (text: string, late: boolean) => {
    const signal = lifetime.current.signal
    sheetSeq.current += 1
    setSheet({ id: sheetSeq.current, text, late, on: true })
    if (!late) sfx.reveal()
    await new Promise<void>((resolve) => {
      const timer = window.setTimeout(resolve, EFFECT_MS + 500)
      sheetNext.current = () => {
        window.clearTimeout(timer)
        resolve()
      }
      signal.addEventListener('abort', () => window.clearTimeout(timer), { once: true })
    })
    sheetNext.current = null
    setSheet((sh) => sh && { ...sh, on: false })
    await sleep(dur(300), signal)
    if (step < scenario.adimlar.length - 1) {
      setQuestionIn(false)
      setOptionsIn(false)
      setSelected(null)
      setTimedOut(false)
      setJustIndex(-1)
      setFrozenLeft(stepSec)
      setStep(step + 1)
    } else {
      void navigate(ROUTES.scenarioResult)
    }
  }

  const record = (pick: ScenarioPick) => {
    setFrozenLeft(Math.max(0, stepSec - pick.sure))
    setStartedAt(null)
    addPick(pick)
  }

  const pick = (k: number) => {
    if (locked.current) return
    locked.current = true
    const used = startedAt === null ? 0 : Math.min(stepSec, (performance.now() - startedAt) / 1000)
    const option = scenario.adimlar[step].secenekler[k]
    record({ stepIndex: step, optionIndex: k, puan: option.puan, sure: used, limit: stepSec })
    setSelected(k)
    sfx.pick()
    void (async () => {
      await sleep(dur(260), lifetime.current.signal)
      const from = rootRef.current?.querySelector(`[data-option="${k}"] [data-icon]`)
      const to = rootRef.current?.querySelector(`[data-node="${step}"] [data-dot]`)
      if (from && to) await flyButterfly(from, to)
      setRevealed(step + 1)
      setJustIndex(step)
      await showEffect(option.etki, false)
    })().catch(ignoreAbort)
  }

  const onTimeout = () => {
    if (locked.current) return
    locked.current = true
    record({ stepIndex: step, optionIndex: null, puan: 0, sure: stepSec, limit: stepSec })
    setTimedOut(true)
    sfx.timeout()
    setRevealed(step + 1)
    setJustIndex(step)
    showEffect(TIMEOUT_TEXT, true).catch(ignoreAbort)
  }

  // Keyboard shortcuts: A–D / 1–4 choose, Enter / space skips the effect card.
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (sheetNext.current && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      sheetNext.current()
      return
    }
    const i = 'abcd1234'.indexOf(e.key.toLowerCase())
    if (i >= 0) pick(i % 4)
  })
  useEffect(() => {
    const listener = (e: KeyboardEvent) => onKey(e)
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [])

  const current = scenario.adimlar[step]
  const general = current.seviye === 'genel'
  const difficulty = difficultyOf(current)
  const worth = stepMaxPoints(scenario)[step]

  return (
    <main
      className={s.screen}
      ref={rootRef}
      data-testid="scenario-game"
      data-step={step + 1}
      data-ready={startedAt !== null}
    >
      <header className={s.bar}>
        <Logo />
        <div className={s.gttl}>
          <small>SENARYO</small>
          <b>{scenario.baslik}</b>
        </div>
        <div className={s.barR}>
          <span className={s.chip} data-testid="step-indicator">
            <Icon name="git-commit-horizontal" />
            Adım {step + 1}/5
          </span>
          <StepTimer
            startedAt={startedAt}
            frozenLeft={frozenLeft}
            onTimeout={onTimeout}
            limit={stepSec}
          />
          <NickChip nick={nick} />
          <AudioToggles />
          <LeaveGameButton onLeave={() => useScenarioStore.getState().reset()} />
        </div>
      </header>

      <div className={s.chain} data-testid="chain">
        {scenario.adimlar.map((a, i) => {
          const done = i < revealed
          const cur = !done && i === step
          const p = picks[i]
          const icon = p
            ? p.optionIndex === null
              ? 'timer-off'
              : a.secenekler[p.optionIndex].ikon
            : null
          return (
            <ChainNode
              key={a.no}
              index={i}
              label={done || cur ? capTr(a.konu) : `Adım ${i + 1}`}
              state={done ? 'done' : cur ? 'cur' : 'todo'}
              just={i === justIndex}
              icon={done ? icon : null}
              last={i === scenario.adimlar.length - 1}
            />
          )
        })}
      </div>

      <div className={s.durum} data-testid="situation-card">
        <div className={s.eyebrow}>
          <Icon name={general ? 'globe' : 'search'} />
          DURUM · ADIM {current.no} · {general ? 'GENEL KARAR' : 'DETAY'}
        </div>
        <span
          className={cn(s.diff, difficulty === 'zor' && s.diffHard)}
          data-testid="step-worth"
          data-difficulty={difficulty}
        >
          <Icon name={difficulty === 'zor' ? 'flame' : 'gauge'} />
          {difficulty === 'zor' ? 'Zor karar' : difficulty === 'orta' ? 'Orta' : 'Kolay'} · {worth}{' '}
          puan
        </span>
        <p className={s.dt} ref={situationRef} data-testid="situation" />
        <p className={cn(s.dq, questionIn && s.dqIn)} data-testid="question">
          {current.soru}
        </p>
      </div>

      <div className={cn(s.opts, optionsIn && s.optsIn)}>
        {current.secenekler.map((o, k) => (
          <button
            key={`${step}-${o.id}`}
            type="button"
            className={cn(
              s.opt,
              selected === k && s.optSel,
              (timedOut || (selected !== null && selected !== k)) && s.optDim,
            )}
            style={{ '--d': `${k * 80}ms` } as CSSProperties}
            disabled={timedOut || (selected !== null && selected !== k)}
            aria-pressed={selected === k}
            data-option={k}
            data-testid={`option-${o.id}`}
            onClick={() => pick(k)}
          >
            <span className={s.key}>{LETTERS[k]}</span>
            <span className={s.oic} data-icon>
              <Icon name={o.ikon} />
            </span>
            <span className={s.otx}>{o.metin}</span>
            <span className={s.ock}>
              <Icon name="check" />
            </span>
          </button>
        ))}
      </div>

      <div className={s.hint}>
        <Icon name="pointer" />
        Bir seçeneğe dokun · süre dolarsa bu adım 0 puan
      </div>

      {/* The whole card is one big tap target (as in the prototype); keyboards use Enter/space
          or the Devam button. */}
      {/* oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        className={cn(s.sheet, sheet?.on && s.sheetOn, sheet?.late && s.sheetLate)}
        style={{ '--sheet-ms': `${EFFECT_MS + 500}ms` } as CSSProperties}
        data-testid="effect-sheet"
        data-open={sheet?.on ?? false}
        onClick={() => sheetNext.current?.()}
      >
        {sheet && (
          <>
            <div className={s.sl}>
              {sheet.late ? (
                <>
                  <Icon name="timer-off" />
                  SÜRE DOLDU · 0 PUAN
                </>
              ) : (
                <>
                  <ButterflyMark />
                  KELEBEK ETKİSİ
                </>
              )}
            </div>
            <p className={s.sheetText} data-testid="effect-text">
              {sheet.text}
            </p>
            <button
              type="button"
              className={s.nx}
              data-testid="effect-next"
              tabIndex={sheet.on ? 0 : -1}
              onClick={(e) => {
                e.stopPropagation()
                sheetNext.current?.()
              }}
            >
              Devam <Icon name="arrow-right" />
            </button>
            <div className={s.pb}>{sheet.on && <i key={sheet.id} />}</div>
          </>
        )}
      </div>
    </main>
  )
}

interface ChainNodeProps {
  index: number
  label: string
  state: 'done' | 'cur' | 'todo'
  just: boolean
  icon: string | null
  last: boolean
}

function ChainNode({ index, label, state, just, icon, last }: ChainNodeProps) {
  return (
    <>
      <div
        className={cn(
          s.cn,
          state === 'cur' && s.cnCur,
          state === 'done' && s.cnDone,
          just && s.cnJust,
        )}
        data-node={index}
        data-state={state}
        data-testid={`chain-node-${index + 1}`}
      >
        <div className={s.dot} data-dot>
          {icon ? <Icon name={icon} /> : <b>{index + 1}</b>}
        </div>
        <span className={s.cnLabel}>{label}</span>
      </div>
      {!last && (
        <div className={cn(s.seg, state === 'done' && s.segFull)}>
          <i />
        </div>
      )}
    </>
  )
}
