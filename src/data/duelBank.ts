import { z } from 'zod'
import { CardSchema, TaskSchema, type Card, type Task } from '@/ai/schemas'
import cardsRaw from './cards.json'
import tasksRaw from './tasks.json'

/** 44-card catalog and the 5 duel tasks, validated at startup. */
export const CARDS: readonly Card[] = z.array(CardSchema).parse(cardsRaw.kartlar)
export const TASKS: readonly Task[] = z
  .array(TaskSchema)
  .parse(tasksRaw.gorevler)
  .map((t) => {
    const missing = [...t.kritik, ...t.onemli, ...t.destek, ...t.tuzak].filter(
      (id) => !CARDS.some((c) => c.id === id),
    )
    if (missing.length) throw new Error(`${t.id}: bilinmeyen kart ${missing.join(', ')}`)
    return t
  })

const cardById = new Map(CARDS.map((c) => [c.id, c]))

export function cardOf(id: string): Card {
  const card = cardById.get(id)
  if (!card) throw new Error(`Bilinmeyen kart: ${id}`)
  return card
}

export function findTask(id: string | null | undefined): Task | undefined {
  return TASKS.find((t) => t.id === id)
}

/** All 14 cards of a task: required first, then traps. */
export function taskCards(task: Task): string[] {
  return [...task.kritik, ...task.onemli, ...task.destek, ...task.tuzak]
}
