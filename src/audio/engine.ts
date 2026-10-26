import { TEST_FLAGS_ENABLED } from '@/app/testFlags'
import { useSettingsStore } from '@/stores/settingsStore'

// Shared Web Audio graph: effects and music have their own buses so the two header buttons
// switch them independently; a gentle compressor keeps sudden sounds from getting harsh.
// Browsers start audio suspended until the first touch, so everything waits for unlockAudio().

export interface AudioGraph {
  ctx: AudioContext
  master: GainNode
  sfx: GainNode
  music: GainNode
}

let graph: AudioGraph | null = null
let unavailable = false
const unlockListeners = new Set<() => void>()

const SFX_LEVEL = 0.9
const MUSIC_LEVEL = 0.7
/** Master gain at 100 % volume; the default 80 % gives about 0.93. */
const MASTER_MAX = 1.45

/** Volume slider (0–100 %) → master gain, on a square curve that follows the ear. */
export function masterGain(volume: number): number {
  const v = Math.min(100, Math.max(0, volume)) / 100
  return MASTER_MAX * v * v
}

export function getAudio(): AudioGraph | null {
  if (graph || unavailable) return graph
  try {
    const ctx = new AudioContext({ latencyHint: 'interactive' })
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -16
    comp.knee.value = 14
    comp.ratio.value = 4
    comp.attack.value = 0.004
    comp.release.value = 0.25
    const master = ctx.createGain()
    const { sfx: sfxOn, music: musicOn, volume } = useSettingsStore.getState()
    master.gain.value = masterGain(volume)
    const sfx = ctx.createGain()
    sfx.gain.value = sfxOn ? SFX_LEVEL : 0
    const music = ctx.createGain()
    music.gain.value = musicOn ? MUSIC_LEVEL : 0
    sfx.connect(master)
    music.connect(master)
    master.connect(comp).connect(ctx.destination)
    graph = { ctx, master, sfx, music }
  } catch {
    unavailable = true
  }
  return graph
}

/** True once the browser lets us play (after the first touch). */
export function audioRunning(): boolean {
  return graph?.ctx.state === 'running'
}

/** Runs `fn` every time audio becomes playable (used to start the music). */
export function onAudioUnlocked(fn: () => void): () => void {
  unlockListeners.add(fn)
  return () => unlockListeners.delete(fn)
}

export function unlockAudio(): void {
  const g = getAudio()
  if (!g) return
  if (g.ctx.state === 'running') {
    unlockListeners.forEach((fn) => fn())
    return
  }
  void g.ctx.resume().then(() => unlockListeners.forEach((fn) => fn()))
}

function ramp(node: GainNode, to: number) {
  const now = node.context.currentTime
  node.gain.cancelScheduledValues(now)
  node.gain.setTargetAtTime(to, now, 0.08)
}

// Follow the settings switches.
useSettingsStore.subscribe((s, prev) => {
  if (!graph) return
  if (s.sfx !== prev.sfx) ramp(graph.sfx, s.sfx ? SFX_LEVEL : 0)
  if (s.music !== prev.music) ramp(graph.music, s.music ? MUSIC_LEVEL : 0)
  if (s.volume !== prev.volume) ramp(graph.master, masterGain(s.volume))
})

if (typeof document !== 'undefined') {
  const unlock = () => unlockAudio()
  document.addEventListener('pointerdown', unlock, { capture: true, passive: true })
  document.addEventListener('keydown', unlock, { capture: true })
}

/** Test diagnostics (development/test builds only). */
export const audioStats = { sfx: 0, lastSfx: '' }
if (TEST_FLAGS_ENABLED && typeof window !== 'undefined') {
  ;(window as unknown as { __buildarenaAudio: unknown }).__buildarenaAudio = audioStats
}
