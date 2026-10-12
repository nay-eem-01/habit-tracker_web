// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { choose, ok, page, renderApp, resetApp, session, stubApi } from '../test/helpers'

const days = (counts: number[]) => counts.map((count, i) => ({ date: `2026-10-${String(i + 1).padStart(2, '0')}`, count }))
const stats = {
  users: { total: 40, verified: 30, withGoogle: 12, pro: 3, suspended: 1, signUps: days([1, 0, 2]) },
  active: { day: 5, week: 18, month: 27 },
  usage: { activeHabits: 120, activeGoals: 33, pushUsers: 10, freeUsersAtLimit: 4, checkIns: days([10, 12, 9]) },
  delivery: { since: '2026-10-10T08:00:00Z', emailsSent: 50, emailsFailed: 2, pushesSent: 80, pushesGone: 1, pushesFailed: 0 },
}
const admin = { ...session, user: { ...session.user, role: 'ADMIN' } }
const shell = {
  'GET /api/me/level': () => ok({ xp: 0, level: 1, tier: 'BRONZE', xpForNextLevel: 100, progressToNextLevel: 0, spentXp: 0, xpBalance: 0 }),
  'GET /api/notifications/unread-count': () => ok({ count: 0 }),
}

beforeEach(resetApp)
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('admin overview', () => {
  it('shows users, who is active, usage and delivery, with failures in the alert colour', async () => {
    stubApi({ 'POST /api/auth/refresh': () => ok(admin), 'GET /api/admin/stats': () => ok(stats) })
    renderApp('/admin')

    expect(await screen.findByText('40')).toBeTruthy()
    expect(screen.getByText('30 (75%)')).toBeTruthy()
    expect(screen.getByText('Might upgrade')).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Check-ins: 31 check-ins in the last 30 days' })).toBeTruthy()
    expect(screen.getByText('Emails failed').nextElementSibling!.className).toContain('text-alert')
    expect(screen.getByText('Pushes failed').nextElementSibling!.className).not.toContain('text-alert')
  })

  it('is not there for anyone else: they land on the home page', async () => {
    const calls = stubApi({
      'POST /api/auth/refresh': () => ok(session),
      ...shell,
      'GET /api/dashboard': () => ok({ today: { date: '2026-10-07', due: 0, done: 0, habits: [] }, completion: {}, atRisk: [], best: [], slipping: [], goals: [], level: null }),
      'GET /api/dashboard/patterns': () => ok({ heatmap: [], weekdays: [], weakestDay: null, strongestDay: null, hours: [], peakHour: null }),
      'GET /api/habits': () => ok(page([])),
    })
    renderApp('/admin')

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeTruthy()
    expect(calls.some((c) => c.path.startsWith('/api/admin'))).toBe(false)
  })
})

const person = (id: number, email: string, extra: object = {}) => ({
  id,
  email,
  name: 'Someone',
  authProvider: 'LOCAL',
  emailVerified: true,
  plan: 'FREE',
  role: 'USER',
  suspendedAt: null,
  createdAt: '2026-10-01T10:00:00Z',
  ...extra,
})

describe('admin users', () => {
  it('lists users with their badges, searches after a pause and sorts', async () => {
    const calls = stubApi({
      'POST /api/auth/refresh': () => ok(admin),
      'GET /api/admin/users': (call) =>
        ok(page(call.params.get('q') ? [person(2, 'sam@example.com')] : [person(1, 'ana@example.com', { plan: 'PRO', suspendedAt: '2026-10-05T00:00:00Z' }), person(2, 'sam@example.com')])),
    })
    renderApp('/admin/users')
    const input = userEvent.setup()

    expect(await screen.findByText('ana@example.com')).toBeTruthy()
    expect(screen.getByText('Suspended')).toBeTruthy()
    expect(screen.getByText('Pro')).toBeTruthy()
    expect(screen.getByRole('link', { name: /sam@example.com/ }).getAttribute('href')).toBe('/admin/users/2')

    await input.type(screen.getByLabelText('Search by email'), 'sam')
    await waitFor(() => expect(screen.queryByText('ana@example.com')).toBeNull())
    // one request for the whole word, not one per letter
    expect(calls.filter((c) => c.params.get('q')).map((c) => c.params.get('q'))).toEqual(['sam'])

    await choose(input, 'Sort', 'Email A–Z')
    await waitFor(() => expect(calls.at(-1)!.params.get('sortBy')).toBe('email'))
    expect(calls.at(-1)!.params.get('sortDir')).toBe('asc')
  })
})

describe('one user, for an admin', () => {
  const detail = (user: object) => ({ user, activeHabits: 5, archivedHabits: 1, checkIns: 42, goals: 2, lastActiveAt: null, pushSubscriptions: 1 })

  it('shows counts only, switches the plan and suspends after a confirm', async () => {
    let current = person(7, 'sam@example.com')
    const calls = stubApi({
      'POST /api/auth/refresh': () => ok(admin),
      'GET /api/admin/users/7': () => ok(detail(current)),
      'PUT /api/admin/users/7/plan': (call) => ok((current = { ...current, ...(call.body as object) })),
      'POST /api/admin/users/7/suspend': () => ok((current = { ...current, suspendedAt: '2026-10-11T09:00:00Z' })),
    })
    renderApp('/admin/users/7')
    const input = userEvent.setup()

    expect(await screen.findByRole('heading', { name: 'sam@example.com' })).toBeTruthy()
    expect(screen.getByText('42')).toBeTruthy()
    expect(screen.getByText('Never')).toBeTruthy()

    await input.click(screen.getByRole('radio', { name: 'Pro' }))
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Pro' }).getAttribute('aria-checked')).toBe('true'))
    expect(calls.find((c) => c.method === 'PUT')!.body).toEqual({ plan: 'PRO' })

    await input.click(screen.getByRole('button', { name: 'Suspend' }))
    expect(calls.some((c) => c.path.endsWith('/suspend'))).toBe(false)
    await input.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Suspend' }))
    expect(await screen.findByText(/Suspended since/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Lift suspension' })).toBeTruthy()
  })

  it('deletes only once the email is typed, then goes back to the list', async () => {
    const calls = stubApi({
      'POST /api/auth/refresh': () => ok(admin),
      'GET /api/admin/users/7': () => ok(detail(person(7, 'sam@example.com'))),
      'DELETE /api/admin/users/7': () => new Response(null, { status: 204 }),
      'GET /api/admin/users': () => ok(page([])),
    })
    renderApp('/admin/users/7')
    const input = userEvent.setup()

    await input.click(await screen.findByRole('button', { name: 'Delete' }))
    const dialog = await screen.findByRole('alertdialog')
    const confirm = within(dialog).getByRole('button', { name: 'Delete for good' }) as HTMLButtonElement
    expect(confirm.disabled).toBe(true)
    await input.type(within(dialog).getByLabelText('Type sam@example.com to confirm'), 'sam@example.com')
    await input.click(confirm)

    expect(await screen.findByText('No users yet.')).toBeTruthy()
    expect(calls.some((c) => c.method === 'DELETE' && c.path === '/api/admin/users/7')).toBe(true)
  })

  it('offers no actions on another admin', async () => {
    stubApi({ 'POST /api/auth/refresh': () => ok(admin), 'GET /api/admin/users/8': () => ok(detail(person(8, 'boss@example.com', { role: 'ADMIN' }))) })
    renderApp('/admin/users/8')
    expect(await screen.findByText(/Admins can’t be changed from here/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull()
  })
})

describe('the admin app is its own', () => {
  it('takes an admin from the user app to /admin, with no user-only calls', async () => {
    const calls = stubApi({ 'POST /api/auth/refresh': () => ok(admin), 'GET /api/admin/stats': () => ok(stats) })
    renderApp('/today')

    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeTruthy()
    expect(calls.map((c) => c.path).filter((path) => !path.startsWith('/api/admin') && !path.startsWith('/api/auth'))).toEqual([])
    expect(screen.queryByRole('button', { name: 'Notifications' })).toBeNull()
    expect(screen.queryByText(/Confirm your email/)).toBeNull()
  })

  it('has an account menu with only change password and sign out', async () => {
    stubApi({ 'POST /api/auth/refresh': () => ok(admin), 'GET /api/admin/stats': () => ok(stats) })
    renderApp('/admin')

    await userEvent.click(await screen.findByRole('button', { name: /^Account,/ }))
    expect(screen.getByRole('link', { name: 'Change password' }).getAttribute('href')).toBe('/admin/password')
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Settings' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Admin' })).toBeNull()
  })
})
