import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { logout } from '../api/auth'
import { restoreSession, setSessionLostHandler, type AuthSession } from '../api/client'
import { queryClient } from '../queryClient'
import { AuthContext, type AuthState } from './context'

/**
 * Knows who is signed in. On start it tries the httpOnly refresh cookie; if the session is lost
 * later (cookie expired or revoked) the API client calls back here and everything resets.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })

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

  const signOut = useCallback(async () => {
    try {
      await logout()
    } catch {
      // the server couldn't be told; the session is gone locally either way
    } finally {
      queryClient.clear()
      setState({ status: 'anonymous' })
    }
  }, [])

  const value = useMemo(() => ({ state, signIn, signOut }), [state, signIn, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
