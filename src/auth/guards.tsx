import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './context'

function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <p role="status" className="font-display text-xl text-ink-soft">
        Loading…
      </p>
    </div>
  )
}

interface FromState {
  from?: string
}

/** Pages that need a signed-in user. Anyone else is sent to sign in, and brought back afterwards. */
export function RequireAuth() {
  const { state } = useAuth()
  const location = useLocation()
  if (state.status === 'loading') return <Splash />
  if (state.status === 'anonymous') {
    return <Navigate to="/signin" replace state={{ from: location.pathname + location.search } satisfies FromState} />
  }
  return <Outlet />
}

/** Sign-in and register: nothing to do here once signed in. */
export function GuestOnly() {
  const { state } = useAuth()
  const location = useLocation()
  if (state.status === 'loading') return <Splash />
  if (state.status === 'authenticated') {
    return <Navigate to={(location.state as FromState | null)?.from ?? '/'} replace />
  }
  return <Outlet />
}
