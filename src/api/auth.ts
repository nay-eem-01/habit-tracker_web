import { api, setAccessToken, type AuthSession } from './client'

export interface RegisterInput {
  name: string
  email: string
  password: string
  timezone: string
}

export async function login(email: string, password: string): Promise<AuthSession> {
  return keep(await api<AuthSession>('/api/auth/login', { method: 'POST', body: { email, password } }))
}

export async function register(input: RegisterInput): Promise<AuthSession> {
  return keep(await api<AuthSession>('/api/auth/register', { method: 'POST', body: input }))
}

/** Revokes the refresh token and clears its cookie; the in-memory access token goes either way. */
export async function logout(): Promise<void> {
  try {
    await api<void>('/api/auth/logout', { method: 'POST' })
  } finally {
    setAccessToken(null)
  }
}

function keep(session: AuthSession): AuthSession {
  setAccessToken(session.accessToken)
  return session
}
