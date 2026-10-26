import { useSettingsStore } from '@/stores/settingsStore'
import { audioRunning, audioStats, getAudio } from './engine'
import { haptic } from './haptics'

// Sound effects, synthesised with Web Audio (no files, works offline). The palette is soft and
// "toy-like" — bells, marimba, wood blocks and filtered air — at low volume, so a busy booth
// isn't annoyed. Each sound varies its pitch slightly, so repeats never feel mechanical.

type Wave = OscillatorType

interface VoiceOpts {
  type?: Wave
  vol?: number
  at?: number
  attack?: number
  /** frequency to glide to by the end */
  glide?: number
  /** low-pass cut-off in Hz */
  lp?: number
}

let noiseBuf: AudioBuffer | null = null
const lastPlayed = new Map<string, number>()

function out(): { ctx: AudioContext; dest: AudioNode } | null {
  if (!useSettingsStore.getState().sfx || !audioRunning()) return null
  const g = getAudio()
  return g ? { ctx: g.ctx, dest: g.sfx } : null
}

/** ±cents of random detune for variety. */
const vary = (f: number, cents = 25) => f * Math.pow(2, ((Math.random() * 2 - 1) * cents) / 1200)
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12)

function voice(freq: number, dur: number, o: VoiceOpts = {}) {
  const a = out()
  if (!a) return
  const { ctx, dest } = a
  const t = ctx.currentTime + (o.at ?? 0)
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = o.type ?? 'sine'
  osc.frequency.setValueAtTime(freq, t)
  if (o.glide) osc.frequency.exponentialRampToValueAtTime(o.glide, t + dur)
  const vol = o.vol ?? 0.08
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(vol, t + (o.attack ?? 0.006))
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  let node: AudioNode = osc
  if (o.lp) {
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = o.lp
    node = osc.connect(f)
  }
  node.connect(gain).connect(dest)
  osc.start(t)
  osc.stop(t + dur + 0.05)
}

function noise(
  dur: number,
  o: {
    vol?: number
    at?: number
    type?: BiquadFilterType
    freq?: number
    to?: number
    q?: number
  } = {},
) {
  const a = out()
  if (!a) return
  const { ctx, dest } = a
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  const t = ctx.currentTime + (o.at ?? 0)
  const src = ctx.createBufferSource()
  src.buffer = noiseBuf
  const f = ctx.createBiquadFilter()
  f.type = o.type ?? 'bandpass'
  f.frequency.setValueAtTime(o.freq ?? 1500, t)
  if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + dur)
  f.Q.value = o.q ?? 1.2
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(o.vol ?? 0.05, t + Math.min(0.03, dur / 3))
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(f).connect(gain).connect(dest)
  src.start(t, Math.random() * 0.5)
  src.stop(t + dur + 0.05)
}

/** Bell / marimba: a sine with two inharmonic partials that fade faster. */
function bell(freq: number, dur = 0.5, vol = 0.06, at = 0) {
  voice(freq, dur, { vol, at, attack: 0.003 })
  voice(freq * 2.76, dur * 0.45, { vol: vol * 0.32, at, attack: 0.002 })
  voice(freq * 5.4, dur * 0.2, { vol: vol * 0.12, at, attack: 0.002 })
}

/** Soft plucked string. */
function pluck(freq: number, dur = 0.25, vol = 0.07, at = 0) {
  voice(freq, dur, { type: 'triangle', vol, at, attack: 0.004, lp: 2600 })
}

/** Wooden "tok": a falling sine thump. */
function wood(freq: number, vol = 0.12, at = 0) {
  voice(freq, 0.09, { vol, at, attack: 0.002, glide: freq * 0.55 })
}

/** Skips a sound if the same one played less than `ms` ago (typing, fast ticks). */
function limit(key: string, ms: number): boolean {
  const now = performance.now()
  if (now - (lastPlayed.get(key) ?? -1e9) < ms) return true
  lastPlayed.set(key, now)
  return false
}

function count(name: string) {
  audioStats.sfx += 1
  audioStats.lastSfx = name
}

const PENTA = [69, 72, 74, 76, 79, 81, 84] // A minor pentatonic, A4…C6
const pentaPick = () => PENTA[Math.floor(Math.random() * (PENTA.length - 2))]

export const sfx = {
  /** generic button */
  tap() {
    count('tap')
    haptic('tap')
    noise(0.03, { type: 'highpass', freq: 3200, vol: 0.035 })
    voice(vary(1700), 0.04, { type: 'triangle', vol: 0.025, glide: 1300 })
  },
  /** moving between screens */
  nav() {
    count('nav')
    noise(0.28, { freq: 500, to: 2600, q: 0.8, vol: 0.03 })
  },
  toggleOn() {
    count('toggleOn')
    haptic('tap')
    bell(vary(880, 10), 0.18, 0.045)
    bell(vary(1318, 10), 0.24, 0.04, 0.07)
  },
  toggleOff() {
    count('toggleOff')
    haptic('tap')
    bell(vary(1318, 10), 0.16, 0.04)
    bell(vary(880, 10), 0.22, 0.035, 0.07)
  },
  /** typing a letter */
  key() {
    if (limit('key', 35)) return
    count('key')
    voice(vary(2300, 60), 0.025, { type: 'square', vol: 0.01, lp: 4000 })
  },
  error() {
    count('error')
    haptic('error')
    voice(233, 0.12, { type: 'square', vol: 0.035, lp: 900 })
    voice(185, 0.18, { type: 'square', vol: 0.035, lp: 800, at: 0.11 })
  },
  // ---- duel cards
  lift() {
    count('lift')
    haptic('lift')
    pluck(vary(midi(74)), 0.12, 0.06)
    noise(0.05, { freq: 2200, vol: 0.018 })
  },
  drop() {
    count('drop')
    haptic('drop')
    wood(vary(260, 40), 0.16)
    bell(vary(midi(84), 20), 0.28, 0.035, 0.025)
  },
  slideBack() {
    count('slideBack')
    noise(0.2, { freq: 2200, to: 480, vol: 0.03 })
  },
  undo() {
    count('undo')
    haptic('tap')
    voice(vary(720), 0.14, { type: 'triangle', vol: 0.045, glide: 480 })
  },
  clear() {
    count('clear')
    haptic('select')
    noise(0.32, { freq: 2600, to: 300, vol: 0.04 })
    voice(196, 0.2, { type: 'triangle', vol: 0.04, glide: 140 })
  },
  ready(player: 0 | 1) {
    count('ready')
    haptic('select')
    const base = player === 0 ? 69 : 76
    pluck(midi(base), 0.2, 0.06)
    pluck(midi(base + 7), 0.3, 0.05, 0.08)
  },
  holdStart() {
    count('holdStart')
    voice(380, 0.6, { type: 'triangle', vol: 0.03, glide: 760, attack: 0.05 })
  },
  finishSide() {
    count('finishSide')
    haptic('success')
    ;[69, 73, 76, 81].forEach((n, i) => pluck(midi(n), 0.4, 0.045, i * 0.05))
  },
  // ---- timers
  tick(urgent = false) {
    if (limit('tick', 120)) return
    count('tick')
    if (urgent) haptic('tick')
    wood(urgent ? vary(1500, 15) : vary(1150, 15), urgent ? 0.05 : 0.035)
  },
  countdown(n: number) {
    count('countdown')
    haptic('select')
    bell(midi([79, 76, 72][n - 1] ?? 72), 0.45, 0.06)
  },
  go() {
    count('go')
    haptic('success')
    ;[72, 76, 79, 84].forEach((n, i) => bell(midi(n), 0.7, 0.045, i * 0.035))
    noise(0.5, { type: 'highpass', freq: 5000, vol: 0.02, at: 0.05 })
  },
  // ---- scenario
  pick() {
    count('pick')
    haptic('select')
    const n = pentaPick()
    bell(vary(midi(n), 8), 0.3, 0.06)
    bell(vary(midi(n + 5), 8), 0.42, 0.05, 0.08)
  },
  flutter() {
    count('flutter')
    for (let i = 0; i < 8; i++)
      voice(vary(2200 + Math.random() * 1000, 80), 0.03, { vol: 0.012, at: i * 0.06 })
    noise(0.55, { freq: 3800, q: 3, vol: 0.012 })
  },
  reveal() {
    count('reveal')
    bell(vary(midi(88), 10), 0.6, 0.03)
    bell(vary(midi(83), 10), 0.7, 0.025, 0.06)
  },
  timeout() {
    count('timeout')
    haptic('warn')
    ;[67, 64, 60].forEach((n, i) =>
      voice(midi(n), 0.3, { type: 'triangle', vol: 0.045, at: i * 0.16, lp: 1800 }),
    )
  },
  alarm() {
    count('alarm')
    for (let i = 0; i < 2; i++) {
      voice(660, 0.32, { vol: 0.03, at: i * 0.38, glide: 880, attack: 0.04 })
      voice(880, 0.3, { vol: 0.025, at: i * 0.38 + 0.18, glide: 660, attack: 0.04 })
    }
  },
  wheelTick(i: number) {
    count('wheelTick')
    wood(midi(PENTA[i % 5] + 12), 0.05)
  },
  wheelLand() {
    count('wheelLand')
    haptic('stamp')
    voice(110, 0.25, { vol: 0.2, glide: 55, attack: 0.003 })
    for (let i = 0; i < 5; i++)
      bell(midi(PENTA[Math.floor(Math.random() * PENTA.length)] + 12), 0.4, 0.02, 0.08 + i * 0.05)
  },
  stamp() {
    count('stamp')
    haptic('stamp')
    voice(130, 0.22, { vol: 0.24, glide: 52, attack: 0.002 })
    noise(0.09, { type: 'lowpass', freq: 900, vol: 0.07 })
  },
  countTick() {
    if (limit('countTick', 55)) return
    voice(vary(2600, 40), 0.02, { vol: 0.012 })
  },
  rankUp() {
    count('rankUp')
    ;[76, 79, 84].forEach((n, i) => bell(midi(n), 0.4, 0.045, i * 0.09))
  },
  fanfare() {
    count('fanfare')
    haptic('success')
    ;[72, 76, 79, 84].forEach((n, i) => bell(midi(n), 0.55, 0.055, i * 0.11))
    ;[72, 76, 79].forEach((n) => pluck(midi(n - 12), 0.9, 0.03, 0.45))
    noise(0.6, { type: 'highpass', freq: 6000, vol: 0.018, at: 0.4 })
  },
  win() {
    count('win')
    haptic('win')
    ;[72, 76, 79, 84, 88].forEach((n, i) => bell(midi(n), 0.6, 0.055, i * 0.09))
    ;[60, 64, 67].forEach((n) => pluck(midi(n), 1.1, 0.035, 0.45))
    noise(0.8, { type: 'highpass', freq: 6500, vol: 0.02, at: 0.45 })
  },
  tie() {
    count('tie')
    bell(midi(76), 0.5, 0.05)
    bell(midi(76), 0.5, 0.04, 0.2)
  },
  confetti() {
    count('confetti')
    for (let i = 0; i < 6; i++)
      noise(0.04, {
        type: 'highpass',
        freq: 3000 + Math.random() * 3000,
        vol: 0.02,
        at: Math.random() * 0.5,
      })
  },
  // ---- staff
  unlock() {
    count('unlock')
    haptic('success')
    bell(midi(76), 0.3, 0.05)
    bell(midi(83), 0.45, 0.05, 0.09)
  },
  download() {
    count('download')
    bell(midi(84), 0.4, 0.05)
    bell(midi(91), 0.5, 0.04, 0.08)
  },
  // ---- nickname studio
  reel() {
    if (limit('reel', 45)) return
    count('reel')
    wood(vary(900, 120), 0.03)
  },
  reelStop() {
    count('reelStop')
    haptic('select')
    pluck(midi(pentaPick() + 12), 0.25, 0.05)
  },
  wake() {
    count('wake')
    ;[81, 84, 88].forEach((n, i) => bell(midi(n), 0.35, 0.03, i * 0.05))
  },
}
