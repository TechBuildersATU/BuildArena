import { useSettingsStore } from '@/stores/settingsStore'

/** The club's logo, recoloured by the club for the palette: ink on the paper, light at night. */
export const LOGO_LIGHT = '/logo/techbuilders_logo_light.png'
export const LOGO_DARK = '/logo/techbuilders_logo_dark.png'

/** The logo that suits the current theme. */
export function useLogoSrc(): string {
  return useSettingsStore((st) => st.theme) === 'dark' ? LOGO_DARK : LOGO_LIGHT
}
