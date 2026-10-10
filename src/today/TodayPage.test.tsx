// @vitest-environment jsdom
import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { HabitLog } from '../api/checkins'
import type { Habit } from '../api/habits'
import { fail, ok, page, renderApp, resetApp, session, stubApi } from '../test/helpers'

// Friday 2 October 2026, 10:00 in Dhaka (the test user's timezone)
const NOW = new Date('2026-10-02T04:00:00Z')

const habit = (over: Partial<Habit> & Pick<Habit, 'id' | 'name'>): Habit => ({
  frequencyType: 'DAILY',
  frequencyConfig: null,
  targetCount: 1,
  archived: false,
  createdAt: '2026-09-01T00:00:00Z',
  ...over,
})
const read = habit({ id: 1, name: 'Read' })
const water = habit({ id: 2, name: 'Drink water', targetCount: 8 })
const gym = habit({ id: 3, name: 'Gym', frequencyType: 'SPECIFIC_DAYS', frequencyConfig: { days: ['MONDAY'] } })
const run = habit({ id: 4, name: 'Run', frequencyType: 'X_TIMES_PER_WEEK', frequencyConfig: { timesPerWeek: 3 } })

const log = (date: string, completedCount: number, done: boolean): HabitLog => ({ id: 1, date, completedCount, done })
const streak = (current: number, unit: 'DAYS' | 'WEEKS' = 'DAYS') => ok({ current, longest: current, unit })

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

/**
 * The usual day: Read open, water 3 of 8, Gym not scheduled on a Friday, Run 2 of 3 this week.
 * A check-in changes what the logs endpoint returns afterwards, like the real server.
 */
function usualDay(overrides: Record<string, (call: never) => Response> = {}) {
  const logs: Record<number, HabitLog[]> = {
    1: [],
    2: [log('2026-10-02', 3, false)],
    3: [],
    4: [log('2026-09-30', 1, true), log('2026-09-28', 1, true)],
  }
  const targets: Record<number, number> = { 1: 1, 2: 8, 3: 1, 4: 1 }
  const handlers: Record<string, (call: never) => Response> = {
    ...signedIn,
    'GET /api/habits': () => ok(page([read, water, gym, run])),
    'GET /api/habits/1/streak': () => streak(12),
    'GET /api/habits/2/streak': () => streak(0),
    'GET /api/habits/3/streak': () => streak(4),
    'GET /api/habits/4/streak': () => streak(2, 'WEEKS'),
  }
  for (const id of [1, 2, 3, 4]) {
    handlers[`GET /api/habits/${id}/logs`] = () => ok(page(logs[id]))
    handlers[`POST /api/habits/${id}/checkin`] = ((call: { body: { completedCount: number } }) => {
      const count = call.body.completedCount
      const saved = log('2026-10-02', count, count >= targets[id])
      logs[id] = [saved, ...logs[id].filter((entry) => entry.date !== '2026-10-02')]
      return ok(saved)
    }) as (call: never) => Response
  }
  return stubApi({ ...handlers, ...overrides } as Parameters<typeof stubApi>[0])
}

const posts = (calls: { method: string; body: unknown }[]) => calls.filter((c) => c.method === 'POST' && c.body).map((c) => c.body)

describe('the Today page', () => {
  it("shows the user's date, what is due, and leaves out habits not scheduled today", async () => {
    usualDay()
    renderApp('/today')

    expect(await screen.findByText('Friday 2 October')).toBeTruthy()
    const todo = (await screen.findByRole('heading', { name: 'To do' })).closest('section')!
    expect(within(todo).getByRole('heading', { name: 'Read' })).toBeTruthy()
    expect(within(todo).getByText('3 of 8 today')).toBeTruthy()
    expect(within(todo).getByText('2 of 3 this week')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Gym' })).toBeNull()
    expect(screen.getByText('0 of 3 done')).toBeTruthy()
  })

  it('shows each streak in its own unit', async () => {
    usualDay()
    renderApp('/today')

    expect(await screen.findByLabelText('12 day streak')).toBeTruthy()
    expect(await screen.findByLabelText('2 week streak')).toBeTruthy()
    expect(await screen.findByText('No streak yet')).toBeTruthy()
  })

  it('reads this week’s logs, from Monday', async () => {
    const calls = usualDay()
    renderApp('/today')
    await screen.findByRole('heading', { name: 'To do' })

    const request = calls.find((c) => c.path === '/api/habits/1/logs')!
    expect(request.params.get('from')).toBe('2026-09-28')
  })

  it('checks a habit in with one tap and moves it to Done at once', async () => {
    const calls = usualDay()
    renderApp('/today')

    await userEvent.click(await screen.findByRole('button', { name: 'Mark Read done' }))

    const done = (await screen.findByRole('heading', { name: 'Done' })).closest('section')!
    expect(within(done).getByRole('heading', { name: 'Read' })).toBeTruthy()
    expect(screen.getByText('1 of 3 done')).toBeTruthy()
    await vi.waitFor(() => expect(posts(calls)).toEqual([{ completedCount: 1 }]))
  })

  it('undoes a finished habit by setting its count to 0', async () => {
    const calls = usualDay()
    renderApp('/today')
    const input = userEvent.setup()

    await input.click(await screen.findByRole('button', { name: 'Mark Read done' }))
    await input.click(await screen.findByRole('button', { name: 'Undo Read' }))

    await vi.waitFor(() => expect(posts(calls)).toEqual([{ completedCount: 1 }, { completedCount: 0 }]))
    const todo = (await screen.findByRole('heading', { name: 'To do' })).closest('section')!
    expect(within(todo).getByRole('heading', { name: 'Read' })).toBeTruthy()
  })

  it('adds one at a time for a habit with a daily target, and takes one away', async () => {
    const calls = usualDay()
    renderApp('/today')
    const input = userEvent.setup()

    await input.click(await screen.findByRole('button', { name: 'Add one for Drink water' }))
    expect(await screen.findByText('4 of 8 today')).toBeTruthy()
    await input.click(screen.getByRole('button', { name: 'Take one away from Drink water' }))

    await vi.waitFor(() => expect(posts(calls)).toEqual([{ completedCount: 4 }, { completedCount: 3 }]))
  })

  it('puts the tap back and says so when the check-in cannot be saved', async () => {
    usualDay({ 'POST /api/habits/1/checkin': () => fail(409, 'HABIT_ARCHIVED') })
    renderApp('/today')

    await userEvent.click(await screen.findByRole('button', { name: 'Mark Read done' }))

    expect((await screen.findByRole('alert')).textContent).toContain('This habit is archived')
    const todo = (await screen.findByRole('heading', { name: 'To do' })).closest('section')!
    expect(within(todo).getByRole('heading', { name: 'Read' })).toBeTruthy()
  })

  it('celebrates plainly when everything is done', async () => {
    stubApi({
      ...signedIn,
      'GET /api/habits': () => ok(page([read])),
      'GET /api/habits/1/logs': () => ok(page([log('2026-10-02', 1, true)])),
      'GET /api/habits/1/streak': () => streak(1),
    })
    renderApp('/today')

    expect(await screen.findByRole('heading', { name: 'All done for today' })).toBeTruthy()
    expect(screen.getByText('1 of 1 done')).toBeTruthy()
  })
})

describe('rest days and quit habits', () => {
  const level = { 'GET /api/me/level': () => ok({ xp: 150, level: 2, tier: 'BRONZE', xpForNextLevel: 300, progressToNextLevel: 0.2, spentXp: 100, xpBalance: 50 }) }

  it('rests a habit for free, then shows it resting in Done', async () => {
    let logs: HabitLog[] = []
    const calls = stubApi({
      ...signedIn,
      ...level,
      'GET /api/habits': () => ok(page([read])),
      'GET /api/habits/1/streak': () => streak(3),
      'GET /api/habits/1/logs': () => ok(page(logs)),
      'POST /api/habits/1/rest': () => {
        logs = [{ ...log('2026-10-02', 0, false), rest: true }]
        return ok(logs[0])
      },
    })
    renderApp('/today')

    await userEvent.click(await screen.findByRole('button', { name: 'Rest Read today' }))
    expect(calls.some((c) => c.method === 'POST' && c.path === '/api/habits/1/rest')).toBe(true)
    expect(await screen.findByText('Resting today. The streak holds.')).toBeTruthy()
    expect(screen.getByText('1 of 1 done')).toBeTruthy()
  })

  it('asks before a rest that costs XP, and says when there isn’t enough', async () => {
    const rests = [{ ...log('2026-09-28', 0, false), rest: true }, { ...log('2026-09-29', 0, false), rest: true }]
    stubApi({
      ...signedIn,
      ...level,
      'GET /api/habits': () => ok(page([read])),
      'GET /api/habits/1/streak': () => streak(3),
      'GET /api/habits/1/logs': () => ok(page(rests)),
    })
    renderApp('/today')

    await userEvent.click(await screen.findByRole('button', { name: 'Rest Read today' }))
    expect(await screen.findByText('A rest costs 200 XP; you have 50.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Yes, rest' })).toBeNull()
  })

  it('keeps quit habits out of the count; “I slipped” checks in once', async () => {
    const smoking = habit({ id: 5, name: 'Smoking', kind: 'QUIT' })
    const calls = stubApi({
      ...signedIn,
      'GET /api/habits': () => ok(page([read, smoking])),
      'GET /api/habits/1/streak': () => streak(0),
      'GET /api/habits/5/streak': () => streak(9),
      'GET /api/habits/1/logs': () => ok(page([])),
      'GET /api/habits/5/logs': () => ok(page([])),
      'POST /api/habits/5/checkin': () => ok(log('2026-10-02', 1, true)),
    })
    renderApp('/today')

    expect(await screen.findByText('0 of 1 done')).toBeTruthy()
    const clean = (await screen.findByRole('heading', { name: 'Staying clean' })).closest('section')!
    expect(within(clean).getByText('Clean today')).toBeTruthy()
    await userEvent.click(within(clean).getByRole('button', { name: 'I slipped on Smoking' }))
    expect(posts(calls)).toContainEqual({ completedCount: 1 })
  })
})

describe('when there is nothing to check in', () => {
  it('invites the first habit when there are none', async () => {
    stubApi({ ...signedIn, 'GET /api/habits': () => ok(page([])) })
    renderApp('/today')
    expect(await screen.findByRole('link', { name: /Add the first one/ })).toBeTruthy()
  })

  it('points to all habits when none is scheduled today', async () => {
    stubApi({ ...signedIn, 'GET /api/habits': () => ok(page([gym])), 'GET /api/habits/3/logs': () => ok(page([])) })
    renderApp('/today')
    expect(await screen.findByText(/Nothing is scheduled for today/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'See all habits' })).toBeTruthy()
  })

  it('offers a retry when the habits cannot be loaded', async () => {
    stubApi({ ...signedIn, 'GET /api/habits': () => fail(500, 'INTERNAL_ERROR') })
    renderApp('/today')
    expect((await screen.findByRole('alert')).textContent).toContain('went wrong on our side')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
  })
})
