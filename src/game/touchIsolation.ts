// Screen isolation for the duel (document §13.5, full prototype §4.1). Pure helpers so the
// rules are unit-tested; coordinates are 1280×800 stage pixels.

export const STAGE_W = 1280
/** 24 px dead zone in the middle: 628–652. */
export const HALVES = [
  { x0: 0, x1: 628 },
  { x0: 652, x1: 1280 },
] as const
/** Touches with a bigger contact area are a palm or wrist. */
export const PALM_PX = 60

/** Which player owns a touch that starts at x: 0, 1, or -1 in the dead zone. */
export function sideOf(x: number): 0 | 1 | -1 {
  if (x < HALVES[0].x1) return 0
  if (x >= HALVES[1].x0) return 1
  return -1
}

export function isPalm(e: { pointerType: string; width?: number; height?: number }): boolean {
  return e.pointerType === 'touch' && ((e.width ?? 0) > PALM_PX || (e.height ?? 0) > PALM_PX)
}

/** Boundary lock: a dragged card stays inside its owner's half (and inside the play area). */
export function clampToHalf(
  side: 0 | 1,
  x: number,
  y: number,
  margin = 48,
): { x: number; y: number } {
  const h = HALVES[side]
  return {
    x: Math.max(h.x0 + margin, Math.min(h.x1 - margin, x)),
    y: Math.max(150, Math.min(752, y)),
  }
}
