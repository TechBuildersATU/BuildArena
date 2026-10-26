import type { LucideProps } from 'lucide-react'
import { ICONS, isIconName } from './icons'

interface IconProps extends LucideProps {
  /** Lucide kebab-case name from the allow-list, e.g. "calendar-plus". */
  name: string
}

/** Renders an allow-listed Lucide icon by name; unknown names fall back to circle-help. */
export function Icon({ name, ...rest }: IconProps) {
  const Component = isIconName(name) ? ICONS[name] : ICONS['circle-help']
  return <Component aria-hidden {...rest} />
}
