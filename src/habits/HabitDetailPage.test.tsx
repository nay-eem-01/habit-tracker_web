// @vitest-environment jsdom
import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { HabitLog } from '../api/checkins'
import type { Habit } from '../api/habits'
import { fail, ok, page, renderApp, resetApp, session, stubApi } from '../test/helpers'

// Friday 2 October 2026, 10:00 in Dhaka
const NOW = new Date('2026-10-02T04:00:00Z')

const read: Habit = {
  id: 1,
  name: 'Read 20 pages',
  category: 'Learning',
  frequencyType: 'DAILY',
  frequencyConfig: null,
  targetCount: 1,
  reminderTime: '07:30',
  archived: false,
  createdAt: '2026-09-01T00:00:00Z',
}
const water: Habit = { ...read, id: 2, name: 'Drink water', category: null, targetCount: 8, reminderTime: null }

const log = (date: string, completedCount: number, done: boolean, note?: string): HabitLog => ({
  id: 1,
  date,
  completedCount,
  done,
  note,
})
const window = (days: number, done: number, expected: number, rate: number | null) => ({ days, done, expected, rate })

const signedIn = { 'POST /api/auth/refresh': () => ok(session) }
const progress = (id: number) => ({
  [`GET /api/habits/${id}/streak`]: () => ok({ current: 12, longest: 30, unit: 'DAYS' }),
  [`GET /api/habits/${id}/stats`]: () =>
    ok({ last7Days: window(7, 6, 7, 0.86), last30Days: window(30, 20, 30, 0.67) }),
})

beforeEach(() => {
  resetApp()
  vi.useFakeTimers({ toFake: ['Date'], now: NOW })
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('habit detail', () => {
  it('shows the habit, its streaks and its 7 and 30 day completion', async () => {
    stubApi({
      ...signedIn,
      'GET /api/habits/1': () => ok(read),
      ...progress(1),
      'GET /api/habits/1/logs': () => ok(page([])),
    })
    renderApp('/habits/1')

    expect(await screen.findByRole('heading', { name: 'Read 20 pages' })).toBeTruthy()
    expect(screen.getByText('Learning')).toBeTruthy()
    expect(screen.getByText('Reminder at 07:30')).toBeTruthy()
    expect(await screen.findByText('12 days')).toBeTruthy()
    expect(screen.getByText('30 days')).toBeTruthy()
    expect(screen.getByText('86%')).toBeTruthy()
    expect(screen.getByText('6 of 7 done')).toBeTruthy()
    expect(screen.getByText('67%')).toBeTruthy()
    expect(screen.getByText('20 of 30 done')).toBeTruthy()
  })

  it('says so when nothing was due yet, instead of showing 0%', async () => {
    stubApi({
      ...signedIn,
      'GET /api/habits/1': () => ok(read),
      'GET /api/habits/1/streak': () => ok({ current: 0, longest: 0, unit: 'DAYS' }),
      'GET /api/habits/1/stats': () => ok({ last7Days: window(7, 0, 0, null), last30Days: window(30, 0, 0, null) }),
      'GET /api/habits/1/logs': () => ok(page([])),
    })
    renderApp('/habits/1')

    expect(await screen.findAllByText('Nothing was due yet')).toHaveLength(2)
    expect(screen.getAllByText('–')).toHaveLength(2)
  })

  it('lists check-ins newest first, as counts for a habit with a daily target', async () => {
    const calls = stubApi({
      ...signedIn,
      'GET /api/habits/2': () => ok(water),
      ...progress(2),
      'GET /api/habits/2/logs': () => ok(page([log('2026-10-02', 3, false), log('2026-10-01', 8, true, 'easy day')])),
    })
    renderApp('/habits/2')

    const history = (await screen.findByRole('heading', { name: 'History' })).closest('section')!
    expect(await within(history).findByText('Fri 2 Oct')).toBeTruthy()
    expect(within(history).getByText('3 of 8')).toBeTruthy()
    expect(within(history).getByText('8 of 8')).toBeTruthy()
    expect(within(history).getByText('easy day')).toBeTruthy()
    expect(calls.find((c) => c.path === '/api/habits/2/logs')!.params.get('from')).toBe('2026-07-04')
  })

  it('pages through a long history', async () => {
    const calls = stubApi({
      ...signedIn,
      'GET /api/habits/1': () => ok(read),
      ...progress(1),
      'GET /api/habits/1/logs': (call) =>
        call.params.get('page') === '1'
          ? ok(page([log('2026-09-20', 1, true)], 2, 1))
          : ok(page([log('2026-10-02', 1, true)], 2, 0)),
    })
    renderApp('/habits/1')

    expect(await screen.findByText('Page 1 of 2')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(await screen.findByText(/^Sun 20 Sept?$/)).toBeTruthy()
    expect(screen.getByText('Page 2 of 2')).toBeTruthy()
    expect(calls.filter((c) => c.path === '/api/habits/1/logs').map((c) => c.params.get('page'))).toEqual(['0', '1'])
  })

  it('says when the habit is not there or not yours', async () => {
    stubApi({ ...signedIn, 'GET /api/habits/9': () => fail(404, 'HABIT_NOT_FOUND') })
    renderApp('/habits/9')

    expect((await screen.findByRole('alert')).textContent).toContain("doesn't exist")
    expect(screen.getByRole('link', { name: 'Back to habits' })).toBeTruthy()
  })

  it('opens from the habit list', async () => {
    stubApi({
      ...signedIn,
      'GET /api/habits': () => ok(page([read])),
      'GET /api/habits/1': () => ok(read),
      ...progress(1),
      'GET /api/habits/1/logs': () => ok(page([])),
    })
    renderApp('/habits')

    await userEvent.click(await screen.findByRole('link', { name: 'Read 20 pages' }))

    expect(await screen.findByText('Current streak')).toBeTruthy()
  })
})
