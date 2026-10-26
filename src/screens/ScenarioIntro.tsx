import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import type { Scenario } from '@/ai/schemas'
import { ROUTES } from '@/app/routes'
import { readString, STORAGE_KEYS } from '@/app/storage'
import { getTestFlags } from '@/app/testFlags'
import { dur, ignoreAbort, sleep } from '@/app/timing'
import { Icon } from '@/components/Icon'
import { LeaveGameButton, Logo } from '@/components/Bits'
import { crisisName, SCENARIOS, shortName } from '@/data/scenarioBank'
import { pickCrisis, wheelHops } from '@/game/crisisWheel'
import { clearFx, typewrite } from '@/game/fx'
import { sfx } from '@/audio/sfx'
import { useAmbientButterfly } from '@/game/useAmbientButterfly'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useSettingsStore } from '@/stores/settingsStore'
import s from '@/styles/app.module.css'
import { cn } from '@/utils/cn'
import { lowerTr, upperTr } from '@/utils/text'

// Scenario 2 + 3 · crisis wheel, crisis intro and the 3-2-1 countdown (scenario doc §3.2–3.3).
export function ScenarioIntro() {
  const nick = useScenarioStore((st) => st.nick)
  const chooseScenario = useScenarioStore((st) => st.chooseScenario)
  const [scenario, setScenario] = useState<Scenario | null>(null)

  if (!nick) return <Navigate to={ROUTES.scenarioNickname} replace />
  return scenario ? (
    <CrisisIntro scenario={scenario} />
  ) : (
    <CrisisWheel
      nick={nick}
      onPicked={(picked) => {
        chooseScenario(picked.id)
        setScenario(picked)
      }}
    />
  )
}

function CrisisWheel({ nick, onPicked }: { nick: string; onPicked: (s: Scenario) => void }) {
  const [highlight, setHighlight] = useState<number | null>(null)
  const [winner, setWinner] = useState<number | null>(null)
  const picked = useEffectEvent(onPicked)
  useAmbientButterfly()

  useEffect(() => {
    clearFx()
    const run = new AbortController()
    void (async () => {
      const n = SCENARIOS.length
      const { target, start } = pickCrisis(
        SCENARIOS.map((sc) => sc.id),
        readString(STORAGE_KEYS.lastScenario),
        getTestFlags().seed,
      )
      const total = wheelHops(n, target, start) // slowing down cubically
      await sleep(dur(350), run.signal)
      for (let k = 0, i = start; k <= total; k++, i++) {
        setHighlight(i % n)
        sfx.wheelTick(k)
        const p = k / total
        await sleep(dur(55 + 360 * p * p * p), run.signal)
      }
      setWinner(target)
      sfx.wheelLand()
      await sleep(dur(1500), run.signal)
      picked(SCENARIOS[target])
    })().catch(ignoreAbort)
    return () => run.abort()
  }, [])

  return (
    <main className={s.screen} data-testid="scenario-wheel">
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
          <LeaveGameButton onLeave={() => useScenarioStore.getState().reset()} />
        </div>
      </header>
      <div className={s.wheelHead}>
        <h2>Kriz çarkı dönüyor…</h2>
        <p>
          Hazır ol, <b>{nick}</b>! Bugünkü krizini kampüsün sistemlerinden biri seçiyor.
        </p>
      </div>
      <div className={s.wtiles}>
        {SCENARIOS.map((sc, i) => (
          <div
            key={sc.id}
            className={cn(
              s.wt,
              winner === null && highlight === i && s.wtHl,
              winner === i && s.wtWin,
              winner !== null && winner !== i && s.wtLose,
            )}
            data-testid={`wheel-tile-${sc.id}`}
            data-state={
              winner === i ? 'win' : winner !== null ? 'lose' : highlight === i ? 'hl' : 'idle'
            }
          >
            <div className={s.wtIcon}>
              <Icon name={sc.ikon} />
            </div>
            <b>{shortName(sc)}</b>
            <small>{crisisName(sc)}</small>
          </div>
        ))}
      </div>
      {winner !== null && (
        <div className={s.wstamp} data-testid="wheel-stamp">
          <span>
            <Icon name="siren" />
            KRİZ SEÇİLDİ
          </span>
        </div>
      )}
      <div className={s.whint}>
        Senaryolar her oyunda yeniden karıştırılır · son oynanan kriz tekrar gelmez
      </div>
    </main>
  )
}

const COUNTDOWN = ['3', '2', '1', 'Başla!']

function CrisisIntro({ scenario }: { scenario: Scenario }) {
  const navigate = useNavigate()
  const stepSec = useSettingsStore((st) => st.stepSec)
  const textRef = useRef<HTMLParagraphElement>(null)
  const [count, setCount] = useState<string | null>(null)
  const counting = useRef(false)
  const lifetime = useRef<AbortController | null>(null)

  useEffect(() => {
    const run = new AbortController()
    lifetime.current = run
    sfx.alarm()
    void (async () => {
      await sleep(dur(350), run.signal)
      if (textRef.current) await typewrite(textRef.current, scenario.giris, dur(16), run.signal)
    })().catch(ignoreAbort)
    return () => run.abort()
  }, [scenario])

  const startCrisis = () => {
    const run = lifetime.current
    if (counting.current || !run) return
    counting.current = true
    void (async () => {
      for (const [i, n] of COUNTDOWN.entries()) {
        setCount(n)
        if (n.length > 1) sfx.go()
        else sfx.countdown(3 - i)
        await sleep(dur(n.length > 1 ? 560 : 780), run.signal)
      }
      void navigate(ROUTES.scenarioGame)
    })().catch(ignoreAbort)
  }

  const [h, m] = scenario.saat.split(':')
  const alarm = (
    <>
      <span>
        <Icon name="siren" />
        KRİZ ALARMI
      </span>
      <span>
        <Icon name="triangle-alert" />
        {upperTr(lowerTr(scenario.sistem))}
      </span>
    </>
  )

  return (
    <main className={s.screen} data-testid="scenario-intro">
      <div className={s.siren} />
      <div className={s.introHome}>
        <LeaveGameButton onLeave={() => useScenarioStore.getState().reset()} />
      </div>
      <div className={s.hz}>
        <div className={s.stripes} />
        <div className={s.mq} aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} style={{ display: 'contents' }}>
              {alarm}
            </span>
          ))}
        </div>
      </div>
      <div className={s.clock}>
        <div className={s.eyebrow}>
          <Icon name="clock" />
          SAAT
        </div>
        <div className={s.clockTime} data-testid="crisis-clock">
          {h}
          <i>:</i>
          {m}
        </div>
        <div className={s.clockChips}>
          <span className={s.chip}>
            <Icon name="map-pin" />
            {scenario.yer}
          </span>
          <span className={s.chip}>
            <Icon name="users" />
            {scenario.olcek}
          </span>
        </div>
      </div>
      <div className={s.imain}>
        <div className={s.ibig}>
          <Icon name={scenario.ikon} />
        </div>
        <h1 className={s.introTitle} data-testid="crisis-title">
          {scenario.baslik}
        </h1>
        <p className={s.tw} ref={textRef} data-testid="crisis-text" />
        <div className={s.eyebrow}>ETKİLENENLER</div>
        <div className={s.aud}>
          {scenario.hedefKitle.map((a) => (
            <span key={a.ad} className={s.chip}>
              <Icon name={a.ikon} />
              {a.ad}
            </span>
          ))}
        </div>
        <div className={s.ibtns}>
          <button
            type="button"
            className={cn(s.btn, s.btnPri)}
            data-testid="crisis-start"
            onClick={startCrisis}
          >
            Krizi başlat <Icon name="play" />
          </button>
          <span className={s.chip}>
            <Icon name="git-commit-horizontal" />5 karar · {stepSec} sn
          </span>
        </div>
      </div>
      {count !== null && (
        <div className={s.cd} data-testid="countdown">
          <b key={count} className={cn(s.cdNum, count.length > 1 && s.cdGo)}>
            {count}
          </b>
        </div>
      )}
    </main>
  )
}
