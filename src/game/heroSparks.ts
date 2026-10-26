import { prefersReducedMotion } from '@/app/timing'
import { CONFETTI } from './palette'

// Mini confetti bursting from the logo's sparkly points (star, tentacle tips, brain) every
// ~1.2 s on the home screen and the first tutorial slide (document §5). Positions are % of
// the logo square; `a` is the angle range the pieces fly out in.

const SPARKS = [
  { x: 50.0, y: 43.0, a: [-200, -20], n: 11 },
  { x: 81.7, y: 32.5, a: [-90, 20], n: 7 },
  { x: 80.9, y: 37.8, a: [-50, 40], n: 6 },
  { x: 76.0, y: 25.5, a: [-140, -30], n: 6 },
] as const

const rnd = (a: number, b: number) => a + Math.random() * (b - a)

export function sparkBurst(layer: HTMLElement, index: number): void {
  if (prefersReducedMotion()) return
  const s = SPARKS[index % SPARKS.length]
  const glint = document.createElement('b')
  glint.className = 'hero-glint'
  glint.style.left = `${s.x}%`
  glint.style.top = `${s.y}%`
  layer.appendChild(glint)
  glint.animate(
    [
      { transform: 'translate(-50%,-50%) scale(0)', opacity: 0 },
      { transform: 'translate(-50%,-50%) scale(1.1) rotate(45deg)', opacity: 1, offset: 0.35 },
      { transform: 'translate(-50%,-50%) scale(0) rotate(90deg)', opacity: 0 },
    ],
    { duration: 700 },
  ).onfinish = () => glint.remove()
  for (let i = 0; i < s.n; i++) {
    const el = document.createElement('i')
    const k = Math.random()
    el.className = `hero-cf ${k < 0.45 ? 'hero-cf-rect' : k < 0.8 ? 'hero-cf-dot' : 'hero-cf-tri'}`
    el.style.left = `${s.x}%`
    el.style.top = `${s.y}%`
    el.style.background = CONFETTI[Math.floor(Math.random() * CONFETTI.length)]
    const ang = (rnd(s.a[0], s.a[1]) * Math.PI) / 180
    const dist = rnd(70, 150)
    const dx = Math.cos(ang) * dist
    const dy = Math.sin(ang) * dist
    const rot = rnd(-540, 540)
    const gravity = rnd(50, 100)
    layer.appendChild(el)
    el.animate(
      [
        { transform: 'translate(-50%,-50%) scale(.5)', opacity: 1 },
        {
          transform: `translate(-50%,-50%) translate(${dx * 0.7}px, ${dy * 0.7 + gravity * 0.15}px) rotate(${rot * 0.6}deg)`,
          opacity: 1,
          offset: 0.45,
        },
        {
          transform: `translate(-50%,-50%) translate(${dx}px, ${dy + gravity}px) rotate(${rot}deg) scale(.85)`,
          opacity: 0,
        },
      ],
      { duration: rnd(1300, 2000), easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' },
    ).onfinish = () => el.remove()
  }
}
