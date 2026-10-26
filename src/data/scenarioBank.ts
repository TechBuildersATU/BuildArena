import { ScenarioBankSchema, type Scenario } from '@/ai/schemas'
import raw from './scenarios.json'

/** Offline scenario bank, validated at startup (an invalid bank fails loudly in tests and CI). */
export const SCENARIO_BANK = ScenarioBankSchema.parse(raw)

export const SCENARIOS: readonly Scenario[] = SCENARIO_BANK.senaryolar

export function findScenario(id: string | null | undefined): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id)
}

/** "Yemekhane: Öğle Saati Krizi" → "Yemekhane" */
export function shortName(s: Scenario): string {
  return s.baslik.split(':')[0]
}

/** "Yemekhane: Öğle Saati Krizi" → "Öğle Saati Krizi" */
export function crisisName(s: Scenario): string {
  return (s.baslik.split(':')[1] ?? '').trim()
}
