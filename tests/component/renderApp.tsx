import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { appRoutes } from '@/app/router'

/** Renders the real route tree at `entries` (last one active); returns the router. */
export function renderApp(...entries: string[]) {
  const router = createMemoryRouter(appRoutes, {
    initialEntries: entries,
    initialIndex: entries.length - 1,
  })
  render(<RouterProvider router={router} />)
  return router
}
