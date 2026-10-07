import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, apiBlob, getAccessToken, refreshSession, restoreSession, setAccessToken, setSessionLostHandler } from './client'
import { ApiError } from './errors'

const session = {
  accessToken: 'new-token',
  tokenType: 'Bearer',
  expiresIn: 900,
  user: { id: 1, email: 'a@b.c', name: 'A', authProvider: 'LOCAL', timezone: 'UTC' },
}

function ok(payload: unknown): Response {
  return Response.json({ status: 'OK', success: true, message: 'ok', payload })
}

function fail(status: number, errorCode: string, message = 'nope', fields: Record<string, string> | null = null) {
  return Response.json({ status: 'ERR', success: false, message, errorCode, fields, payload: null }, { status })
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  setAccessToken(null)
  setSessionLostHandler(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('api', () => {
  it('returns the payload and sends the bearer token and cookie credentials', async () => {
    setAccessToken('abc')
    fetchMock.mockResolvedValueOnce(ok({ id: 5 }))

    expect(await api('/api/habits/5')).toEqual({ id: 5 })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/habits/5')
    expect(init.headers.Authorization).toBe('Bearer abc')
    expect(init.credentials).toBe('include')
  })

  it('builds the query string and leaves undefined params out', async () => {
    fetchMock.mockResolvedValueOnce(ok({}))
    await api('/api/habits', { params: { archived: true, page: 0, sortBy: undefined } })
    expect(fetchMock.mock.calls[0][0]).toBe('/api/habits?archived=true&page=0')
  })

  it('throws an ApiError carrying the error code and field messages', async () => {
    fetchMock.mockResolvedValueOnce(fail(400, 'VALIDATION_FAILED', 'Some fields are invalid', { name: 'must not be blank' }))

    const error = await api('/api/habits', { method: 'POST', body: {} }).catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 400, errorCode: 'VALIDATION_FAILED', fields: { name: 'must not be blank' } })
  })

  it('refreshes once on 401 and retries with the new token', async () => {
    setAccessToken('expired')
    fetchMock
      .mockResolvedValueOnce(fail(401, 'UNAUTHORIZED'))
      .mockResolvedValueOnce(ok(session)) // the refresh
      .mockResolvedValueOnce(ok({ id: 5 }))

    expect(await api('/api/habits/5')).toEqual({ id: 5 })

    expect(fetchMock.mock.calls[1][0]).toBe('/api/auth/refresh')
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe('Bearer new-token')
    expect(getAccessToken()).toBe('new-token')
  })

  it('shares one refresh between requests that fail together', async () => {
    setAccessToken('expired')
    fetchMock.mockImplementation(async (url: string, init: { headers: Record<string, string> }) => {
      if (url === '/api/auth/refresh') return ok(session)
      return init.headers.Authorization === 'Bearer new-token' ? ok({}) : fail(401, 'UNAUTHORIZED')
    })

    await Promise.all([api('/api/habits'), api('/api/notifications'), api('/api/habits/1')])

    const refreshes = fetchMock.mock.calls.filter(([url]) => url === '/api/auth/refresh')
    expect(refreshes).toHaveLength(1)
  })

  it('reports a lost session when the refresh fails, and surfaces the original 401', async () => {
    const lost = vi.fn()
    setSessionLostHandler(lost)
    setAccessToken('expired')
    fetchMock
      .mockResolvedValueOnce(fail(401, 'UNAUTHORIZED'))
      .mockResolvedValueOnce(fail(401, 'AUTH_INVALID_REFRESH_TOKEN'))

    const error = await api('/api/habits').catch((e) => e)

    expect(error).toMatchObject({ status: 401, errorCode: 'UNAUTHORIZED' })
    expect(lost).toHaveBeenCalledOnce()
    expect(getAccessToken()).toBeNull()
  })

  it('does not try to refresh when an auth endpoint itself answers 401', async () => {
    fetchMock.mockResolvedValueOnce(fail(401, 'AUTH_INVALID_CREDENTIALS'))

    const error = await api('/api/auth/login', { method: 'POST', body: {} }).catch((e) => e)

    expect(error).toMatchObject({ errorCode: 'AUTH_INVALID_CREDENTIALS' })
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('treats 204 as no payload', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))
    expect(await api('/api/auth/logout', { method: 'POST' })).toBeUndefined()
  })
})

describe('restoreSession', () => {
  it('signs in from the cookie', async () => {
    fetchMock.mockResolvedValueOnce(ok(session))
    expect(await restoreSession()).toEqual(session)
    expect(getAccessToken()).toBe('new-token')
  })

  it('returns null when there is no valid cookie', async () => {
    fetchMock.mockResolvedValueOnce(fail(401, 'AUTH_INVALID_REFRESH_TOKEN'))
    expect(await restoreSession()).toBeNull()
  })

  it('lets other failures through', async () => {
    fetchMock.mockResolvedValueOnce(fail(500, 'INTERNAL_ERROR'))
    await expect(restoreSession()).rejects.toMatchObject({ status: 500 })
  })

  it('a refresh that failed does not poison the next one', async () => {
    fetchMock.mockResolvedValueOnce(fail(401, 'AUTH_INVALID_REFRESH_TOKEN')).mockResolvedValueOnce(ok(session))
    await expect(refreshSession()).rejects.toBeInstanceOf(ApiError)
    expect((await refreshSession()).accessToken).toBe('new-token')
  })
})

describe('files', () => {
  it('sends FormData as multipart, leaving the boundary to the browser', async () => {
    fetchMock.mockResolvedValueOnce(ok({ id: 1 }))
    const form = new FormData()
    form.append('title', 'Plan')

    await api('/api/resources/files', { method: 'POST', body: form })

    const [, init] = fetchMock.mock.calls[0]
    expect(init.body).toBe(form)
    expect(init.headers['Content-Type']).toBeUndefined()
  })

  it('downloads bytes with the token, refreshing it once when it has expired', async () => {
    setAccessToken('old-token')
    fetchMock
      .mockResolvedValueOnce(fail(401, 'AUTH_TOKEN_EXPIRED'))
      .mockResolvedValueOnce(ok(session))
      .mockResolvedValueOnce(new Response('hello', { headers: { 'Content-Type': 'text/plain' } }))

    const blob = await apiBlob('/api/resources/3/file')

    expect(await blob.text()).toBe('hello')
    const [, init] = fetchMock.mock.calls[2]
    expect(init.headers.Authorization).toBe('Bearer new-token')
    expect(init.headers.Accept).toBe('*/*')
  })

  it('throws the API error when a download fails', async () => {
    fetchMock.mockResolvedValueOnce(fail(404, 'FILE_NOT_FOUND'))
    await expect(apiBlob('/api/resources/3/file')).rejects.toMatchObject({ status: 404, errorCode: 'FILE_NOT_FOUND' })
  })
})
