import { isNativeApp, sharePng, type SaveResult } from '@/app/native'
import type { ScoreEntry } from '@/db/database'
import { initialOf } from '@/utils/text'
import type { DayFact, DayStats } from './dayStats'
import { CONFETTI, HEX, MEDAL_HEX, RING_STOPS } from './palette'
import { shortTitle } from './scoring'

// Share images drawn on the device with canvas — no internet needed (full prototype §8):
// the day's top 3 and the end-of-day summary, each as a 1080×1350 post and a 1080×1920 story.
// Same look as the app (Renk Paleti): paper background, ink outlines with a hard shadow.

export type ShareKind = 'post' | 'story'

export const SHARE_SIZE: Record<ShareKind, { width: number; height: number }> = {
  post: { width: 1080, height: 1350 },
  story: { width: 1080, height: 1920 },
}

const LOGO_SRC = '/logo/atu_techbuilders_logo.png'
const font = (weight: number, size: number) =>
  `${weight} ${size}px "Plus Jakarta Sans", "Segoe UI", sans-serif`
const display = (weight: number, size: number) =>
  `${weight} ${size}px "Bricolage Grotesque", "Plus Jakarta Sans", sans-serif`
const mono = (size: number) => `700 ${size}px "JetBrains Mono", Consolas, monospace`
const LINE = 4
const SHADOW = 8

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function roundRect(
  x: CanvasRenderingContext2D,
  X: number,
  Y: number,
  w: number,
  h: number,
  r: number,
) {
  x.beginPath()
  x.roundRect(X, Y, w, h, r)
}

/** A paper-cut card: hard ink shadow, fill, ink outline. */
function inkCard(
  x: CanvasRenderingContext2D,
  X: number,
  Y: number,
  w: number,
  h: number,
  r: number | number[],
  fill: string,
  shadow = true,
) {
  if (shadow) {
    x.fillStyle = HEX.ink
    x.beginPath()
    x.roundRect(X + SHADOW, Y + SHADOW, w, h, r)
    x.fill()
  }
  x.beginPath()
  x.roundRect(X, Y, w, h, r)
  x.fillStyle = fill
  x.fill()
  x.lineWidth = LINE
  x.strokeStyle = HEX.ink
  x.stroke()
}

function fitFont(x: CanvasRenderingContext2D, text: string, width: number, max: number) {
  let size = max
  do {
    x.font = font(800, size)
    size -= 2
  } while (x.measureText(text).width > width && size > 14)
}

function lerpHex(a: string, b: string, t: number): string {
  const parse = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
  const A = parse(a)
  const B = parse(b)
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`
}

/** The logo's "ATÜ • TECHBUILDERS" text ring, frozen. */
function ringText(
  x: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  R: number,
  text: string,
  size: number,
) {
  x.save()
  x.font = font(800, size)
  x.textAlign = 'center'
  x.textBaseline = 'middle'
  const chars = [...text]
  const widths = chars.map((c) => x.measureText(c).width + size * 0.18)
  const total = widths.reduce((a, b) => a + b, 0)
  let acc = 0
  chars.forEach((c, i) => {
    const mid = acc + widths[i] / 2
    acc += widths[i]
    const t = mid / total
    const a = -Math.PI / 2 + t * Math.PI * 2
    const seg = Math.min(2, Math.floor(t * 3))
    x.save()
    x.translate(cx + R * Math.cos(a), cy + R * Math.sin(a))
    x.rotate(a + Math.PI / 2)
    x.fillStyle = lerpHex(RING_STOPS[seg], RING_STOPS[seg + 1], t * 3 - seg)
    x.fillText(c, 0, 0)
    x.restore()
  })
  x.restore()
}

async function baseCanvas(canvas: HTMLCanvasElement, kind: ShareKind) {
  const { width: W, height: H } = SHARE_SIZE[kind]
  const story = kind === 'story'
  canvas.width = W
  canvas.height = H
  const x = canvas.getContext('2d')
  if (!x) return null
  try {
    await document.fonts.load(font(800, 40))
    await document.fonts.load(font(600, 40))
    await document.fonts.load(display(800, 40))
    await document.fonts.load(mono(40))
  } catch {
    // system font fallback
  }
  x.fillStyle = HEX.paper
  x.fillRect(0, 0, W, H)

  // circuit lines from the logo
  x.lineWidth = 3
  x.lineCap = 'round'
  x.globalAlpha = 0.28
  ;(
    [
      [HEX.p2, 0],
      [HEX.brand, 1],
      [HEX.p1, 2],
    ] as const
  ).forEach(([color, i]) => {
    x.strokeStyle = color
    const y0 = H - 120 - i * 70
    x.beginPath()
    x.moveTo(0, y0)
    x.lineTo(150 + i * 40, y0)
    x.lineTo(190 + i * 40, y0 - 40)
    x.lineTo(330 + i * 30, y0 - 40)
    x.stroke()
    x.beginPath()
    x.arc(338 + i * 30, y0 - 40, 7, 0, 7)
    x.stroke()
    x.beginPath()
    x.moveTo(W, y0 + 30)
    x.lineTo(W - 160 - i * 40, y0 + 30)
    x.lineTo(W - 200 - i * 40, y0 - 10)
    x.lineTo(W - 320 - i * 30, y0 - 10)
    x.stroke()
    x.beginPath()
    x.arc(W - 328 - i * 30, y0 - 10, 7, 0, 7)
    x.stroke()
  })
  x.globalAlpha = 1

  // scattered confetti
  for (let i = 0; i < (story ? 40 : 30); i++) {
    const px = i % 2 ? W - 30 - ((i * 37) % 150) : 30 + ((i * 53) % 150)
    const py = 40 + ((i * 131) % (story ? 1150 : 760))
    x.save()
    x.translate(px, py)
    x.rotate(i)
    x.fillStyle = CONFETTI[i % CONFETTI.length]
    x.globalAlpha = 0.6
    x.fillRect(-4, -8, 8, 16)
    x.restore()
  }
  return { x, W, H, story }
}

/** Logo, text ring, eyebrow and a two-colour title; returns the title's baseline. */
async function header(
  x: CanvasRenderingContext2D,
  W: number,
  story: boolean,
  L: number,
  cy: number,
  eyebrow: string,
  a: string,
  b: string,
): Promise<number> {
  const cx = W / 2
  const logo = await loadImage(LOGO_SRC)
  if (logo) x.drawImage(logo, cx - L / 2, cy - L / 2, L, L)
  ringText(
    x,
    cx,
    cy,
    L / 2 + (story ? 50 : 40),
    'ATÜ • TECHBUILDERS • ATÜ • TECHBUILDERS • ATÜ • TECHBUILDERS • ',
    story ? 27 : 22,
  )
  let y = cy + L / 2 + (story ? 150 : 112)
  x.textAlign = 'center'
  x.textBaseline = 'alphabetic'
  x.fillStyle = HEX.ink2
  x.font = mono(story ? 28 : 24)
  x.letterSpacing = '5px'
  x.fillText(eyebrow, cx, y)
  x.letterSpacing = '0px'
  y += story ? 100 : 80
  x.font = display(800, story ? 88 : 74)
  const wa = x.measureText(a).width
  const wb = x.measureText(b).width
  x.textAlign = 'left'
  x.fillStyle = HEX.ink
  x.fillText(a, cx - (wa + wb) / 2, y)
  x.fillStyle = HEX.brand
  x.fillText(b, cx - (wa + wb) / 2 + wa, y)
  x.textAlign = 'center'
  return y
}

function footer(x: CanvasRenderingContext2D, W: number, H: number, story: boolean, line: string) {
  x.textAlign = 'center'
  x.fillStyle = HEX.ink2
  x.font = font(600, story ? 28 : 24)
  x.fillText(line, W / 2, H - (story ? 150 : 84))
  x.fillStyle = HEX.brand
  x.font = display(800, story ? 36 : 30)
  x.fillText('#BuildArena', W / 2, H - (story ? 100 : 42))
}

/** Day's top 3 (consenting players only). */
export async function drawShareImage(
  canvas: HTMLCanvasElement,
  kind: ShareKind,
  top: readonly ScoreEntry[],
): Promise<void> {
  const base = await baseCanvas(canvas, kind)
  if (!base) return
  const { x, W, H, story } = base
  const cx = W / 2
  let y = await header(
    x,
    W,
    story,
    story ? 330 : 250,
    story ? 330 : 205,
    '4 KASIM STANT · SENARYO MODU',
    'BuildArena ',
    'Şampiyonları',
  )
  if (story) {
    y += 70
    x.fillStyle = HEX.ink2
    x.font = font(600, 32)
    x.fillText('Kriz anında en doğru kararları onlar verdi!', cx, y)
  }

  const floor = H - (story ? 250 : 170)
  const colW = 290
  const gap = 26
  const heights = story ? [320, 420, 250] : [215, 285, 170]
  const order = [1, 0, 2]
  const xs = [cx - colW * 1.5 - gap, cx - colW / 2, cx + colW / 2 + gap]
  order.forEach((r, j) => {
    const e = top[r]
    const X = xs[j]
    const h = heights[j]
    const medal = MEDAL_HEX[r]
    inkCard(x, X, floor - h, colW, h, [22, 22, 0, 0], medal)
    x.fillStyle = HEX.ink
    x.font = mono(story ? 140 : 112)
    x.textAlign = 'center'
    x.fillText(String(r + 1), X + colW / 2, floor - h + (story ? 170 : 140))

    const ay = floor - h - (story ? 250 : 210)
    x.beginPath()
    x.arc(X + colW / 2, ay, story ? 52 : 44, 0, 7)
    x.fillStyle = e ? medal : HEX.sunk
    x.fill()
    x.lineWidth = LINE
    x.strokeStyle = HEX.ink
    x.stroke()
    x.fillStyle = HEX.ink
    x.font = display(800, story ? 46 : 38)
    x.textBaseline = 'middle'
    x.fillText(e ? initialOf(e.nick) : '–', X + colW / 2, ay + 2)
    x.textBaseline = 'alphabetic'
    if (r === 0 && e) {
      const mx = X + colW / 2
      const cyy = ay - (story ? 80 : 70)
      const w2 = 34
      x.fillStyle = HEX.gold
      x.strokeStyle = HEX.ink
      x.lineWidth = LINE
      x.lineJoin = 'round'
      x.beginPath()
      x.moveTo(mx - w2, cyy + 18)
      x.lineTo(mx - w2, cyy - 10)
      x.lineTo(mx - 14, cyy + 6)
      x.lineTo(mx, cyy - 20)
      x.lineTo(mx + 14, cyy + 6)
      x.lineTo(mx + w2, cyy - 10)
      x.lineTo(mx + w2, cyy + 18)
      x.closePath()
      x.fill()
      x.stroke()
    }
    const name = e ? e.nick : 'Henüz yok'
    x.fillStyle = e ? HEX.ink : HEX.ink2
    fitFont(x, name, colW - 20, story ? 40 : 34)
    x.fillText(name, X + colW / 2, ay + (story ? 104 : 88))
    if (e) {
      x.font = font(800, story ? 64 : 54)
      const sv = String(e.score)
      const sw = x.measureText(sv).width
      x.font = font(700, story ? 28 : 24)
      const tw = x.measureText(' /100').width
      const sx = X + colW / 2 - (sw + tw) / 2
      x.textAlign = 'left'
      x.font = font(800, story ? 64 : 54)
      x.fillStyle = HEX.ink
      x.fillText(sv, sx, ay + (story ? 172 : 148))
      x.font = font(700, story ? 28 : 24)
      x.fillStyle = HEX.ink2
      x.fillText(' /100', sx + sw, ay + (story ? 172 : 148))
      x.textAlign = 'center'
      x.font = font(600, story ? 26 : 22)
      x.fillText(shortTitle(e.unvan), X + colW / 2, ay + (story ? 210 : 182))
    }
  })
  footer(x, W, H, story, 'ATÜ TechBuilders · Yazılım üretir, kampüse değer katarız.')
}

/**
 * End-of-day summary. `iconSvg(i)` returns the SVG markup of fact i's Lucide icon (the staff
 * screen reads it from the icons it already shows), so the canvas draws the same icons offline.
 */
export async function drawStatsImage(
  canvas: HTMLCanvasElement,
  kind: ShareKind,
  st: DayStats,
  facts: readonly DayFact[],
  iconSvg: (index: number) => string | null,
): Promise<void> {
  const base = await baseCanvas(canvas, kind)
  if (!base) return
  const { x, W, H, story } = base
  const M = 90
  let y = await header(
    x,
    W,
    story,
    story ? 260 : 170,
    story ? 280 : 150,
    '4 KASIM STANT · GÜNÜN ÖZETİ',
    "BuildArena'da ",
    'bugün',
  )

  // three number tiles
  y += story ? 70 : 40
  const tiles: [number, string][] = [
    [st.senaryo, 'kriz çözüldü'],
    [st.duello, 'düello oynandı'],
    [st.ort, 'ortalama puan'],
  ]
  const tw = (W - 2 * M - 2 * 24) / 3
  const th = story ? 200 : 150
  tiles.forEach(([v, label], i) => {
    const X = M + i * (tw + 24)
    inkCard(x, X, y, tw, th, 20, HEX.card)
    x.textAlign = 'center'
    x.fillStyle = HEX.ink
    x.font = mono(story ? 92 : 76)
    x.fillText(String(v), X + tw / 2, y + th * 0.55)
    x.fillStyle = HEX.ink2
    x.font = font(700, story ? 28 : 24)
    x.fillText(label, X + tw / 2, y + th * 0.82)
  })
  y += th + (story ? 64 : 46)

  // title distribution: one series, values written next to the bars
  x.textAlign = 'left'
  x.fillStyle = HEX.ink2
  x.font = mono(story ? 26 : 22)
  x.letterSpacing = '4px'
  x.fillText('UNVAN DAĞILIMI', M, y)
  x.letterSpacing = '0px'
  y += story ? 32 : 24
  const maxN = Math.max(1, ...st.titles.map((u) => u.n))
  const lw = story ? 250 : 220
  const bw = W - 2 * M - lw - 70
  const bh = story ? 28 : 22
  const rowGap = story ? 50 : 38
  st.titles.forEach((u, i) => {
    const Y = y + i * rowGap
    x.fillStyle = HEX.ink
    x.font = font(700, story ? 28 : 24)
    x.textBaseline = 'middle'
    x.fillText(u.ad, M, Y + bh / 2)
    x.fillStyle = HEX.card
    roundRect(x, M + lw, Y, bw, bh, bh / 2)
    x.fill()
    const w = Math.max(u.n ? bh : 0, (bw * u.n) / maxN)
    if (w) {
      x.fillStyle = HEX.scn
      roundRect(x, M + lw, Y, w, bh, bh / 2)
      x.fill()
    }
    x.lineWidth = 3
    x.strokeStyle = HEX.ink
    roundRect(x, M + lw, Y, bw, bh, bh / 2)
    x.stroke()
    x.fillStyle = HEX.ink
    x.font = font(800, story ? 28 : 24)
    x.textAlign = 'right'
    x.fillText(String(u.n), W - M, Y + bh / 2)
    x.textAlign = 'left'
  })
  x.textBaseline = 'alphabetic'
  y += st.titles.length * rowGap + (story ? 48 : 28)

  // highlights
  const fh = story ? 100 : 80
  const shown = facts.filter((f) => f.side).slice(0, 3)
  for (let i = 0; i < shown.length; i++) {
    const f = shown[i]
    const Y = y + i * (fh + (story ? 14 : 12))
    inkCard(x, M, Y, W - 2 * M, fh, 18, HEX.card)
    inkCard(x, M + 18, Y + (fh - 60) / 2, 60, 60, 12, HEX.sunk, false)
    const svg = iconSvg(facts.indexOf(f))
    if (svg) {
      const img = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`)
      if (img) x.drawImage(img, M + 18 + 13, Y + (fh - 60) / 2 + 13, 34, 34)
    }
    x.fillStyle = HEX.ink2
    x.font = font(700, story ? 24 : 20)
    x.fillText(f.label, M + 100, Y + fh * 0.4)
    x.fillStyle = HEX.ink
    fitFont(x, f.value, W - 2 * M - 330, story ? 34 : 29)
    x.fillText(f.value, M + 100, Y + fh * 0.76)
    x.textAlign = 'right'
    x.fillStyle = HEX.brand
    x.font = display(800, story ? 32 : 27)
    x.fillText(f.side, W - M - 24, Y + fh * 0.62)
    x.textAlign = 'left'
  }
  footer(x, W, H, story, 'Katılan herkese teşekkürler! · ATÜ TechBuilders')
}

/**
 * Saves the canvas as a PNG: a download link in the browser, Android's share sheet in the APK
 * (its WebView can't download).
 */
export function downloadCanvas(canvas: HTMLCanvasElement, fileName: string): Promise<SaveResult> {
  if (isNativeApp()) {
    try {
      return sharePng(canvas.toDataURL('image/png').split(',')[1], fileName)
    } catch {
      return Promise.resolve('failed')
    }
  }
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => {
        if (!blob) return resolve('failed')
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = fileName
        a.click()
        window.setTimeout(() => URL.revokeObjectURL(a.href), 2000)
        resolve('saved')
      }, 'image/png')
    } catch {
      resolve('failed')
    }
  })
}
