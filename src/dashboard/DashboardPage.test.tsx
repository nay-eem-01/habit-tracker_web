// @vitest-environment jsdom
import { cleanup, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { HabitLog } from '../api/checkins'
import type { Habit } from '../api/habits'
import { fail, ok, page, renderApp, resetApp, session, stubApi } from '../test/helpers'

// Friday 2 October 2026, 10:00 in Dhaka (the test user's timezone)
const NOW = new Date('2026-10-02T04:00:00Z')

const habit = (id: number, name: string, over: Partial<Habit> = {}): Habit => ({
  id,
  name,
  frequencyType: 'DAILY',
  frequencyConfig: null,
  targetCount: 1,
  archived: false,
  createdAt: '2026-09-01T00:00:00Z',
  ...over,
})
const log = (date: string, done = true): HabitLog => ({ id: 1, date, completedCount: done ? 1 : 0, done })
const window = (done: number, expected: number) => ({ days: 7, done, expected, rate: expected ? done / expected : null })

const signedIn = { 'POST /api/auth/refresh': () => ok(session) }

beforeEach(() => {
  resetApp()
  vi.useFakeTimers({ toFake: ['Date'], now: NOW })
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('the dashboard', () => {
  it('shows today, completion across habits, the longest streaks and the activity grid', async () => {
    stubApi({
      ...signedIn,
      'GET /api/habits': () => ok(page([habit(1, 'Read'), habit(2, 'Run')])),
      'GET /api/habits/1/logs': () => ok(page([log('2026-10-02'), log('2026-10-01')])),
      'GET /api/habits/2/logs': () => ok(page([log('2026-10-01')])),
      'GET /api/habits/1/streak': () => ok({ current: 12, longest: 20, unit: 'DAYS' }),
      'GET /api/habits/2/streak': () => ok({ current: 0, longest: 3, unit: 'DAYS' }),
      'GET /api/habits/1/stats': () => ok({ last7Days: window(7, 7), last30Days: window(25, 30) }),
      'GET /api/habits/2/stats': () => ok({ last7Days: window(1, 7), last30Days: window(5, 30) }),
    } as Parameters<typeof stubApi>[0])
    renderApp('/')

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeTruthy()
    expect(await screen.findByText('1 of 2 done')).toBeTruthy()
    expect(screen.getByText('8 of 14 done')).toBeTruthy()
    expect(screen.getByText('57%')).toBeTruthy()
    expect(screen.getByText('30 of 60 done')).toBeTruthy()

    const streaks = screen.getByRole('heading', { name: 'Longest streaks' }).closest('section')!
    expect(within(streaks).getByText('Read')).toBeTruthy()
    expect(within(streaks).getByText(/12 days/)).toBeTruthy()
    expect(within(streaks).queryByText('Run')).toBeNull()

    expect(screen.getByRole('heading', { name: 'Last 12 weeks' })).toBeTruthy()
  })

  it('invites a first habit when there are none', async () => {
    stubApi({ ...signedIn, 'GET /api/habits': () => ok(page([])) } as Parameters<typeof stubApi>[0])
    renderApp('/')
    expect(await screen.findByText('Nothing to show yet')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Add a habit' })).toBeTruthy()
  })

  it('says so, with a retry, when something fails to load', async () => {
    stubApi({ ...signedIn, 'GET /api/habits': () => fail(500, 'INTERNAL_ERROR') } as Parameters<typeof stubApi>[0])
    renderApp('/')
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
  })
})
