import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { logout } from '../api/auth'
import { restoreSession, setForbiddenHandler, setSessionLostHandler, type AuthSession, type AuthUser } from '../api/client'
import { disablePush, pushSupported } from '../push/push'
import { queryClient } from '../queryClient'
import { AuthContext, type AuthState } from './context'

/**
 * Knows who is signed in. On start it tries the httpOnly refresh cookie; if the session is lost
 * later (cookie expired or revoked) the API client calls back here and everything resets.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })
  const navigate = useNavigate()
  // read by the API client's callbacks, which outlive any one render
  const admin = useRef(false)
  useEffect(() => {
    admin.current = state.status === 'authenticated' && state.user.role === 'ADMIN'
  }, [state])

  // backstop: an admin that somehow called the user app (403 FORBIDDEN) is taken back to theirs
  useEffect(() => {
    setForbiddenHandler(() => {
      if (admin.current) navigate('/admin', { replace: true })
    })
  }, [navigate])

  useEffect(() => {
    let active = true
    restoreSession()
      .then((session) => {
        if (active) setState(session ? { status: 'authenticated', user: session.user } : { status: 'anonymous' })
      })
      .catch(() => {
        // server or network trouble: show the sign-in page rather than a blank screen
        if (active) setState({ status: 'anonymous' })
      })
    setSessionLostHandler(() => {
      queryClient.clear()
      setState({ status: 'anonymous' })
    })
    return () => {
      active = false
    }
  }, [])

  const signIn = useCallback((session: AuthSession) => {
    setState({ status: 'authenticated', user: session.user })
  }, [])

  const updateUser = useCallback((user: AuthUser) => {
    setState((current) => (current.status === 'authenticated' ? { status: 'authenticated', user } : current))
  }, [])

  const signOut = useCallback(async () => {
    try {
      // a signed-out browser shouldn't get this user's reminders; best effort, it never blocks signing out.
      // An admin has no push (those endpoints answer 403 for them).
      if (!admin.current && pushSupported()) await disablePush().catch(() => {})
      await logout()
    } catch {
      // the server couldn't be told; the session is gone locally either way
    } finally {
      queryClient.clear()
      setState({ status: 'anonymous' })
    }
  }, [])

  const value = useMemo(() => ({ state, signIn, updateUser, signOut }), [state, signIn, updateUser, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
