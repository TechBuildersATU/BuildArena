// Pure box operations for a duel player's phone (8 slots), with an undo history.

export const BOX_SLOTS = 8
const HISTORY = 30

export interface PlayerBoard {
  /** the 14 cards in this player's own shuffled order */
  pool: string[]
  /** cards in the phone, top to bottom (at most 8) */
  box: string[]
  hist: string[][]
  done: boolean
  /** whole seconds left when the player finished (0 if the time ran out) */
  kalan: number | null
}

function remember(p: PlayerBoard): string[][] {
  return [...p.hist, [...p.box]].slice(-HISTORY)
}

/** Drops a pool card into the box at `index`; refused when the box is full or already has it. */
export function insertCard(p: PlayerBoard, id: string, index: number): PlayerBoard | null {
  if (p.box.length >= BOX_SLOTS || p.box.includes(id)) return null
  const box = [...p.box]
  box.splice(Math.max(0, Math.min(index, box.length)), 0, id)
  return { ...p, box, hist: remember(p) }
}

/** Moves a box card from slot `from` to slot `to`. */
export function moveCard(p: PlayerBoard, from: number, to: number): PlayerBoard {
  const box = [...p.box]
  const [card] = box.splice(from, 1)
  box.splice(Math.max(0, Math.min(to, box.length)), 0, card)
  if (box.every((c, i) => c === p.box[i])) return p
  return { ...p, box, hist: remember(p) }
}

/** Takes a card out of the box (back to the pool). */
export function removeCard(p: PlayerBoard, from: number): PlayerBoard {
  const box = p.box.filter((_, i) => i !== from)
  return { ...p, box, hist: remember(p) }
}

export function undo(p: PlayerBoard): PlayerBoard {
  if (!p.hist.length) return p
  return { ...p, box: p.hist[p.hist.length - 1], hist: p.hist.slice(0, -1) }
}

export function clearBox(p: PlayerBoard): PlayerBoard {
  if (!p.box.length) return p
  return { ...p, box: [], hist: remember(p) }
}

/** Slot under a point `y` px below the top of the slot list (46 px slots, 7 px gaps). */
export function slotAt(y: number, slotPitch = 53): number {
  return Math.max(0, Math.min(BOX_SLOTS - 1, Math.floor(y / slotPitch)))
}
