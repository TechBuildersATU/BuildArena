import { TEST_FLAGS_ENABLED } from '@/app/testFlags'
import { useSettingsStore } from '@/stores/settingsStore'
import { audioRunning, getAudio, onAudioUnlocked } from './engine'

// Generative background music, one piece per part of the booth game. Every piece is a short
// chord loop played by soft synth voices; the arpeggio, melody and fills are re-drawn every bar,
// so the loop never feels short. Changing screens crossfades between pieces.
//
//   menu      "Kahve molası" — chill lo-fi, 74 BPM: Dm9 – G13 – Cmaj9 – Am7, warm electric-piano
//             chords, round bass, brushed beat and a little vinyl crackle.
//   scenario  "Kriz masası" — calm and mysterious, 64 BPM in D dorian: Dm(add9) – B♭maj7♯11 – Gm9 –
//             A7sus4; a slowly breathing pad, glassy bells through a long echo, a soft heartbeat
//             and the odd gust of wind.
//   duel      "Arena" — driving and competitive, 124 BPM in E minor: Em – C – G – D, octave bass
//             on eighths, sixteenth plucks, syncopated stabs, four-on-the-floor kick, claps and
//             a snare fill every four bars. On the task card ("duelBuild") the beat is held back and
//             the sound is muffled; when the round starts the beat drops in and the filter opens.

export type Mood = 'menu' | 'scenario' | 'duelBuild' | 'duel'
type SongId = 'menu' | 'scenario' | 'duel'

/** drums: level of the beat (0–1); open: false muffles the whole piece */
const MOODS: Record<Mood, { song: SongId; drums: number; open: boolean }> = {
  menu: { song: 'menu', drums: 1, open: true },
  scenario: { song: 'scenario', drums: 1, open: true },
  duelBuild: { song: 'duel', drums: 0.45, open: false },
  duel: { song: 'duel', drums: 1, open: true },
}

interface Chord {
  root: number
  pad: readonly number[]
}

interface Song {
  bpm: number
  barsPerChord: number
  chords: readonly Chord[]
  /** bus level, to balance the pieces against each other */
  level: number
  /** echo time in sixteenths and its feedback */
  echo: [number, number]
  play: (ctx: AudioContext, n: Nodes, step: number, t: number, chord: Chord) => void
}

interface Nodes {
  song: SongId
  six: number
  bus: GainNode
  /** muffles the whole piece (duel task card) */
  filter: BiquadFilterNode
  pad: BiquadFilterNode
  echo: DelayNode
  drums: GainNode
  lfo: OscillatorNode | null
}

const LOOKAHEAD = 0.15
const OPEN_HZ = 16000
const MUFFLED_HZ = 1400

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12)
const rand = <T>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)]

// ---------------------------------------------------------------- voices

interface ToneOpts {
  type?: OscillatorType
  vol: number
  attack: number
  detune?: number
  /** low-pass cut-off in Hz */
  lp?: number
}

function tone(
  ctx: AudioContext,
  dest: AudioNode,
  freq: number,
  t: number,
  dur: number,
  o: ToneOpts,
) {
  const osc = ctx.createOscillator()
  osc.type = o.type ?? 'sine'
  osc.frequency.value = freq
  osc.detune.value = o.detune ?? 0
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(o.vol, t + o.attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  let node: AudioNode = osc
  if (o.lp) {
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = o.lp
    node = osc.connect(f)
  }
  node.connect(g).connect(dest)
  osc.start(t)
  osc.stop(t + dur + 0.05)
}

let noiseBuf: AudioBuffer | null = null

function noise(
  ctx: AudioContext,
  dest: AudioNode,
  t: number,
  dur: number,
  freq: number,
  vol: number,
  type: BiquadFilterType,
  attack = 0.002,
) {
  if (!noiseBuf || noiseBuf.sampleRate !== ctx.sampleRate) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  const src = ctx.createBufferSource()
  src.buffer = noiseBuf
  const f = ctx.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(f).connect(g).connect(dest)
  src.start(t, Math.random() * 1.5)
  src.stop(t + dur + 0.05)
}

function kick(ctx: AudioContext, dest: AudioNode, t: number, vol: number, from = 130, to = 42) {
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.frequency.setValueAtTime(from, t)
  osc.frequency.exponentialRampToValueAtTime(to, t + 0.16)
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24)
  osc.connect(g).connect(dest)
  osc.start(t)
  osc.stop(t + 0.28)
}

/** A glassy bell: a sine with a quiet inharmonic partial. */
function bell(ctx: AudioContext, dest: AudioNode, note: number, t: number, vol: number) {
  tone(ctx, dest, midi(note), t, 1.6, { vol, attack: 0.004 })
  tone(ctx, dest, midi(note) * 2.76, t, 0.5, { vol: vol * 0.25, attack: 0.002 })
}

// ---------------------------------------------------------------- pieces

const SONGS: Record<SongId, Song> = {
  menu: {
    bpm: 74,
    barsPerChord: 2,
    chords: [
      { root: 38, pad: [53, 57, 60, 64] }, // Dm9
      { root: 43, pad: [53, 59, 64, 69] }, // G13
      { root: 36, pad: [52, 55, 59, 62] }, // Cmaj9
      { root: 45, pad: [55, 60, 64, 69] }, // Am7
    ],
    level: 1,
    echo: [3, 0.3],
    play(ctx, n, s, t, chord) {
      const bar = Math.floor(s / 16)
      const pos = s % 16
      const six = n.six
      const swing = pos % 2 === 1 ? six * 0.16 : 0
      if (pos === 0 && bar % 2 === 0) {
        for (const note of chord.pad)
          for (const detune of [-6, 5])
            tone(ctx, n.pad, midi(note), t, six * 32 + 0.8, {
              type: 'triangle',
              vol: 0.014,
              attack: 1.1,
              detune,
            })
      }
      // electric-piano chords on "2-and" and "4", now and then left out
      if ((pos === 6 || pos === 12) && Math.random() < 0.8) {
        for (const note of chord.pad) {
          tone(ctx, n.bus, midi(note + 12), t + swing, 1.3, { vol: 0.016, attack: 0.012 })
          tone(ctx, n.echo, midi(note + 12), t + swing, 0.6, { vol: 0.006, attack: 0.012 })
        }
      }
      if (pos === 0) tone(ctx, n.bus, midi(chord.root), t, six * 7, { vol: 0.12, attack: 0.03 })
      if (pos === 10 && Math.random() < 0.6)
        tone(ctx, n.bus, midi(chord.root + 7), t, six * 4, { vol: 0.08, attack: 0.03 })
      if ((pos === 4 || pos === 14) && Math.random() < 0.2)
        tone(ctx, n.echo, midi(rand([72, 74, 76, 79, 81])), t + swing, 1, {
          vol: 0.018,
          attack: 0.03,
        })
      // brushed beat
      if (pos === 0 || (pos === 10 && Math.random() < 0.5)) kick(ctx, n.drums, t, 0.13, 110, 40)
      if (pos === 4 || pos === 12) noise(ctx, n.drums, t, 0.16, 1500, 0.03, 'bandpass', 0.01)
      if (pos % 2 === 0 || Math.random() < 0.25)
        noise(ctx, n.drums, t + swing, 0.05, 7200, 0.011, 'highpass')
      if (Math.random() < 0.06)
        noise(ctx, n.drums, t + Math.random() * six, 0.012, 3000, 0.01, 'highpass')
    },
  },

  scenario: {
    bpm: 64,
    barsPerChord: 2,
    chords: [
      { root: 38, pad: [57, 62, 64, 65] }, // Dm(add9)
      { root: 46, pad: [62, 64, 65, 69] }, // B♭maj7♯11
      { root: 43, pad: [58, 62, 65, 69] }, // Gm9
      { root: 45, pad: [55, 62, 64, 69] }, // A7sus4
    ],
    level: 1.05,
    echo: [6, 0.42],
    play(ctx, n, s, t, chord) {
      const bar = Math.floor(s / 16)
      const pos = s % 16
      const six = n.six
      if (pos === 0 && bar % 2 === 0) {
        for (const note of chord.pad) {
          tone(ctx, n.pad, midi(note), t, six * 32 + 1.5, { vol: 0.017, attack: 2.2, detune: -4 })
          tone(ctx, n.pad, midi(note), t, six * 32 + 1.5, {
            type: 'triangle',
            vol: 0.01,
            attack: 2.6,
            detune: 6,
          })
        }
      }
      if (pos === 0)
        tone(ctx, n.bus, midi(chord.root - 12), t, six * 15, { vol: 0.11, attack: 0.25 })
      if (pos === 8 && Math.random() < 0.5)
        tone(ctx, n.bus, midi(chord.root - 5), t, six * 7, { vol: 0.06, attack: 0.2 })
      // glassy bells in D dorian through the long echo
      if ([0, 6, 8, 14].includes(pos) && Math.random() < 0.3)
        bell(ctx, n.echo, rand([74, 76, 77, 79, 81, 83, 86]), t, 0.016)
      // heartbeat: lub-dub on the first beat of each bar
      if (pos === 0) kick(ctx, n.drums, t, 0.1, 75, 38)
      if (pos === 3) kick(ctx, n.drums, t, 0.06, 70, 38)
      // a gust of wind every four bars
      if (pos === 0 && bar % 4 === 2) noise(ctx, n.drums, t, six * 24, 650, 0.012, 'bandpass', 2.5)
    },
  },

  duel: {
    bpm: 124,
    barsPerChord: 1,
    chords: [
      { root: 40, pad: [64, 67, 71] }, // Em
      { root: 36, pad: [64, 67, 72] }, // C
      { root: 43, pad: [62, 67, 71] }, // G
      { root: 38, pad: [62, 66, 69] }, // D
    ],
    level: 0.85,
    echo: [3, 0.22],
    play(ctx, n, s, t, chord) {
      const bar = Math.floor(s / 16)
      const pos = s % 16
      // octave bass on eighths
      if (pos % 2 === 0) {
        const up = pos % 4 === 2
        tone(ctx, n.bus, midi(chord.root + (up ? 12 : 0)), t, 0.13, {
          type: 'sawtooth',
          vol: 0.05,
          attack: 0.005,
          lp: 650,
        })
      }
      // sixteenth plucks over the chord, a fresh pattern each bar
      const pattern = [0, 1, 2, 1, 0, 2, 1, 2]
      if (Math.random() < 0.9) {
        const note = chord.pad[pattern[(pos + bar) % pattern.length]] + 12
        tone(ctx, n.bus, midi(note), t, 0.09, {
          type: 'square',
          vol: 0.013,
          attack: 0.003,
          lp: 2400,
        })
        if (pos % 4 === 0)
          tone(ctx, n.echo, midi(note), t, 0.09, {
            type: 'square',
            vol: 0.006,
            attack: 0.003,
            lp: 2400,
          })
      }
      // syncopated stabs
      if (pos === 0 || pos === 6 || pos === 10)
        for (const note of chord.pad)
          tone(ctx, n.bus, midi(note), t, 0.2, {
            type: 'sawtooth',
            vol: 0.011,
            attack: 0.006,
            lp: 1900,
          })
      // drums: four on the floor, claps on 2 and 4, hats, a fill every fourth bar
      if (pos % 4 === 0) kick(ctx, n.drums, t, 0.2, 150, 45)
      if (pos === 4 || pos === 12) {
        noise(ctx, n.drums, t, 0.14, 1800, 0.05, 'bandpass')
        tone(ctx, n.drums, 190, t, 0.08, { type: 'triangle', vol: 0.03, attack: 0.002 })
      }
      if (pos % 2 === 1) noise(ctx, n.drums, t, 0.035, 8000, 0.012, 'highpass')
      if (pos % 4 === 2) noise(ctx, n.drums, t, 0.12, 6500, 0.018, 'highpass')
      if (bar % 4 === 3 && pos >= 12)
        noise(ctx, n.drums, t, 0.07, 1600, 0.02 + (pos - 12) * 0.008, 'bandpass')
    },
  },
}

// ---------------------------------------------------------------- player

let nodes: Nodes | null = null
let timer: number | undefined
let nextTime = 0
let step = 0
let mood: Mood = 'menu'

export const musicState = { playing: false, mood: 'menu' as Mood, song: 'menu' as SongId }

function build(ctx: AudioContext, dest: AudioNode, id: SongId): Nodes {
  const song = SONGS[id]
  const six = 60 / song.bpm / 4
  const bus = ctx.createGain()
  bus.gain.value = 0
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = MOODS[mood].open ? OPEN_HZ : MUFFLED_HZ
  filter.Q.value = 0.5
  bus.connect(filter).connect(dest)
  const pad = ctx.createBiquadFilter()
  pad.type = 'lowpass'
  pad.frequency.value = id === 'scenario' ? 900 : 1100
  pad.Q.value = 0.3
  pad.connect(bus)
  const echo = ctx.createDelay(2)
  echo.delayTime.value = six * song.echo[0]
  const feedback = ctx.createGain()
  feedback.gain.value = song.echo[1]
  const echoTone = ctx.createBiquadFilter()
  echoTone.type = 'lowpass'
  echoTone.frequency.value = 1900
  echo.connect(echoTone).connect(feedback).connect(echo)
  echoTone.connect(bus)
  const drums = ctx.createGain()
  drums.gain.value = MOODS[mood].drums
  drums.connect(bus)
  // the scenario pad slowly "breathes": a very slow filter sweep
  let lfo: OscillatorNode | null = null
  if (id === 'scenario') {
    lfo = ctx.createOscillator()
    lfo.frequency.value = 0.045
    const depth = ctx.createGain()
    depth.gain.value = 450
    lfo.connect(depth).connect(pad.frequency)
    lfo.start()
  }
  return { song: id, six, bus, filter, pad, echo, drums, lfo }
}

function release(ctx: AudioContext, old: Nodes, fade: number) {
  old.bus.gain.cancelScheduledValues(ctx.currentTime)
  old.bus.gain.setTargetAtTime(0, ctx.currentTime, fade)
  window.setTimeout(() => {
    old.lfo?.stop()
    old.filter.disconnect()
  }, 2500)
}

function schedule() {
  const g = getAudio()
  if (!g || !nodes) return
  const song = SONGS[nodes.song]
  while (nextTime < g.ctx.currentTime + LOOKAHEAD) {
    const bar = Math.floor(step / 16)
    const chord = song.chords[Math.floor(bar / song.barsPerChord) % song.chords.length]
    song.play(g.ctx, nodes, step, nextTime, chord)
    nextTime += nodes.six
    step += 1
  }
}

function begin(ctx: AudioContext, dest: AudioNode, id: SongId) {
  nodes = build(ctx, dest, id)
  nodes.bus.gain.setTargetAtTime(SONGS[id].level, ctx.currentTime, 0.8)
  nextTime = ctx.currentTime + 0.1
  step = 0
  musicState.song = id
}

export function startMusic(): void {
  if (musicState.playing || !useSettingsStore.getState().music || !audioRunning()) return
  const g = getAudio()
  if (!g) return
  begin(g.ctx, g.music, MOODS[mood].song)
  timer = window.setInterval(schedule, 25)
  musicState.playing = true
}

export function stopMusic(): void {
  window.clearInterval(timer)
  timer = undefined
  musicState.playing = false
  const g = getAudio()
  const old = nodes
  nodes = null
  if (g && old) release(g.ctx, old, 0.25)
}

/** Picks the piece for the screen: a different piece crossfades in, the same one adapts. */
export function setMood(next: Mood): void {
  mood = next
  musicState.mood = next
  const g = getAudio()
  if (!g || !nodes) return
  const want = MOODS[next]
  const now = g.ctx.currentTime
  if (nodes.song !== want.song) {
    release(g.ctx, nodes, 0.6)
    begin(g.ctx, g.music, want.song)
    return
  }
  nodes.drums.gain.setTargetAtTime(want.drums, now, 0.5)
  nodes.filter.frequency.setTargetAtTime(want.open ? OPEN_HZ : MUFFLED_HZ, now, 0.6)
}

onAudioUnlocked(startMusic)
useSettingsStore.subscribe((s, prev) => {
  if (s.music === prev.music) return
  if (s.music) startMusic()
  else stopMusic()
})
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopMusic()
    else startMusic()
  })
}

/** Test diagnostics (development/test builds only): which piece is playing. */
if (TEST_FLAGS_ENABLED && typeof window !== 'undefined') {
  ;(window as unknown as { __buildarenaMusic: unknown }).__buildarenaMusic = musicState
}
