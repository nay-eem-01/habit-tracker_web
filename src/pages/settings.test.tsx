// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fail, ok, renderApp, resetApp, session, stubApi, user } from '../test/helpers'

const appShell = {
  'POST /api/auth/refresh': () => ok(session),
  'GET /api/me/level': () => ok({ xp: 0, level: 1, tier: 'BRONZE', xpForNextLevel: 100, progressToNextLevel: 0, spentXp: 0, xpBalance: 0 }),
  'GET /api/notifications/unread-count': () => ok({ count: 0 }),
}

beforeEach(resetApp)
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('settings', () => {
  it('saves name, timezone and the email choice, and offers the device’s timezone', async () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({ timeZone: 'Europe/London' } as Intl.ResolvedDateTimeFormatOptions)
    const calls = stubApi({
      ...appShell,
      'PUT /api/me': (call) => ok({ ...user, ...(call.body as object) }),
    })
    renderApp('/settings')
    const input = userEvent.setup()

    // the page is its own chunk and draws ~400 timezones; under a loaded CI box that takes over a second
    const name = await screen.findByLabelText('Name', {}, { timeout: 5000 })
    await input.clear(name)
    await input.type(name, 'Nayeem A.')
    await input.click(screen.getByRole('button', { name: 'Use it' }))
    await input.click(screen.getByRole('checkbox', { name: /News and tips/ }))
    await input.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Saved.')).toBeTruthy()
    expect(calls.find((c) => c.method === 'PUT')!.body).toEqual({ name: 'Nayeem A.', timezone: 'Europe/London', marketingEmails: true })
    expect(screen.getByRole('button', { name: 'Account, Nayeem A.' })).toBeTruthy()
  })

  it('deletes the account only with the password, then signs out', async () => {
    const calls = stubApi({
      ...appShell,
      'DELETE /api/me': (call) => ((call.body as { password?: string }).password === 'right-one' ? new Response(null, { status: 204 }) : fail(400, 'AUTH_WRONG_PASSWORD')),
      'POST /api/auth/logout': () => fail(401, 'AUTH_INVALID_REFRESH_TOKEN'),
    })
    renderApp('/settings')
    const input = userEvent.setup()

    await input.click(await screen.findByRole('button', { name: 'Delete my account' }, { timeout: 5000 }))
    await input.type(screen.getByLabelText('Password'), 'wrong-one')
    await input.click(screen.getByRole('button', { name: 'Delete everything' }))
    expect(await screen.findByText("That isn't your current password.")).toBeTruthy()

    await input.clear(screen.getByLabelText('Password'))
    await input.type(screen.getByLabelText('Password'), 'right-one')
    await input.click(screen.getByRole('button', { name: 'Delete everything' }))
    expect(await screen.findByRole('heading', { name: /Welcome back|Sign in/ })).toBeTruthy()
    expect(calls.filter((c) => c.method === 'DELETE')).toHaveLength(2)
  })
})
