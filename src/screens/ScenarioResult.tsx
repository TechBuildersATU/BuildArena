import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Navigate, useNavigate } from 'react-router'
import type { Scenario } from '@/ai/schemas'
import { juryAnalysis } from '@/ai/juryAnalysis'
import { ROUTES } from '@/app/routes'
import { dur, ignoreAbort, prefersReducedMotion, sleep } from '@/app/timing'
import { useIdle } from '@/app/useIdle'
import { usePressGuard } from '@/app/usePress'
import { Icon } from '@/components/Icon'
import { AudioToggles, Logo, NickChip, SocialButton } from '@/components/Bits'
import { findScenario } from '@/data/scenarioBank'
import { listScores } from '@/db/database'
import { confetti, countUp, typewrite } from '@/game/fx'
import {
  rankOf,
  scoreScenario,
  stepStatus,
  titleFor,
  totalTime,
  type ScenarioPick,
  type StepStatus,
} from '@/game/scoring'
import { sfx } from '@/audio/sfx'
import { useScenarioStore } from '@/stores/scenarioStore'
import s from '@/styles/app.module.css'
import { cn } from '@/utils/cn'
import { capTr, formatDuration } from '@/utils/text'

const RING_C = 540.35 // 2π × 86
const STATUS: Record<StepStatus, { cls: string; label: string; icon: string }> = {
  iyi: { cls: s.sOk, label: 'İyi', icon: 'check' },
  orta: { cls: s.sMid, label: 'Orta', icon: 'minus' },
  zayif: { cls: s.sBad, label: 'Zayıf', icon: 'x' },
}

// Scenario 5 · final: decision chain, score, title, jury analysis, leaderboard rank (§3.6, §6).
export function ScenarioResult() {
  const nick = useScenarioStore((st) => st.nick)
  const picks = useScenarioStore((st) => st.picks)
  const scenario = findScenario(useScenarioStore((st) => st.scenarioId))

  if (!nick || !scenario || picks.length < scenario.adimlar.length) {
    return <Navigate to={ROUTES.scenarioNickname} replace />
  }
  return <Final nick={nick} scenario={scenario} picks={picks} />
}

interface FinalProps {
  nick: string
  scenario: Scenario
  picks: ScenarioPick[]
}

function Final({ nick, scenario, picks }: FinalProps) {
  const navigate = useNavigate()
  const finish = useScenarioStore((st) => st.finish)
  const reset = useScenarioStore((st) => st.reset)
  const izin = useScenarioStore((st) => st.izin)

  const { total, steps, bestCount } = scoreScenario(scenario, picks)
  const title = titleFor(total)
  const seconds = totalTime(picks)

  const [go, setGo] = useState(false)
  const [barsIn, setBarsIn] = useState(false)
  const [stamped, setStamped] = useState(false)
  const [rank, setRank] = useState<{ rank: number; count: number } | null>(null)

  const arcRef = useRef<SVGCircleElement>(null)
  const numRef = useRef<HTMLElement>(null)
  const anaRef = useRef<HTMLParagraphElement>(null)
  const rankRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const run = new AbortController()
    const { signal } = run
    void (async () => {
      const entry = finish()
      const all = await listScores()
      const list = all.some((e) => e.id === entry.id) ? all : [...all, entry]
      const myRank = rankOf(list, entry.id)
      if (signal.aborted) return
      setRank({ rank: myRank, count: list.length })

      await sleep(dur(120), signal)
      setGo(true)
      picks.forEach((_, i) =>
        window.setTimeout(() => !signal.aborted && sfx.wheelTick(i), dur(300 + i * 240)),
      )
      await sleep(dur(1500), signal)
      setBarsIn(true)

      const target = RING_C * (1 - total / 100)
      const arc = arcRef.current
      if (arc) {
        if (prefersReducedMotion()) arc.style.strokeDashoffset = String(target)
        else {
          arc
            .animate([{ strokeDashoffset: RING_C }, { strokeDashoffset: target }], {
              duration: dur(1400),
              easing: 'cubic-bezier(.2,.8,.2,1)',
              fill: 'forwards',
            })
            .finished.then(() => (arc.style.strokeDashoffset = String(target)))
            .catch(() => {})
        }
      }
      if (numRef.current) await countUp(numRef.current, total, dur(1400), signal, sfx.countTick)
      if (signal.aborted) return

      setStamped(true)
      sfx.stamp()
      if (total >= 90) {
        confetti(120)
        sfx.fanfare()
      } else if (total >= 75) {
        confetti(60)
        sfx.fanfare()
      }
      await sleep(dur(450), signal)
      if (anaRef.current)
        void typewrite(anaRef.current, juryAnalysis(scenario, picks, total), dur(16), signal)

      // the rank ticks up from the bottom of today's table to the real place
      const from = Math.max(myRank, list.length)
      const el = rankRef.current
      for (let r = from; r >= myRank; r--) {
        if (el) el.textContent = `#${r}`
        sfx.countTick()
        await sleep(dur(Math.max(40, 380 / Math.max(1, from - myRank))), signal)
      }
      if (myRank <= 3) sfx.rankUp()
      el?.animate([{ transform: 'scale(1.35)' }, { transform: 'scale(1)' }], {
        duration: 400,
        easing: 'cubic-bezier(.3,1.5,.5,1)',
      })
    })().catch(ignoreAbort)
    return () => run.abort()
  }, [finish, picks, scenario, total])

  // The game is cleared once this screen has gone: clearing it while it is still shown would
  // make it redirect to the nickname screen (navigation renders in a transition, after it).
  const clearOnLeave = useRef(false)
  useEffect(
    () => () => {
      if (clearOnLeave.current) reset()
    },
    [reset],
  )
  const leave = (to: string) => {
    clearOnLeave.current = true
    void navigate(to)
  }
  useIdle(() => leave(ROUTES.home))

  const newPlayer = usePressGuard(() => {
    sfx.tap()
    leave(ROUTES.scenarioNickname)
  })
  const home = usePressGuard(() => {
    sfx.tap()
    leave(ROUTES.home)
  })
  const toBoard = usePressGuard(() => {
    sfx.tap()
    void navigate(ROUTES.leaderboard)
  })

  const X = (i: number) => (1168 / 5) * (i + 0.5)

  return (
    <main className={s.screen} data-testid="scenario-result">
      <header className={s.bar}>
        <Logo />
        <div className={s.gttl}>
          <small>KARAR ZİNCİRİ</small>
          <b>{scenario.baslik}</b>
        </div>
        <div className={s.barR}>
          <NickChip nick={nick} />
          <AudioToggles />
        </div>
      </header>

      <div className={cn(s.fc, go && s.fcGo)} data-testid="final-chain">
        <svg
          className={s.fpath}
          viewBox="0 0 1168 20"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <line x1={X(0)} y1="10" x2={X(4)} y2="10" />
        </svg>
        {picks.map((p, i) => {
          const step = scenario.adimlar[p.stepIndex]
          const option = p.optionIndex === null ? null : step.secenekler[p.optionIndex]
          const st = STATUS[stepStatus(p.puan)]
          return (
            <div
              key={step.no}
              className={cn(s.fn, st.cls)}
              style={{ left: X(i), '--i': i } as CSSProperties}
              data-testid={`final-node-${i + 1}`}
              data-status={stepStatus(p.puan)}
            >
              <div className={s.fdot}>
                <Icon name={option ? option.ikon : 'timer-off'} />
                <span className={s.fb}>
                  <Icon name={st.icon} />
                </span>
              </div>
              <small className={s.fnLevel}>
                ADIM {i + 1} · {step.seviye === 'genel' ? 'GENEL' : 'DETAY'}
              </small>
              <b className={s.fnText}>{option ? option.metin : 'Süre doldu'}</b>
              <em className={s.pill}>
                <Icon name={st.icon} />
                {st.label}
              </em>
              <p className={s.fnOzet}>{option ? option.ozet : 'Karar yok'}</p>
            </div>
          )
        })}
      </div>

      <div className={s.fscore}>
        <div className={s.scoreRing}>
          <svg viewBox="0 0 200 200" aria-hidden="true">
            <circle cx="100" cy="100" r="86" fill="none" stroke="var(--card)" strokeWidth="16" />
            <circle cx="100" cy="100" r="95" fill="none" stroke="var(--ink)" strokeWidth="2" />
            <circle
              cx="100"
              cy="100"
              r="77"
              fill="var(--card)"
              stroke="var(--ink)"
              strokeWidth="2"
            />
            <circle
              ref={arcRef}
              cx="100"
              cy="100"
              r="86"
              fill="none"
              stroke="var(--scn-ink)"
              strokeWidth="16"
              strokeLinecap="butt"
              strokeDasharray={RING_C}
              strokeDashoffset={RING_C}
            />
          </svg>
          <div className={s.ringValue}>
            <b ref={numRef} data-testid="result-score" data-score={total}>
              0
            </b>
            <small>/ 100</small>
          </div>
        </div>
        <div>
          <div className={s.eyebrow}>
            <Icon name="badge-check" />
            UNVANIN
          </div>
          <b className={cn(s.stamp, stamped && s.stampOn)} data-testid="result-title">
            {title}
          </b>
          <div className={s.meta}>
            <b>{bestCount}/5</b> en iyi karar
            <br />
            Toplam süre <b>{formatDuration(seconds)}</b>
          </div>
        </div>
      </div>

      <div className={s.fbars}>
        <div className={s.eyebrow} style={{ marginBottom: 8 }}>
          <Icon name="chart-bar" />
          ADIM PUANLARI
        </div>
        {picks.map((p, i) => (
          <div
            key={p.stepIndex}
            className={cn(s.fbar, STATUS[stepStatus(p.puan)].cls)}
            data-testid={`step-bar-${i + 1}`}
            data-points={steps[i].points}
            data-max={steps[i].max}
          >
            <span>
              {i + 1} · {capTr(scenario.adimlar[p.stepIndex].konu)}
            </span>
            <div className={s.fbarTrack}>
              <i
                style={
                  {
                    '--delay': `${i * 110}ms`,
                    ...(barsIn ? { transform: `scaleX(${steps[i].points / steps[i].max})` } : {}),
                  } as CSSProperties
                }
              />
            </div>
            <em>
              {steps[i].points}
              <small>/{steps[i].max}</small>
            </em>
          </div>
        ))}
      </div>

      <div className={s.fside}>
        <div className={s.ana}>
          <div className={s.eyebrow}>
            <Icon name="message-circle" />
            JÜRİ ANALİZİ
          </div>
          <p className={s.anaText} ref={anaRef} data-testid="result-analysis" />
        </div>
        <div className={s.rank}>
          <div className={s.rankNum} ref={rankRef} data-testid="result-rank" data-rank={rank?.rank}>
            #–
          </div>
          <div className={s.rankText}>
            <b>Skor tablosuna eklendi</b>
            <span>
              {rank &&
                (rank.rank <= 3
                  ? "Günün ilk 3'ündesin!"
                  : `Bugün ${rank.count} oyuncu arasında ${rank.rank}. sıradasın.`)}
            </span>
          </div>
          <span className={s.chip} data-testid="result-consent">
            <Icon name={izin ? 'megaphone' : 'eye-off'} />
            {izin ? 'Paylaşım izni var' : 'Paylaşım izni yok'}
          </span>
        </div>
      </div>

      <div className={s.fbtns}>
        <SocialButton />
        <button
          type="button"
          className={cn(s.btn, s.btnPri)}
          data-testid="scenario-new-player"
          onClick={newPlayer}
        >
          <Icon name="user-plus" />
          Yeni oyuncu
        </button>
        <button type="button" className={s.btn} data-testid="btn-home" onClick={home}>
          <Icon name="house" />
          Ana Menü
        </button>
        <button type="button" className={s.btn} data-testid="btn-leaderboard" onClick={toBoard}>
          <Icon name="trophy" />
          Skor tablosu
        </button>
      </div>
    </main>
  )
}
