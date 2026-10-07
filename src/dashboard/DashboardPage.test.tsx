// @vitest-environment jsdom
import { cleanup, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Dashboard, Patterns, Period } from '../api/dashboard'
import { fail, ok, renderApp, resetApp, session, stubApi } from '../test/helpers'

// Friday 2 October 2026, 10:00 in Dhaka (the test user's timezone)
const NOW = new Date('2026-10-02T04:00:00Z')

const period = (days: number, rate: number | null, change: number | null, done = 0, expected = 0): Period => ({
  days,
  done,
  expected,
  rate,
  previousRate: null,
  change,
})
const todayHabit = (habitId: number, name: string, done: boolean, due = true) => ({
  habitId,
  name,
  category: null,
  frequencyType: 'DAILY' as const,
  targetCount: 1,
  completedCount: done ? 1 : 0,
  done,
  due,
  streak: 4,
  streakUnit: 'DAYS' as const,
})

const dashboard: Dashboard = {
  today: {
    date: '2026-10-02',
    due: 3,
    done: 1,
    habits: [todayHabit(1, 'Read', true), todayHabit(2, 'Run', false), todayHabit(3, 'Stretch', false)],
  },
  completion: {
    last7Days: period(7, 0.86, 0.12),
    last30Days: period(30, 0.7, -0.05, 63, 90),
    last90Days: period(90, 0.65, null),
    habits: [],
  },
  atRisk: [
    { habitId: 2, name: 'Run', streak: 12, streakUnit: 'DAYS', needed: 1 },
    { habitId: 4, name: 'Gym', streak: 3, streakUnit: 'WEEKS', needed: 2 },
  ],
  best: [{ habitId: 1, name: 'Read', rate: 0.97, change: 0.1 }],
  slipping: [{ habitId: 3, name: 'Stretch', rate: 0.4, change: -0.3 }],
  goals: [{ goalId: 1, title: 'Run a half marathon', targetDate: '2026-12-31', percent: 42 }],
  level: { xp: 420, level: 3, tier: 'BRONZE', xpForNextLevel: 600, progressToNextLevel: 0.4 },
}

const patterns: Patterns = {
  heatmap: [
    { date: '2026-09-30', done: 1, expected: 2, ratio: 0.5 },
    { date: '2026-10-01', done: 2, expected: 2, ratio: 1 },
    { date: '2026-10-02', done: 1, expected: 3, ratio: 0.33 },
  ],
  weekdays: (['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const).map((day, i) => ({
    day,
    done: 10,
    expected: 12,
    rate: [0.8, 0.95, 0.7, 0.75, 0.6, 0.5, 0.4][i],
  })),
  weakestDay: 'SUNDAY',
  strongestDay: 'TUESDAY',
  hours: Array.from({ length: 24 }, (_, hour) => (hour === 7 ? 30 : hour === 21 ? 12 : 0)),
  peakHour: 7,
}

const signedIn = {
  'POST /api/auth/refresh': () => ok(session),
  'GET /api/me/level': () => ok(dashboard.level),
}

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
  it("shows today's progress and the streaks that end tonight", async () => {
    stubApi({ ...signedIn, 'GET /api/dashboard': () => ok(dashboard), 'GET /api/dashboard/patterns': () => ok(patterns) })
    renderApp('/')

    expect(await screen.findByText('1 of 3 done')).toBeTruthy()
    const risk = screen.getByText('These streaks end tonight unless you check in').parentElement!
    expect(within(risk).getByText('12 days')).toBeTruthy()
    expect(within(risk).getByText('3 weeks · 2 check-ins to go')).toBeTruthy()
  })

  it('shows completion over 7, 30 and 90 days with the change against the stretch before', async () => {
    stubApi({ ...signedIn, 'GET /api/dashboard': () => ok(dashboard), 'GET /api/dashboard/patterns': () => ok(patterns) })
    renderApp('/')

    const card = (await screen.findByRole('heading', { name: 'Completion' })).closest('section')!
    expect(within(card).getByText('86%')).toBeTruthy()
    expect(within(card).getByText('+12 pts')).toBeTruthy()
    expect(within(card).getByText('−5 pts')).toBeTruthy()
    expect(within(card).getByText('65%')).toBeTruthy()
    expect(within(card).getByText(/63 of 90 due days done/)).toBeTruthy()
  })

  it('names the habits going well and slipping, the active goals and the level', async () => {
    stubApi({ ...signedIn, 'GET /api/dashboard': () => ok(dashboard), 'GET /api/dashboard/patterns': () => ok(patterns) })
    renderApp('/')

    const month = (await screen.findByRole('heading', { name: 'Last 30 days' })).closest('section')!
    expect(within(month).getByRole('link', { name: 'Read' }).getAttribute('href')).toBe('/habits/1')
    expect(within(month).getByText('−30 pts')).toBeTruthy()

    const goals = screen.getByRole('heading', { name: 'Goals' }).closest('section')!
    expect(within(goals).getByText('42%')).toBeTruthy()
    expect(within(goals).getByText('By 31 Dec 2026')).toBeTruthy()

    expect(screen.getByRole('heading', { name: 'Level 3 · Bronze' })).toBeTruthy()
  })

  it('shows the year, the strongest and weakest weekday, and the peak hour', async () => {
    stubApi({ ...signedIn, 'GET /api/dashboard': () => ok(dashboard), 'GET /api/dashboard/patterns': () => ok(patterns) })
    renderApp('/')

    expect(await screen.findByText(/Everything done on 1 of 3 days/)).toBeTruthy()
    const weekdays = screen.getByRole('heading', { name: 'By weekday' }).closest('section')!
    expect(weekdays.textContent).toContain('Strongest on Tuesdays, weakest on Sundays')
    const hours = screen.getByRole('heading', { name: 'Time of day' }).closest('section')!
    expect(hours.textContent).toContain('Most check-ins around 7 am, out of 42')
  })

  it('says the patterns need time when there is no data yet', async () => {
    stubApi({
      ...signedIn,
      'GET /api/dashboard': () => ok(dashboard),
      'GET /api/dashboard/patterns': () =>
        ok({ ...patterns, weakestDay: null, strongestDay: null, peakHour: null, hours: Array(24).fill(0) }),
    })
    renderApp('/')

    expect(await screen.findByText(/Not enough days yet/)).toBeTruthy()
    expect(screen.getByText('No check-ins in the last 90 days yet.')).toBeTruthy()
  })

  it("doesn't call a 0% habit going well, or name a strongest day when every day is the same", async () => {
    stubApi({
      ...signedIn,
      'GET /api/dashboard': () => ok({ ...dashboard, best: [{ habitId: 3, name: 'Stretch', rate: 0, change: null }] }),
      'GET /api/dashboard/patterns': () =>
        ok({ ...patterns, weekdays: patterns.weekdays.map((day) => ({ ...day, rate: 0 })), strongestDay: 'MONDAY', weakestDay: 'MONDAY' }),
    })
    renderApp('/')

    expect(await screen.findByText('Nothing finished yet this month.')).toBeTruthy()
    expect(screen.getByText(/Not enough days yet/)).toBeTruthy()
  })

  it('invites a first habit when there are none', async () => {
    stubApi({
      ...signedIn,
      'GET /api/dashboard': () => ok({ ...dashboard, today: { date: '2026-10-02', due: 0, done: 0, habits: [] } }),
      'GET /api/dashboard/patterns': () => ok(patterns),
    })
    renderApp('/')

    expect(await screen.findByText('Nothing to show yet')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Add a habit' })).toBeTruthy()
  })

  it('says so, with a retry, when the dashboard fails to load', async () => {
    stubApi({ ...signedIn, 'GET /api/dashboard': () => fail(500, 'INTERNAL_ERROR'), 'GET /api/dashboard/patterns': () => ok(patterns) })
    renderApp('/')

    expect((await screen.findByRole('alert')).textContent).toContain('Something went wrong')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
  })
})
