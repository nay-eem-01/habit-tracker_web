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

/** Always succeeds the same way, whether or not the email has an account: the server never says. */
export async function forgotPassword(email: string): Promise<void> {
  await api<void>('/api/auth/password/forgot', { method: 'POST', body: { email } })
}

/** Sets a new password with the emailed token and signs in; other devices are signed out. */
export async function resetPassword(token: string, newPassword: string): Promise<AuthSession> {
  return keep(await api<AuthSession>('/api/auth/password/reset', { method: 'POST', body: { token, newPassword } }))
}

/** Needs the current password; this session gets fresh tokens, every other one is signed out. */
export async function changePassword(currentPassword: string, newPassword: string): Promise<AuthSession> {
  return keep(
    await api<AuthSession>('/api/auth/password/change', { method: 'POST', body: { currentPassword, newPassword } }),
  )
}

/** Confirms the email with the token from the emailed link. Public: the link may open on another device. */
export async function verifyEmail(token: string): Promise<void> {
  await api<void>('/api/auth/email/verify', { method: 'POST', body: { token } })
}

/** Emails a new confirmation link (at most one a minute). */
export async function resendVerification(): Promise<void> {
  await api<void>('/api/auth/email/verification', { method: 'POST' })
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
