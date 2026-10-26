import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { moodFor, useMood } from '@/audio/useMood'
import { BootIntro } from '@/components/BootIntro'
import { Stage } from '@/components/Stage'
import { useUiStore } from '@/stores/uiStore'
import { isNativeApp } from './native'
import { ROUTES } from './routes'
import { getTestFlags } from './testFlags'

export function RootLayout() {
  const { pathname } = useLocation()
  const lockStaff = useUiStore((st) => st.lockStaff)
  // the APK opens with an animation (in the browser only with ?intro=1)
  const [intro, setIntro] = useState(() => isNativeApp() || getTestFlags().intro)

  useMood(moodFor(pathname))

  // Leaving the staff menu always locks it again.
  useEffect(() => {
    if (pathname !== ROUTES.admin) lockStaff()
  }, [pathname, lockStaff])

  return (
    <Stage>
      <Outlet />
      {intro && <BootIntro onDone={() => setIntro(false)} />}
    </Stage>
  )
}
