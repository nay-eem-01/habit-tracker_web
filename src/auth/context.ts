import { createContext, useContext } from 'react'
import type { AuthSession, AuthUser } from '../api/client'

export type AuthState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; user: AuthUser }

export interface AuthContextValue {
  state: AuthState
  /** Call with the session a successful sign-in or registration returned. */
  signIn: (session: AuthSession) => void
  /** The signed-in user changed (confirmed email, new profile); the session stays. */
  updateUser: (user: AuthUser) => void
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}
