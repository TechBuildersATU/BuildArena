import { useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { useNavigate } from 'react-router'
import { resetTutorial } from '@/app/firstLaunch'
import { isNativeApp } from '@/app/native'
import { ROUTES } from '@/app/routes'
import { DEFAULT_PIN_TEXT, hasCustomPin } from '@/app/staffPin'
import { useGoBack } from '@/app/useGoBack'
import { usePressGuard } from '@/app/usePress'
import { sfx } from '@/audio/sfx'
import { Icon } from '@/components/Icon'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { PinDialog, PinSetDialog } from '@/components/PinDialog'
import { Logo, VolumeSlider } from '@/components/Bits'
import { findScenario, shortName } from '@/data/scenarioBank'
import { archiveAndReset, useDuels, useScores } from '@/db/database'
import { loadDemoDay } from '@/db/demoData'
import { dayFacts, dayStats } from '@/game/dayStats'
import { HEX } from '@/game/palette'
import { shareTop } from '@/game/scoring'
import { downloadCanvas, drawShareImage, drawStatsImage } from '@/game/shareImage'
import { useScenarioStore } from '@/stores/scenarioStore'
import { DUEL_SECONDS, STEP_SECONDS, useSettingsStore } from '@/stores/settingsStore'
import { useUiStore } from '@/stores/uiStore'
import s from '@/styles/app.module.css'
import { cn } from '@/utils/cn'

const MEDAL = ['var(--gold)', 'var(--silver)', 'var(--bronze)']

type Tab = 'top' | 'stats' | 'set'
const TABS: readonly [Tab, string, string][] = [
  ['top', 'megaphone', 'İlk 3'],
  ['stats', 'chart-bar', 'Gün sonu'],
  ['set', 'settings', 'Ayarlar'],
]

// Staff menu behind the PIN (full prototype §7): export the day's top 3, the end-of-day
// summary, and the booth settings (times, sound, music, vibration, idle tutorial, reset).
export function Admin() {
  const unlocked = useUiStore((st) => st.staffUnlocked)
  const unlockStaff = useUiStore((st) => st.unlockStaff)
  const goBack = useGoBack()

  if (!unlocked) {
    return (
      <main className={s.screen} data-testid="admin-locked">
        <PinDialog onSuccess={unlockStaff} onClose={goBack} />
      </main>
    )
  }
  return <StaffMenu />
}

function StaffMenu() {
  const navigate = useNavigate()
  const lockStaff = useUiStore((st) => st.lockStaff)
  const [tab, setTab] = useState<Tab>('top')

  const home = usePressGuard(() => {
    sfx.tap()
    lockStaff()
    void navigate(ROUTES.home)
  })

  return (
    <main className={s.screen} data-testid="admin" data-tab={tab}>
      <header className={s.bar}>
        <div className={s.brand}>
          <Logo />
          Görevli Menüsü
        </div>
        <span className={s.chip}>
          <Icon name="lock-open" />
          PIN ile açıldı
        </span>
        <div className={s.barR}>
          <div className={s.tabs} role="tablist" aria-label="Görevli menüsü">
            {TABS.map(([id, icon, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                className={cn(s.tab, tab === id && s.tabOn)}
                data-testid={`tab-${id}`}
                onClick={() => {
                  if (tab === id) return
                  sfx.key()
                  setTab(id)
                }}
              >
                <Icon name={icon} />
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={s.ib}
            aria-label="Ana ekran"
            data-testid="btn-home"
            onClick={home}
          >
            <Icon name="house" />
          </button>
        </div>
      </header>

      {tab === 'top' && <TopPane />}
      {tab === 'stats' && <StatsPane />}
      {tab === 'set' && <SettingsPane />}
    </main>
  )
}

function useDownload() {
  const showToast = useUiStore((st) => st.showToast)
  return async (canvas: HTMLCanvasElement | null, name: string) => {
    const result = canvas ? await downloadCanvas(canvas, name) : 'failed'
    if (result === 'cancelled') return // the staff closed Android's share sheet
    if (result === 'saved') {
      sfx.download()
      showToast('check', isNativeApp() ? `${name} kaydedildi` : `${name} indirildi`)
    } else {
      sfx.error()
      showToast('triangle-alert', 'Görsel indirilemedi')
    }
  }
}

function Previews({
  post,
  story,
  labels,
  ids,
}: {
  post: RefObject<HTMLCanvasElement | null>
  story: RefObject<HTMLCanvasElement | null>
  labels: [string, string]
  ids: [string, string]
}) {
  return (
    <div className={s.prevs}>
      <div className={s.prev}>
        <canvas ref={post} style={{ width: 330, height: 412 }} data-testid={ids[0]} />
        <span>{labels[0]}</span>
      </div>
      <div className={s.prev}>
        <canvas ref={story} style={{ width: 232, height: 412 }} data-testid={ids[1]} />
        <span>{labels[1]}</span>
      </div>
    </div>
  )
}

function TopPane() {
  const scores = useScores()
  const download = useDownload()
  const postRef = useRef<HTMLCanvasElement>(null)
  const storyRef = useRef<HTMLCanvasElement>(null)
  const { top, skipped } = useMemo(() => shareTop(scores ?? []), [scores])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (postRef.current) await drawShareImage(postRef.current, 'post', top)
      if (!cancelled && storyRef.current) await drawShareImage(storyRef.current, 'story', top)
    })()
    return () => {
      cancelled = true
    }
  }, [top])

  return (
    <div className={s.pane} data-testid="pane-top">
      <div className={s.adm}>
        <h2>İlk 3&apos;ü dışa aktar</h2>
        <p className={s.lead}>
          Paylaşım izni veren oyuncular arasından en yüksek puanlı 3 kişi. Görseller kulüp logosu ve
          renkleriyle hazırlanır.
        </p>
        <div className={s.alist} data-testid="admin-top3">
          {top.length ? (
            top.map((e, i) => {
              const sc = findScenario(e.senaryo)
              return (
                <div key={e.id} className={s.arow} data-testid="admin-top3-row">
                  <span className={s.md} style={{ '--m': MEDAL[i] } as CSSProperties}>
                    {i + 1}
                  </span>
                  <span>
                    <b>{e.nick}</b>
                    <br />
                    <small>
                      {e.unvan} · {sc ? shortName(sc) : e.senaryo}
                    </small>
                  </span>
                  <span className={s.arowScore}>{e.score}</span>
                  <Icon name="megaphone" />
                </div>
              )
            })
          ) : (
            <div className={s.tempty}>Paylaşım izni veren oyuncu yok.</div>
          )}
        </div>
        {skipped.length > 0 && (
          <div className={s.skip} data-testid="admin-skipped">
            <Icon name="info" />
            <span>
              {skipped.map((e, i) => (
                <span key={e.id}>
                  {i > 0 && ', '}
                  <b>{e.nick}</b>
                </span>
              ))}{' '}
              paylaşım izni vermediği için listeye alınmadı.
            </span>
          </div>
        )}
        <div className={s.abtns}>
          <button
            type="button"
            className={cn(s.btn, s.btnPri)}
            data-testid="dl-post"
            onClick={() => void download(postRef.current, 'buildarena-ilk3-gonderi.png')}
          >
            <Icon name="image-down" />
            Gönderi PNG · 1080×1350
          </button>
          <button
            type="button"
            className={s.btn}
            data-testid="dl-story"
            onClick={() => void download(storyRef.current, 'buildarena-ilk3-hikaye.png')}
          >
            <Icon name="smartphone" />
            Hikâye PNG · 1080×1920
          </button>
        </div>
        <div className={s.anote}>
          <Icon name="info" />
          Otomatik paylaşım yapılmaz. Kulübün sosyal medya ekibi görseli kontrol edip paylaşır.
        </div>
      </div>
      <Previews
        post={postRef}
        story={storyRef}
        labels={['Instagram gönderisi · 1080×1350', 'Hikâye · 1080×1920']}
        ids={['preview-post', 'preview-story']}
      />
    </div>
  )
}

/** The fact's Lucide icon as standalone SVG markup, inked for the share image's light tile. */
function factIconSvg(root: HTMLElement | null, index: number): string | null {
  const svg = root?.querySelector(`[data-fact-icon="${index}"] svg`)
  if (!svg) return null
  let markup = svg.outerHTML.replaceAll('currentColor', HEX.ink)
  if (!markup.includes('xmlns='))
    markup = markup.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
  return markup
}

function StatsPane() {
  const scores = useScores()
  const duels = useDuels()
  const download = useDownload()
  const postRef = useRef<HTMLCanvasElement>(null)
  const storyRef = useRef<HTMLCanvasElement>(null)
  const factsRef = useRef<HTMLDivElement>(null)
  const st = useMemo(() => dayStats(scores ?? [], duels ?? []), [scores, duels])
  const facts = useMemo(() => dayFacts(st), [st])

  useEffect(() => {
    let cancelled = false
    const icon = (i: number) => factIconSvg(factsRef.current, i)
    void (async () => {
      if (postRef.current) await drawStatsImage(postRef.current, 'post', st, facts, icon)
      if (!cancelled && storyRef.current)
        await drawStatsImage(storyRef.current, 'story', st, facts, icon)
    })()
    return () => {
      cancelled = true
    }
  }, [st, facts])

  const tiles: [number, string][] = [
    [st.senaryo, 'kriz çözüldü'],
    [st.duello, 'düello oynandı'],
    [st.ort, 'ortalama senaryo puanı'],
  ]

  return (
    <div className={s.pane} data-testid="pane-stats">
      <div className={s.adm}>
        <h2>Gün sonu özeti</h2>
        <p className={s.lead}>
          Bugünün oyunlarından otomatik çıkarılır; hiçbir kişisel veri içermez. Kulübün hesabında
          paylaşılmaya hazır.
        </p>
        <div className={s.stats}>
          {tiles.map(([v, label], i) => (
            <div key={label} className={s.stat} data-testid={`stat-${i}`}>
              <b>{v}</b>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <div className={s.facts2} ref={factsRef} data-testid="stat-facts">
          {facts.length ? (
            facts.map((f, i) => (
              <div key={f.label} data-testid="stat-fact">
                <span data-fact-icon={i} style={{ display: 'contents' }}>
                  <Icon name={f.icon} />
                </span>
                <span>
                  {f.label}: <b>{f.value}</b>
                  {f.side && ` · ${f.side}`}
                </span>
              </div>
            ))
          ) : (
            <div>Özet için henüz yeterli oyun yok.</div>
          )}
        </div>
        <div className={s.abtns}>
          <button
            type="button"
            className={cn(s.btn, s.btnPri)}
            data-testid="dl-stats"
            onClick={() => void download(postRef.current, 'buildarena-gun-sonu-ozeti.png')}
          >
            <Icon name="image-down" />
            Özet PNG · 1080×1350
          </button>
          <button
            type="button"
            className={s.btn}
            data-testid="dl-stats-story"
            onClick={() => void download(storyRef.current, 'buildarena-gun-sonu-hikaye.png')}
          >
            <Icon name="smartphone" />
            Hikâye PNG · 1080×1920
          </button>
        </div>
      </div>
      <Previews
        post={postRef}
        story={storyRef}
        labels={['Gönderi · 1080×1350', 'Hikâye · 1080×1920']}
        ids={['preview-stats', 'preview-stats-story']}
      />
    </div>
  )
}

type SwitchKey = 'sfx' | 'music' | 'haptics' | 'idleTut'

const SWITCHES: readonly [SwitchKey, string, string, string][] = [
  ['sfx', 'volume-2', 'Ses efektleri', 'Dokunma, sürükleme ve sonuç sesleri'],
  [
    'music',
    'music',
    'Arka plan müziği',
    'Menüde sakin lo-fi, senaryoda gizemli, düelloda ritmik parça',
  ],
  ['haptics', 'vibrate', 'Titreşim', 'Destekleyen tabletlerde kısa dokunsal geri bildirim'],
  [
    'idleTut',
    'presentation',
    'Bekleme modunda tutorial döngüsü',
    '60 sn dokunulmazsa slaytlar kendiliğinden döner',
  ],
]

function SettingsPane() {
  const settings = useSettingsStore()
  const showToast = useUiStore((st) => st.showToast)
  const [confirming, setConfirming] = useState(false)
  const [changingPin, setChangingPin] = useState(false)
  const [customPin, setCustomPin] = useState(hasCustomPin)

  const seg = (key: 'duelSec' | 'stepSec', values: readonly number[]) => (
    <div className={s.seg3} role="group">
      {values.map((v) => (
        <button
          key={v}
          type="button"
          className={cn(settings[key] === v && s.segOn)}
          aria-pressed={settings[key] === v}
          data-testid={`set-${key}-${v}`}
          onClick={() => {
            sfx.key()
            settings.set(key, v)
          }}
        >
          {v} sn
        </button>
      ))}
    </div>
  )

  const flip = (key: SwitchKey) => {
    const on = !settings[key]
    settings.toggle(key)
    // the effect plays through the bus it just switched; for sfx itself, play it when turning on
    if (on) sfx.toggleOn()
    else sfx.toggleOff()
  }

  const resetDay = async () => {
    setConfirming(false)
    await archiveAndReset()
    useScenarioStore.setState({ entry: null })
    sfx.stamp()
    showToast('archive', 'Gün arşivlendi, tablolar sıfırlandı')
  }

  return (
    <div className={s.pane} data-testid="pane-set">
      <div className={s.adm} style={{ width: 860, left: 210 }}>
        <h2>Ayarlar</h2>
        <div className={s.setg}>
          <div className={s.setr}>
            <Icon name="swords" />
            <div className={s.setLab}>
              Düello süresi
              <small>Stant kalabalıksa 45 ya da 60 sn; varsayılan 90 sn</small>
            </div>
            {seg('duelSec', DUEL_SECONDS)}
          </div>
          <div className={s.setr}>
            <Icon name="route" />
            <div className={s.setLab}>
              Senaryo adım süresi
              <small>Varsayılan 20 sn</small>
            </div>
            {seg('stepSec', STEP_SECONDS)}
          </div>
          <div className={s.setr}>
            <Icon name="sliders-horizontal" />
            <div className={s.setLab}>
              Ses seviyesi
              <small>Müzik ve efektlerin ortak seviyesi (müzik düğmesinde de var)</small>
            </div>
            <VolumeSlider testId="set-volume" />
          </div>
          {SWITCHES.map(([key, icon, label, hint]) => (
            <div key={key} className={s.setr}>
              <Icon name={icon} />
              <div className={s.setLab}>
                {label}
                <small>{hint}</small>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings[key]}
                aria-label={label}
                className={s.setSwitch}
                data-testid={`set-${key}`}
                onClick={() => flip(key)}
              >
                <span className={cn(s.switch, settings[key] && s.switchOn)} />
              </button>
            </div>
          ))}
        </div>
        <div className={s.abtns}>
          <button
            type="button"
            className={s.btn}
            data-testid="admin-reset-tutorial"
            onClick={() => {
              sfx.tap()
              resetTutorial()
              showToast('check', 'Tutorial bir sonraki açılışta gösterilecek')
            }}
          >
            <Icon name="rotate-ccw" />
            Tutorial&apos;ı sıfırla
          </button>
          <button
            type="button"
            className={cn(s.btn, s.btnDanger)}
            data-testid="admin-reset"
            onClick={() => {
              sfx.tap()
              setConfirming(true)
            }}
          >
            <Icon name="archive" />
            Günü arşivle ve sıfırla
          </button>
          <button
            type="button"
            className={s.btn}
            data-testid="admin-demo"
            onClick={() => {
              sfx.tap()
              void loadDemoDay().then(() => showToast('database', 'Örnek veriler yüklendi'))
            }}
          >
            <Icon name="database" />
            Örnek verileri yükle
          </button>
          <button
            type="button"
            className={s.btn}
            data-testid="admin-pin"
            onClick={() => {
              sfx.tap()
              setChangingPin(true)
            }}
          >
            <Icon name="key-round" />
            PIN&apos;i değiştir
          </button>
        </div>
        <div className={s.anote}>
          <Icon name="info" />
          Sıfırlanan gün silinmez, tarihli bir arşive taşınır.
        </div>
        <div className={s.anote} data-testid="admin-pin-state" data-custom={customPin}>
          {customPin ? (
            <>
              <Icon name="shield-check" />
              PIN yalnızca bu tablette saklanır, kodda ve GitHub&apos;da görünmez. Not edin:
              unutulursa veriler silinmeden açılamaz.
            </>
          ) : (
            <>
              <Icon name="triangle-alert" />
              Herkesin bildiği varsayılan PIN ({DEFAULT_PIN_TEXT}) kullanılıyor; etkinlikten önce bu
              tablete özel bir PIN belirleyin.
            </>
          )}
        </div>
      </div>

      {changingPin && (
        <PinSetDialog
          onClose={() => setChangingPin(false)}
          onDone={() => {
            setChangingPin(false)
            setCustomPin(true)
            showToast('key-round', 'Yeni PIN bu tablete kaydedildi')
          }}
        />
      )}

      {confirming && (
        <ConfirmDialog
          title="Günü arşivle"
          message="Günün skorları ve düelloları arşivlenip tablolar sıfırlansın mı? Kayıtlar silinmez, tarihli arşive taşınır."
          confirmLabel="Arşivle ve sıfırla"
          onCancel={() => setConfirming(false)}
          onConfirm={() => void resetDay()}
        />
      )}
    </div>
  )
}
