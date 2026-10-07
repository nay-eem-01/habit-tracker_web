// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getAccessToken } from '../api/client'
import { fail, ok, renderApp, resetApp, session, stubApi } from '../test/helpers'

const guest = { 'POST /api/auth/refresh': () => fail(401, 'AUTH_INVALID_REFRESH_TOKEN') }
const signedIn = { 'POST /api/auth/refresh': () => ok(session) }
/** What a signed-in page asks for besides the page itself. */
const appShell = {
  'GET /api/me/level': () => ok({ xp: 0, level: 1, tier: 'BRONZE', xpForNextLevel: 100, progressToNextLevel: 0 }),
  'GET /api/notifications/unread-count': () => ok({ count: 0 }),
}
const dashboard = {
  'GET /api/dashboard': () =>
    ok({
      today: { date: '2026-10-07', due: 0, done: 0, habits: [] },
      completion: {},
      atRisk: [],
      best: [],
      slipping: [],
      goals: [],
      level: { xp: 0, level: 1, tier: 'BRONZE', xpForNextLevel: 100, progressToNextLevel: 0 },
    }),
  'GET /api/dashboard/patterns': () => ok({ heatmap: [], weekdays: [], weakestDay: null, strongestDay: null, hours: [], peakHour: null }),
}
const fresh = { ...session, accessToken: 'token-after-reset' }

beforeEach(resetApp)
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('forgot password', () => {
  it('opens from sign in with the email already typed, and says the same whether or not it exists', async () => {
    const calls = stubApi({ ...guest, 'POST /api/auth/password/forgot': () => ok(null, 202) })
    renderApp('/signin')
    const input = userEvent.setup()

    await input.type(await screen.findByLabelText('Email'), 'nayeem@example.com')
    await input.click(screen.getByRole('link', { name: 'Forgot password?' }))
    await screen.findByRole('heading', { name: 'Forgot your password?' })
    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('nayeem@example.com')
    await input.click(screen.getByRole('button', { name: 'Send reset link' }))

    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeTruthy()
    expect(screen.getByText('nayeem@example.com')).toBeTruthy()
    expect(calls.find((c) => c.path === '/api/auth/password/forgot')!.body).toEqual({ email: 'nayeem@example.com' })
  })

  it('lets you try another address', async () => {
    stubApi({ ...guest, 'POST /api/auth/password/forgot': () => ok(null, 202) })
    renderApp('/forgot-password')
    const input = userEvent.setup()

    await input.type(await screen.findByLabelText('Email'), 'wrong@example.com')
    await input.click(screen.getByRole('button', { name: 'Send reset link' }))
    await input.click(await screen.findByRole('button', { name: 'Use a different email' }))

    expect(screen.getByRole('heading', { name: 'Forgot your password?' })).toBeTruthy()
  })
})

describe('reset password', () => {
  it('checks the new password, then sets it with the emailed token and signs in', async () => {
    const calls = stubApi({ ...guest, ...appShell, ...dashboard, 'POST /api/auth/password/reset': () => ok(fresh) })
    renderApp('/reset-password#token=abc123')
    const input = userEvent.setup()

    await input.type(await screen.findByLabelText('New password'), 'short')
    await input.click(screen.getByRole('button', { name: 'Save and sign in' }))
    expect(screen.getByText('Use at least 8 characters.')).toBeTruthy()

    await input.type(screen.getByLabelText('New password'), '-enough')
    await input.type(screen.getByLabelText('Confirm new password'), 'short-enouhg')
    await input.click(screen.getByRole('button', { name: 'Save and sign in' }))
    expect(screen.getByText("The two passwords don't match.")).toBeTruthy()
    expect(calls.some((c) => c.path === '/api/auth/password/reset')).toBe(false)

    await input.clear(screen.getByLabelText('Confirm new password'))
    await input.type(screen.getByLabelText('Confirm new password'), 'short-enough')
    await input.click(screen.getByRole('button', { name: 'Save and sign in' }))

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeTruthy()
    expect(calls.find((c) => c.path === '/api/auth/password/reset')!.body).toEqual({
      token: 'abc123',
      newPassword: 'short-enough',
    })
    expect(getAccessToken()).toBe('token-after-reset')
  })

  it('offers a new link when the token has expired or was used', async () => {
    stubApi({ ...guest, 'POST /api/auth/password/reset': () => fail(400, 'AUTH_INVALID_RESET_TOKEN') })
    renderApp('/reset-password#token=old')
    const input = userEvent.setup()

    await input.type(await screen.findByLabelText('New password'), 'a-new-password')
    await input.type(screen.getByLabelText('Confirm new password'), 'a-new-password')
    await input.click(screen.getByRole('button', { name: 'Save and sign in' }))

    expect(await screen.findByRole('heading', { name: "This link doesn't work" })).toBeTruthy()
    expect(screen.getByText(/expired or was already used/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ask for a new link' }).getAttribute('href')).toBe('/forgot-password')
  })

  it('explains a link with no token', async () => {
    stubApi({ ...guest })
    renderApp('/reset-password')
    expect(await screen.findByRole('heading', { name: "This link doesn't work" })).toBeTruthy()
    expect(screen.getByText(/missing its token/)).toBeTruthy()
  })
})

describe('change password', () => {
  it('opens from the account menu and changes it, keeping this session', async () => {
    const calls = stubApi({
      ...signedIn,
      ...appShell,
      ...dashboard,
      'POST /api/auth/password/change': () => ok({ ...session, accessToken: 'token-after-change' }),
    })
    renderApp('/')
    const input = userEvent.setup()

    await input.click(await screen.findByRole('button', { name: /^Account,/ }))
    await input.click(screen.getByRole('link', { name: 'Change password' }))
    await input.type(await screen.findByLabelText('Current password'), 'old-password')
    await input.type(screen.getByLabelText('New password'), 'new-password')
    await input.type(screen.getByLabelText('Confirm new password'), 'new-password')
    await input.click(screen.getByRole('button', { name: 'Change password' }))

    expect((await screen.findByRole('status')).textContent).toContain('Password changed')
    expect(calls.find((c) => c.path === '/api/auth/password/change')!.body).toEqual({
      currentPassword: 'old-password',
      newPassword: 'new-password',
    })
    expect(getAccessToken()).toBe('token-after-change')
    expect((screen.getByLabelText('Current password') as HTMLInputElement).value).toBe('')
  })

  it('marks a wrong current password on its field', async () => {
    stubApi({ ...signedIn, ...appShell, 'POST /api/auth/password/change': () => fail(400, 'AUTH_WRONG_PASSWORD') })
    renderApp('/account/password')
    const input = userEvent.setup()

    await input.type(await screen.findByLabelText('Current password'), 'guess')
    await input.type(screen.getByLabelText('New password'), 'new-password')
    await input.type(screen.getByLabelText('Confirm new password'), 'new-password')
    await input.click(screen.getByRole('button', { name: 'Change password' }))

    expect(await screen.findByText("That isn't your current password.")).toBeTruthy()
    expect(screen.getByLabelText('Current password').getAttribute('aria-invalid')).toBe('true')
  })

  it('points an account without a password to setting one by email', async () => {
    stubApi({ ...signedIn, ...appShell, 'POST /api/auth/password/change': () => fail(409, 'AUTH_PASSWORD_NOT_SET') })
    renderApp('/account/password')
    const input = userEvent.setup()

    await input.type(await screen.findByLabelText('New password'), 'new-password')
    await input.type(screen.getByLabelText('Confirm new password'), 'new-password')
    await input.click(screen.getByRole('button', { name: 'Change password' }))

    expect((await screen.findByRole('alert')).textContent).toContain('no password yet')
    expect(screen.getByRole('link', { name: 'Set one by email' }).getAttribute('href')).toBe('/forgot-password')
  })
})
