// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fail, ok, page, renderApp, resetApp, session, stubApi } from '../test/helpers'

const guest = { 'POST /api/auth/refresh': () => fail(401, 'AUTH_INVALID_REFRESH_TOKEN') }
const unconfirmed = { ...session, user: { ...session.user, emailVerified: false } }
const appShell = {
  'GET /api/me/level': () => ok({ xp: 0, level: 1, tier: 'BRONZE', xpForNextLevel: 100, progressToNextLevel: 0, spentXp: 0, xpBalance: 0 }),
  'GET /api/notifications/unread-count': () => ok({ count: 0 }),
  'GET /api/habits': () => ok(page([])),
}

beforeEach(resetApp)
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('confirming an email', () => {
  it('confirms once from the link, signed out, and offers sign in', async () => {
    const calls = stubApi({ ...guest, 'POST /api/auth/email/verify': () => ok(null) })
    renderApp('/verify-email#token=abc123')

    expect(await screen.findByRole('heading', { name: 'Email confirmed' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeTruthy()
    const verifies = calls.filter((c) => c.path === '/api/auth/email/verify')
    expect(verifies).toHaveLength(1)
    expect(verifies[0].body).toEqual({ token: 'abc123' })
  })

  it('says when the link has expired or was used', async () => {
    stubApi({ ...guest, 'POST /api/auth/email/verify': () => fail(400, 'AUTH_INVALID_VERIFY_TOKEN') })
    renderApp('/verify-email#token=old')
    expect(await screen.findByRole('heading', { name: "This link doesn't work" })).toBeTruthy()
    expect(screen.getByText(/expired or was already used/)).toBeTruthy()
  })
})

describe('the confirm-your-email banner', () => {
  it('shows while unconfirmed and sends the link again', async () => {
    const calls = stubApi({
      'POST /api/auth/refresh': () => ok(unconfirmed),
      ...appShell,
      'POST /api/auth/email/verification': () => ok(null, 202),
    })
    renderApp('/today')

    await userEvent.click(await screen.findByRole('button', { name: 'Send it again' }))
    expect(await screen.findByText('Sent. Check your inbox.')).toBeTruthy()
    expect(calls.some((c) => c.method === 'POST' && c.path === '/api/auth/email/verification')).toBe(true)
  })

  it('stays away once confirmed', async () => {
    stubApi({ 'POST /api/auth/refresh': () => ok({ ...session, user: { ...session.user, emailVerified: true } }), ...appShell })
    renderApp('/today')
    await screen.findByRole('heading', { name: 'Today' })
    expect(screen.queryByText(/Confirm your email/)).toBeNull()
  })
})
