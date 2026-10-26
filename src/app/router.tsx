import { Navigate, type RouteObject } from 'react-router'
import { Admin } from '@/screens/Admin'
import { DuelGame } from '@/screens/DuelGame'
import { DuelIntro } from '@/screens/DuelIntro'
import { DuelResult } from '@/screens/DuelResult'
import { Home } from '@/screens/Home'
import { Leaderboard } from '@/screens/Leaderboard'
import { Onboarding } from '@/screens/Onboarding'
import { ScenarioGame } from '@/screens/ScenarioGame'
import { ScenarioIntro } from '@/screens/ScenarioIntro'
import { ScenarioNickname } from '@/screens/ScenarioNickname'
import { ScenarioResult } from '@/screens/ScenarioResult'
import { RootLayout } from './RootLayout'
import { ROUTES } from './routes'

// Shared by the browser router (main.tsx) and the memory router (component tests).
export const appRoutes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      { path: ROUTES.tutorial, element: <Onboarding /> },
      { path: ROUTES.home, element: <Home /> },
      { path: ROUTES.duelIntro, element: <DuelIntro /> },
      { path: ROUTES.duelGame, element: <DuelGame /> },
      { path: ROUTES.duelResult, element: <DuelResult /> },
      { path: ROUTES.scenarioNickname, element: <ScenarioNickname /> },
      { path: ROUTES.scenarioIntro, element: <ScenarioIntro /> },
      { path: ROUTES.scenarioGame, element: <ScenarioGame /> },
      { path: ROUTES.scenarioResult, element: <ScenarioResult /> },
      { path: ROUTES.leaderboard, element: <Leaderboard /> },
      { path: ROUTES.admin, element: <Admin /> },
      { path: '*', element: <Navigate to={ROUTES.home} replace /> },
    ],
  },
]
