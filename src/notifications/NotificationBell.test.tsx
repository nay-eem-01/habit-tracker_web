// @vitest-environment jsdom
import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Notification } from '../api/notifications'
import { fail, ok, page, renderApp, resetApp, session, stubApi } from '../test/helpers'

const reminder = (over: Partial<Notification> & Pick<Notification, 'id'>): Notification => ({
  type: 'HABIT_REMINDER',
  title: 'Time for Read',
  body: 'Your reminder for Read.',
  habitId: 1,
  readAt: null,
  createdAt: new Date().toISOString(),
  ...over,
})

const signedIn = {
  'POST /api/auth/refresh': () => ok(session),
  'GET /api/habits': () => ok(page([])),
}

beforeEach(resetApp)
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('notification bell', () => {
  it('shows the unread count on the bell', async () => {
    stubApi({ ...signedIn, 'GET /api/notifications/unread-count': () => ok({ unread: 3 }) })
    renderApp('/habits')

    expect(await screen.findByRole('button', { name: 'Notifications, 3 unread' })).toBeTruthy()
  })

  it('shows a plain bell when everything is read', async () => {
    stubApi({ ...signedIn, 'GET /api/notifications/unread-count': () => ok({ unread: 0 }) })
    renderApp('/habits')

    expect(await screen.findByRole('button', { name: 'Notifications' })).toBeTruthy()
  })

  it('lists notifications when opened, unread marked', async () => {
    stubApi({
      ...signedIn,
      'GET /api/notifications/unread-count': () => ok({ unread: 1 }),
      'GET /api/notifications': () =>
        ok(
          page([
            reminder({ id: 1, title: 'Time for Read' }),
            reminder({ id: 2, title: 'Time for Gym', habitId: 2, readAt: new Date().toISOString() }),
          ]),
        ),
    })
    renderApp('/habits')
    await userEvent.click(await screen.findByRole('button', { name: 'Notifications, 1 unread' }))

    const panel = await screen.findByRole('region', { name: 'Notifications' })
    expect(await within(panel).findByText('Time for Read')).toBeTruthy()
    expect(within(panel).getByText('Time for Gym')).toBeTruthy()
    expect(within(panel).getByRole('link', { name: /Time for Read/ }).getAttribute('data-unread')).toBe('true')
    expect(within(panel).getByRole('link', { name: /Time for Gym/ }).getAttribute('data-unread')).toBe('false')
  })

  it('marks one read when opened and goes to its habit', async () => {
    let unread = 1
    const calls = stubApi({
      ...signedIn,
      'GET /api/notifications/unread-count': () => ok({ unread }),
      'GET /api/notifications': () => ok(page([reminder({ id: 7 })])),
      'POST /api/notifications/7/read': () => {
        unread = 0
        return ok(reminder({ id: 7, readAt: new Date().toISOString() }))
      },
      'GET /api/habits/1': () => fail(404, 'HABIT_NOT_FOUND'),
    })
    renderApp('/habits')
    await userEvent.click(await screen.findByRole('button', { name: 'Notifications, 1 unread' }))
    await userEvent.click(await screen.findByRole('link', { name: /Time for Read/ }))

    expect(await screen.findByRole('button', { name: 'Notifications' })).toBeTruthy()
    expect(calls.some((c) => c.method === 'POST' && c.path === '/api/notifications/7/read')).toBe(true)
    expect(await screen.findByRole('link', { name: 'Back to habits' })).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Notifications' })).toBeNull()
  })

  it('marks everything read', async () => {
    let unread = 2
    const calls = stubApi({
      ...signedIn,
      'GET /api/notifications/unread-count': () => ok({ unread }),
      'GET /api/notifications': () => ok(page([reminder({ id: 1 }), reminder({ id: 2 })])),
      'POST /api/notifications/read-all': () => {
        unread = 0
        return ok({ marked: 2 })
      },
    })
    renderApp('/habits')
    await userEvent.click(await screen.findByRole('button', { name: 'Notifications, 2 unread' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Mark all read' }))

    expect(await screen.findByRole('button', { name: 'Notifications' })).toBeTruthy()
    expect(calls.some((c) => c.path === '/api/notifications/read-all')).toBe(true)
  })

  it('says so when there are no reminders', async () => {
    stubApi({
      ...signedIn,
      'GET /api/notifications/unread-count': () => ok({ unread: 0 }),
      'GET /api/notifications': () => ok(page([])),
    })
    renderApp('/habits')
    await userEvent.click(await screen.findByRole('button', { name: 'Notifications' }))

    expect(await screen.findByText('No reminders yet.')).toBeTruthy()
  })

  it('closes on Escape', async () => {
    stubApi({
      ...signedIn,
      'GET /api/notifications/unread-count': () => ok({ unread: 0 }),
      'GET /api/notifications': () => ok(page([])),
    })
    renderApp('/habits')
    await userEvent.click(await screen.findByRole('button', { name: 'Notifications' }))
    await screen.findByRole('region', { name: 'Notifications' })
    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('region', { name: 'Notifications' })).toBeNull()
  })

  it('shows an error with a retry when the list fails', async () => {
    stubApi({
      ...signedIn,
      'GET /api/notifications/unread-count': () => ok({ unread: 0 }),
      'GET /api/notifications': () => fail(500, 'INTERNAL_ERROR'),
    })
    renderApp('/habits')
    await userEvent.click(await screen.findByRole('button', { name: 'Notifications' }))

    expect(await screen.findByText('Couldn’t load your notifications.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
  })
})
