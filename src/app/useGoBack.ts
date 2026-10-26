import { useLocation, useNavigate } from 'react-router'
import { ROUTES } from './routes'

/** "Back / Close": returns to the previous screen, or Home when the app was opened here. */
export function useGoBack(): () => void {
  const navigate = useNavigate()
  const location = useLocation()
  return () => {
    if (location.key === 'default') void navigate(ROUTES.home, { replace: true })
    else void navigate(-1)
  }
}
