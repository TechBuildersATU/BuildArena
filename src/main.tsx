// Fonts are bundled locally (no internet at the booth). latin + latin-ext cover Turkish.
import '@fontsource/plus-jakarta-sans/latin-500.css'
import '@fontsource/plus-jakarta-sans/latin-ext-500.css'
import '@fontsource/plus-jakarta-sans/latin-600.css'
import '@fontsource/plus-jakarta-sans/latin-ext-600.css'
import '@fontsource/plus-jakarta-sans/latin-700.css'
import '@fontsource/plus-jakarta-sans/latin-ext-700.css'
import '@fontsource/plus-jakarta-sans/latin-800.css'
import '@fontsource/plus-jakarta-sans/latin-ext-800.css'
import '@fontsource/bricolage-grotesque/latin-600.css'
import '@fontsource/bricolage-grotesque/latin-ext-600.css'
import '@fontsource/bricolage-grotesque/latin-700.css'
import '@fontsource/bricolage-grotesque/latin-ext-700.css'
import '@fontsource/bricolage-grotesque/latin-800.css'
import '@fontsource/bricolage-grotesque/latin-ext-800.css'
import '@fontsource/jetbrains-mono/latin-700.css'
import '@fontsource/jetbrains-mono/latin-ext-700.css'
import './index.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { applyFirstLaunchRedirect } from './app/firstLaunch'
import { appRoutes } from './app/router'
import { setupNativeApp } from './app/native'
import { getTestFlags } from './app/testFlags'
import './app/theme'
import './audio/music'
import { seedDemoIfRequested } from './db/demoData'

// The redirect must run before the router reads the URL.
applyFirstLaunchRedirect()
setupNativeApp()
const router = createBrowserRouter(appRoutes)
seedDemoIfRequested(getTestFlags().demo).catch((error: unknown) => console.error(error))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
