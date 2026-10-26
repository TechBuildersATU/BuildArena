import { prefersReducedMotion } from '@/app/timing'
import { CONFETTI } from './palette'
import { sfx } from '@/audio/sfx'

// Imperative visual effects on the stage's FX layer (scenario doc §10): confetti, the flying
// butterfly with its trail, ripples, typewriter text and count-ups. Coordinates are in
// 1280×800 stage pixels, whatever the screen's real size.

let fxRoot: HTMLElement | null = null

export function setFxRoot(el: HTMLElement | null): void {
  fxRoot = el
}

export function clearFx(): void {
  fxRoot?.replaceChildren()
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a)

function stageScale(): { left: number; top: number; k: number } {
  const stage = document.querySelector<HTMLElement>('[data-stage]')
  const r = stage?.getBoundingClientRect()
  return r ? { left: r.left, top: r.top, k: r.width / 1280 || 1 } : { left: 0, top: 0, k: 1 }
}

/** A client (screen) point in stage coordinates. */
export function toStage(clientX: number, clientY: number): { x: number; y: number } {
  const s = stageScale()
  return { x: (clientX - s.left) / s.k, y: (clientY - s.top) / s.k }
}

/** Bounding box of `el` in stage coordinates. */
export function stageRect(el: Element): { x: number; y: number; w: number; h: number } {
  const s = stageScale()
  const r = el.getBoundingClientRect()
  return {
    x: (r.left - s.left) / s.k,
    y: (r.top - s.top) / s.k,
    w: r.width / s.k,
    h: r.height / s.k,
  }
}

/** Center of `el` in stage coordinates. */
export function stagePoint(el: Element): { x: number; y: number } {
  const s = stageScale()
  const r = el.getBoundingClientRect()
  return { x: (r.left + r.width / 2 - s.left) / s.k, y: (r.top + r.height / 2 - s.top) / s.k }
}

/** Mascot markup (static, trusted). Pink upper wings, purple lower wings, blue spots. */
export const BUTTERFLY_SVG =
  '<svg class="fx-bf" viewBox="0 0 40 32" aria-hidden="true"><g class="fx-wl"><path d="M20 15C13 3 2 2 3 11c1 6 10 8 17 5z" fill="#A61E4D"/><path d="M20 17c-6 1-13 6-11 11 2 4 9 0 11-10z" fill="#087F5B"/><circle cx="9" cy="10" r="2.2" fill="#FCC419"/></g><g class="fx-wr"><path d="M20 15c7-12 18-13 17-4-1 6-10 8-17 5z" fill="#A61E4D"/><path d="M20 17c6 1 13 6 11 11-2 4-9 0-11-10z" fill="#087F5B"/><circle cx="31" cy="10" r="2.2" fill="#FCC419"/></g><rect x="19" y="8" width="2" height="16" rx="1" fill="var(--ink)"/></svg>'

function butterflyEl(): HTMLDivElement {
  const el = document.createElement('div')
  el.className = 'fx-bfly'
  el.innerHTML = BUTTERFLY_SVG
  return el
}

/** Confetti in the logo colours, falling over the stage between x0 and x1. */
export function confetti(count = 70, x0 = 0, x1 = 1280): void {
  if (!fxRoot || prefersReducedMotion()) return
  for (let i = 0; i < count; i++) {
    const el = document.createElement('i')
    const w = rnd(5, 9)
    const round = Math.random() < 0.35
    el.style.cssText = `position:absolute;left:${rnd(x0, x1)}px;top:-16px;width:${w}px;height:${round ? w : w * 1.9}px;border-radius:${round ? '50%' : '2px'};background:${CONFETTI[i % CONFETTI.length]}`
    el.dataset.confetti = ''
    fxRoot.appendChild(el)
    const rot = rnd(-540, 540)
    el.animate(
      [
        { transform: 'translate(0,0) rotate(0)' },
        { transform: `translate(${rnd(-80, 80)}px, 840px) rotate(${rot * 2}deg)` },
      ],
      {
        duration: rnd(2200, 3600),
        delay: rnd(0, 700),
        easing: 'cubic-bezier(.3,.1,.6,1)',
        fill: 'both',
      },
    ).onfinish = () => el.remove()
  }
}

export function ripple(target: Element): void {
  if (!fxRoot) return
  const p = stagePoint(target)
  const r = document.createElement('i')
  r.className = 'fx-rip'
  r.style.left = `${p.x}px`
  r.style.top = `${p.y}px`
  fxRoot.appendChild(r)
  window.setTimeout(() => r.remove(), 900)
}

/** The butterfly flies from the chosen option to its chain node on a curved path (1 s). */
export function flyButterfly(from: Element, to: Element): Promise<void> {
  return new Promise((resolve) => {
    if (!fxRoot || prefersReducedMotion()) {
      ripple(to)
      resolve()
      return
    }
    const root = fxRoot
    const p0 = stagePoint(from)
    const p3 = stagePoint(to)
    const p1 = { x: p0.x + rnd(-320, 320), y: p0.y - rnd(140, 220) }
    const p2 = { x: p3.x + rnd(-160, 160), y: p3.y + rnd(140, 220) }
    const N = 30
    const pts: { x: number; y: number; a: number; s: number }[] = []
    for (let i = 0; i <= N; i++) {
      const t = i / N
      const m = 1 - t
      const x = m * m * m * p0.x + 3 * m * m * t * p1.x + 3 * m * t * t * p2.x + t * t * t * p3.x
      const y = m * m * m * p0.y + 3 * m * m * t * p1.y + 3 * m * t * t * p2.y + t * t * t * p3.y
      const dx = 3 * m * m * (p1.x - p0.x) + 6 * m * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x)
      const dy = 3 * m * m * (p1.y - p0.y) + 6 * m * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y)
      pts.push({ x, y, a: (Math.atan2(dy, dx) * 180) / Math.PI + 90, s: 1.5 - 0.7 * t })
    }
    const el = butterflyEl()
    root.appendChild(el)
    const anim = el.animate(
      pts.map((p, i) => ({
        transform: `translate(${p.x - 22}px, ${p.y - 18}px) rotate(${p.a}deg) scale(${p.s})`,
        opacity: i === N ? 0 : 1,
      })),
      { duration: 1000, easing: 'cubic-bezier(.45,.05,.35,1)', fill: 'forwards' },
    )
    sfx.flutter()
    const trail = window.setInterval(() => {
      const t = Math.min(1, Number(anim.currentTime ?? 0) / 1000)
      const p = pts[Math.round(t * N)]
      if (!p) return
      const d = document.createElement('i')
      d.className = 'fx-trail'
      d.style.cssText = `left:${p.x - 3}px;top:${p.y - 3}px;background:${CONFETTI[Math.floor(Math.random() * 3)]}`
      root.appendChild(d)
      window.setTimeout(() => d.remove(), 760)
    }, 45)
    const done = () => {
      window.clearInterval(trail)
      el.remove()
      ripple(to)
      resolve()
    }
    anim.onfinish = done
    anim.oncancel = done
  })
}

/** A butterfly drifting across the screen now and then (nickname and wheel screens). */
export function ambientButterfly(): void {
  if (!fxRoot || prefersReducedMotion()) return
  const el = butterflyEl()
  el.style.opacity = '.85'
  fxRoot.appendChild(el)
  const ltr = Math.random() < 0.5
  const y0 = rnd(120, 680)
  const frames: Keyframe[] = []
  for (let i = 0; i <= 40; i++) {
    const t = i / 40
    const x = ltr ? -60 + 1400 * t : 1340 - 1400 * t
    const y = y0 + Math.sin(t * Math.PI * 3) * 60 - 80 * t
    frames.push({
      transform: `translate(${x}px, ${y}px) rotate(${(ltr ? 90 : -90) + Math.cos(t * Math.PI * 3) * 25}deg) scale(.9)`,
    })
  }
  el.animate(frames, { duration: 9000, easing: 'linear' }).onfinish = () => el.remove()
}

/** Types `text` into `el` one character at a time; instant with reduced motion. */
export async function typewrite(
  el: HTMLElement,
  text: string,
  msPerChar: number,
  signal: AbortSignal,
): Promise<void> {
  if (msPerChar <= 0 || prefersReducedMotion()) {
    el.textContent = text
    return
  }
  el.textContent = ''
  for (let i = 1; i <= text.length; i++) {
    if (signal.aborted) return
    el.textContent = text.slice(0, i)
    await new Promise((r) => window.setTimeout(r, msPerChar))
  }
}

/** Counts `el` up to `to` with an ease-out curve; `onStep` runs when the number changes. */
export function countUp(
  el: HTMLElement,
  to: number,
  ms: number,
  signal: AbortSignal,
  onStep?: () => void,
): Promise<void> {
  if (ms <= 0 || prefersReducedMotion()) {
    el.textContent = String(to)
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    const t0 = performance.now()
    let shown = -1
    const frame = (now: number) => {
      if (signal.aborted) return resolve()
      const p = Math.min(1, (now - t0) / ms)
      const value = Math.round(to * (1 - Math.pow(1 - p, 3)))
      el.textContent = String(value)
      if (value !== shown) {
        shown = value
        onStep?.()
      }
      if (p < 1) requestAnimationFrame(frame)
      else resolve()
    }
    requestAnimationFrame(frame)
  })
}
