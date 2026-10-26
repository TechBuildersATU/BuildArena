import { z } from 'zod'
import { ICON_NAMES } from '@/components/icons'

// Scenario bank / AI scenario schema (scenario doc §9.1). Keys are Turkish, as in the documents.
// A response that fails validation is discarded and a scenario comes from the bank.

const IconName = z.enum(ICON_NAMES)

/** Words that contain a letter or digit; "+" and "/" don't count. */
export function wordCount(text: string): number {
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length
}

export const OptionSchema = z
  .object({
    id: z.enum(['a', 'b', 'c', 'd']),
    metin: z
      .string()
      .min(1)
      .refine((t) => wordCount(t) <= 6, 'Seçenek metni en fazla 6 kelime'),
    ikon: IconName,
    puan: z.number().int().min(0).max(20),
    etki: z.string().min(1),
    ozet: z.string().min(1),
  })
  .strict()

export const StepSchema = z
  .object({
    no: z.number().int().min(1).max(5),
    seviye: z.enum(['detay', 'genel']),
    konu: z.string().min(1),
    durum: z.string().min(1),
    soru: z.string().min(1),
    secenekler: z.array(OptionSchema).length(4),
  })
  .strict()
  .refine((s) => s.secenekler.filter((o) => o.puan === 20).length === 1, {
    message: 'Her adımda tam bir 20 puanlık seçenek olmalı',
  })

export const ScenarioSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    baslik: z.string().includes(':'),
    sistem: z.string().min(1),
    ikon: IconName,
    saat: z.string().regex(/^\d{2}:\d{2}$/),
    yer: z.string().min(1),
    olcek: z.string().min(1),
    giris: z.string().min(1),
    hedefKitle: z.array(z.object({ ad: z.string().min(1), ikon: IconName }).strict()).min(1),
    adimlar: z.array(StepSchema).length(5),
  })
  .strict()
  .refine((s) => s.adimlar.every((a, i) => a.no === i + 1), {
    message: 'Adımlar 1–5 sırasıyla numaralanmalı',
  })
  .refine((s) => s.adimlar.every((a, i) => a.seviye === (i < 4 ? 'detay' : 'genel')), {
    message: 'Adım 1–4 detay, adım 5 genel olmalı',
  })

export const TitleBandSchema = z
  .object({ min: z.number().int(), max: z.number().int(), ad: z.string().min(1) })
  .strict()

export const ScenarioBankSchema = z
  .object({
    surum: z.string(),
    aciklama: z.string(),
    unvanlar: z.array(TitleBandSchema).min(1),
    senaryolar: z.array(ScenarioSchema).min(1),
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
    ad: z
      .string()
      .min(1)
      .refine((t) => wordCount(t) <= 3, 'Kart adı kısa olmalı'),
    ikon: IconName,
    nfr: z.boolean(),
  })
  .strict()

export const TaskSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    no: z.string().regex(/^\d{2}$/),
    baslik: z.string().min(1),
    kisa: z.string().min(1),
    ikon: IconName,
    aciklama: z.string().min(1),
    hedefKitle: z.array(z.object({ ad: z.string().min(1), ikon: IconName }).strict()).min(1),
    kritik: z.array(z.string()).length(3),
    onemli: z.array(z.string()).length(4),
    destek: z.array(z.string()).length(1),
    tuzak: z.array(z.string()).length(6),
    birlesimler: z
      .array(z.object({ ad: z.string().min(1), kartlar: z.array(z.string()).length(2) }).strict())
      .min(1),
  })
  .strict()
  .refine((t) => new Set([...t.kritik, ...t.onemli, ...t.destek, ...t.tuzak]).size === 14, {
    message: 'Bir görevde 14 farklı kart olmalı',
  })
  .refine(
    (t) => {
      const required = new Set([...t.kritik, ...t.onemli, ...t.destek])
      return t.birlesimler.every((b) => b.kartlar.every((c) => required.has(c)))
    },
    { message: 'Birleşimler yalnızca gerekli kartlardan oluşmalı' },
  )

export type Card = z.infer<typeof CardSchema>
export type Task = z.infer<typeof TaskSchema>
