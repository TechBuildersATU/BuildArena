import { z } from 'zod'
import { ICON_NAMES } from '@/components/icons'

// Scenario bank schema (scenario doc §9.1). Keys and ids are English; the texts are the Turkish game content.
// A response that fails validation is discarded and a scenario comes from the bank.

const IconName = z.enum(ICON_NAMES)

/** Words that contain a letter or digit; "+" and "/" don't count. */
export function wordCount(text: string): number {
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length
}

export const OptionSchema = z
  .object({
    id: z.enum(['a', 'b', 'c', 'd']),
    text: z
      .string()
      .min(1)
      .refine((t) => wordCount(t) <= 6, 'An option text has at most 6 words'),
    icon: IconName,
    points: z.number().int().min(0).max(20),
    effect: z.string().min(1),
    summary: z.string().min(1),
  })
  .strict()

export const StepSchema = z
  .object({
    no: z.number().int().min(1).max(5),
    level: z.enum(['detail', 'general']),
    topic: z.string().min(1),
    situation: z.string().min(1),
    question: z.string().min(1),
    options: z.array(OptionSchema).length(4),
  })
  .strict()
  .refine((s) => s.options.filter((o) => o.points === 20).length === 1, {
    message: 'Every step needs exactly one 20-point option',
  })

export const ScenarioSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    title: z.string().includes(':'),
    system: z.string().min(1),
    icon: IconName,
    time: z.string().regex(/^\d{2}:\d{2}$/),
    place: z.string().min(1),
    scale: z.string().min(1),
    intro: z.string().min(1),
    audience: z.array(z.object({ name: z.string().min(1), icon: IconName }).strict()).min(1),
    steps: z.array(StepSchema).length(5),
  })
  .strict()
  .refine((s) => s.steps.every((a, i) => a.no === i + 1), {
    message: 'Steps are numbered 1–5 in order',
  })
  .refine((s) => s.steps.every((a, i) => a.level === (i < 4 ? 'detail' : 'general')), {
    message: 'Steps 1–4 are detail steps, step 5 is the general one',
  })

export const TitleBandSchema = z
  .object({ min: z.number().int(), max: z.number().int(), name: z.string().min(1) })
  .strict()

export const ScenarioBankSchema = z
  .object({
    version: z.string(),
    description: z.string(),
    titles: z.array(TitleBandSchema).min(1),
    scenarios: z.array(ScenarioSchema).min(1),
  })
  .strict()

export type ScenarioOption = z.infer<typeof OptionSchema>
export type ScenarioStep = z.infer<typeof StepSchema>
export type Scenario = z.infer<typeof ScenarioSchema>
export type TitleBand = z.infer<typeof TitleBandSchema>
export type ScenarioBank = z.infer<typeof ScenarioBankSchema>

// ---------------------------------------------------------------- duel bank (document §9, §10)

export const CardSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    name: z
      .string()
      .min(1)
      .refine((t) => wordCount(t) <= 3, 'A card name has at most 3 words'),
    icon: IconName,
    nfr: z.boolean(),
  })
  .strict()

export const TaskSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    no: z.string().regex(/^\d{2}$/),
    title: z.string().min(1),
    short: z.string().min(1),
    icon: IconName,
    description: z.string().min(1),
    audience: z.array(z.object({ name: z.string().min(1), icon: IconName }).strict()).min(1),
    critical: z.array(z.string()).length(3),
    important: z.array(z.string()).length(4),
    support: z.array(z.string()).length(1),
    traps: z.array(z.string()).length(6),
    combos: z
      .array(z.object({ name: z.string().min(1), cards: z.array(z.string()).length(2) }).strict())
      .min(1),
  })
  .strict()
  .refine((t) => new Set([...t.critical, ...t.important, ...t.support, ...t.traps]).size === 14, {
    message: 'A task has 14 different cards',
  })
  .refine(
    (t) => {
      const required = new Set([...t.critical, ...t.important, ...t.support])
      return t.combos.every((b) => b.cards.every((c) => required.has(c)))
    },
    { message: 'Combos only use required cards' },
  )

export type Card = z.infer<typeof CardSchema>
export type Task = z.infer<typeof TaskSchema>
