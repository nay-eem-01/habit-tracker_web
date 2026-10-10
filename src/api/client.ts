import { ApiError } from './errors'

/** The envelope around every response body. `payload` is the data on success. */
export interface Envelope<T> {
  status: string
  success: boolean
  message: string
  errorCode: string | null
  correlationId: string | null
  fields: Record<string, string> | null
  payload: T | null
}

export interface AuthUser {
  id: number
  email: string
  name: string
  authProvider: string
  timezone: string
}

export interface AuthSession {
  accessToken: string
  tokenType: string
  expiresIn: number
  user: AuthUser
}

/** Empty in development (the Vite proxy forwards `/api`); set VITE_API_BASE_URL only for a split deploy. */
const BASE_URL: string = import.meta.env?.VITE_API_BASE_URL ?? ''

/**
 * The access token lives in memory only — never localStorage, where a script could read it. A page
 * reload loses it; `restoreSession()` gets a new one from the httpOnly refresh cookie.
 */
let accessToken: string | null = null
let refreshing: Promise<AuthSession> | null = null
let onSessionLost: () => void = () => {}

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string | null): void {
  accessToken = token
}

/** Called when the session can't be refreshed any more (cookie expired, revoked, reused). */
export function setSessionLostHandler(handler: () => void): void {
  onSessionLost = handler
}

interface RequestOptions {
  method?: string
  body?: unknown
  /** Query string values; undefined ones are left out. */
  params?: Record<string, string | number | boolean | undefined>
  /** What to accept back; JSON unless a file is expected. */
  accept?: string
}

/**
 * Calls the API and returns the envelope's payload; throws {@link ApiError} for anything but 2xx.
 * A `FormData` body goes as multipart (the browser sets the boundary); anything else as JSON.
 */
export function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return request(path, options, parse<T>)
}

/** A file's bytes, for an endpoint that answers with the file itself instead of the envelope. */
export function apiBlob(path: string): Promise<Blob> {
  return request(path, { accept: '*/*' }, parseBlob)
}

async function request<T>(path: string, options: RequestOptions, read: (response: Response) => Promise<T>): Promise<T> {
  const first = await send(path, options)
  if (first.status === 401 && !isAuthPath(path)) {
    try {
      await refreshSession()
    } catch {
      onSessionLost()
      throw await toError(first)
    }
    return read(await send(path, options))
  }
  return read(first)
}

/**
 * Exchanges the refresh cookie for a new access token. One call at a time: several requests that
 * hit 401 together share a single refresh, because the server rotates the cookie and treats a
 * second use of the old one as theft.
 */
export function refreshSession(): Promise<AuthSession> {
  refreshing ??= send('/api/auth/refresh', { method: 'POST' })
    .then((response) => parse<AuthSession>(response))
    .then((session) => {
      accessToken = session.accessToken
      return session
    })
    .catch((error) => {
      accessToken = null
      throw error
    })
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

/** On app start: sign back in from the refresh cookie, or `null` if there isn't a valid one. */
export async function restoreSession(): Promise<AuthSession | null> {
  try {
    return await refreshSession()
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null
    throw error
  }
}

/**
 * Endpoints that work without an access token: a 401 there is the answer (wrong password, bad
 * cookie), not an expired token to refresh. `/password/change` and `/me` need one, so they refresh.
 */
const PUBLIC_AUTH_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/auth/password/forgot',
  '/api/auth/password/reset',
])

function isAuthPath(path: string): boolean {
  return PUBLIC_AUTH_PATHS.has(path)
}

function send(path: string, { method = 'GET', body, params, accept = 'application/json' }: RequestOptions): Promise<Response> {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined) query.set(key, String(value))
  }
  const url = `${BASE_URL}${path}${query.size > 0 ? `?${query}` : ''}`
  const multipart = body instanceof FormData
  const headers: Record<string, string> = { Accept: accept }
  if (body !== undefined && !multipart) headers['Content-Type'] = 'application/json'
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`
  return fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : multipart ? body : JSON.stringify(body),
    credentials: 'include', // the refresh cookie
  })
}

async function parse<T>(response: Response): Promise<T> {
  if (!response.ok) throw await toError(response)
  if (response.status === 204) return undefined as T
  const envelope = (await response.json()) as Envelope<T>
  return envelope.payload as T
}

async function parseBlob(response: Response): Promise<Blob> {
  if (!response.ok) throw await toError(response)
  return response.blob()
}

async function toError(response: Response): Promise<ApiError> {
  const retryAfter = Number(response.headers.get('Retry-After')) || null
  try {
    const body = (await response.clone().json()) as Partial<Envelope<unknown>>
    return new ApiError(
      response.status,
      body.errorCode ?? null,
      body.message ?? response.statusText,
      body.fields ?? null,
      body.correlationId ?? null,
      retryAfter,
    )
  } catch {
    return new ApiError(response.status, null, response.statusText || 'Request failed')
  }
}
