// @vitest-environment jsdom
import { cleanup, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fail, ok, page, renderApp, resetApp, session, stubApi } from '../test/helpers'

const guest = { 'POST /api/auth/refresh': () => fail(401, 'AUTH_INVALID_REFRESH_TOKEN') }

beforeEach(resetApp)
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  delete window.google
})

/** Stands in for Google's script: keeps the callback, draws nothing. */
function fakeGoogle() {
  const google = { callback: (() => {}) as (response: { credential: string }) => void, rendered: false }
  window.google = {
    accounts: {
      id: {
        initialize: ({ callback }) => (google.callback = callback),
        renderButton: () => (google.rendered = true),
      },
    },
  }
  return google
}

describe('Continue with Google', () => {
  it('loads Google once, then signs in with the credential and the browser’s timezone', async () => {
    const google = fakeGoogle()
    const calls = stubApi({
      ...guest,
      'POST /api/auth/google': () => ok(session),
      'GET /api/me/level': () => ok({ xp: 0, level: 1, tier: 'BRONZE', xpForNextLevel: 100, progressToNextLevel: 0, spentXp: 0, xpBalance: 0 }),
      'GET /api/notifications/unread-count': () => ok({ count: 0 }),
      'GET /api/dashboard': () => ok({ today: { date: '2026-10-07', due: 0, done: 0, habits: [] }, completion: {}, atRisk: [], best: [], slipping: [], goals: [], level: null }),
      'GET /api/dashboard/patterns': () => ok({ heatmap: [], weekdays: [], weakestDay: null, strongestDay: null, hours: [], peakHour: null }),
      'GET /api/habits': () => ok(page([])),
    })
    renderApp('/signin')

    await screen.findByRole('heading', { name: 'Sign in' })
    const tag = await waitFor(() => document.head.querySelector<HTMLScriptElement>('script[src*="accounts.google.com/gsi"]')!)
    tag.dispatchEvent(new Event('load'))
    await waitFor(() => expect(google.rendered).toBe(true))

    google.callback({ credential: 'google-id-token' })
    await waitFor(() => expect(calls.some((c) => c.path === '/api/auth/google')).toBe(true))
    expect(calls.find((c) => c.path === '/api/auth/google')!.body).toEqual({
      idToken: 'google-id-token',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })
  })
})
