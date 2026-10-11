// @vitest-environment jsdom
import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Goal, GoalProgress, HabitGoalProgress } from '../api/goals'
import type { Habit } from '../api/habits'
import { choose, fail, ok, page, renderApp, resetApp, session, stubApi } from '../test/helpers'

// Saturday 3 October 2026, 10:00 in Dhaka
const NOW = new Date('2026-10-03T04:00:00Z')

const marathon: Goal = {
  id: 1,
  title: 'Run a half marathon',
  description: 'Under two hours',
  targetDate: '2026-12-31',
  status: 'ACTIVE',
  achievedAt: null,
  createdAt: '2026-09-01T00:00:00Z',
}

const habit = (id: number, name: string, goalId: number | null = null): Habit => ({
  id,
  name,
  category: null,
  frequencyType: 'DAILY',
  frequencyConfig: null,
  targetCount: 1,
  reminderTime: null,
  archived: false,
  goalId,
  goalTargetDays: goalId ? 60 : null,
  createdAt: '2026-09-01T00:00:00Z',
})
const run = habit(11, 'Morning run', 1)
const stretch = habit(12, 'Stretch')
const read = habit(13, 'Read 20 pages', 2)

const linked = (habitId: number, name: string, doneDays: number, goalTargetDays: number, archived = false): HabitGoalProgress => ({
  habitId,
  name,
  archived,
  linkedOn: '2026-09-01',
  doneDays,
  goalTargetDays,
  percent: Math.min(Math.round((doneDays / goalTargetDays) * 100), 100),
})
const progress = (percent: number, habits: HabitGoalProgress[]): GoalProgress => ({ goalId: 1, percent, habits })

const signedIn = {
  'POST /api/auth/refresh': () => ok(session),
  // the goal page also lists the goal's notes and links (tested in the resources tests)
  'GET /api/goals/1/resources': () => ok(page([])),
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

describe('goal detail', () => {
  it('shows the goal, its overall progress and each linked habit against its target', async () => {
    stubApi({
      ...signedIn,
      'GET /api/goals/1': () => ok(marathon),
      'GET /api/goals/1/progress': () =>
        ok(progress(58, [linked(11, 'Morning run', 30, 60), linked(14, 'Old plan', 5, 10, true), linked(15, 'Swim', 40, 30)])),
      'GET /api/habits': () => ok(page([run])),
    })
    renderApp('/goals/1')

    expect(await screen.findByRole('heading', { name: 'Run a half marathon' })).toBeTruthy()
    expect(screen.getByText('Under two hours')).toBeTruthy()
    expect(screen.getByText('By 31 Dec 2026 · 89 days left')).toBeTruthy()
    expect(await screen.findByText('58%')).toBeTruthy()
    expect(screen.getByText(/The average of 2 linked habits/)).toBeTruthy()

    const rows = within(screen.getByRole('list', { name: 'Linked habits' })).getAllByRole('listitem')
    expect(rows[0].textContent).toContain('30 of 60 done days · 50%')
    expect(rows[1].textContent).toContain("Archived, so it no longer counts toward the goal")
    expect(rows[2].textContent).toContain('40 of 30 done days · 100%')
    expect(within(rows[0]).getByRole('link', { name: 'Morning run' }).getAttribute('href')).toBe('/habits/11')
  })

  it('invites linking a habit when none is linked', async () => {
    stubApi({
      ...signedIn,
      'GET /api/goals/1': () => ok(marathon),
      'GET /api/goals/1/progress': () => ok(progress(0, [])),
      'GET /api/habits': () => ok(page([stretch])),
    })
    renderApp('/goals/1')

    expect(await screen.findByText(/Link the habits that get you there/)).toBeTruthy()
  })

  it('links a habit with its target, then shows the new progress', async () => {
    let linkedYet = false
    const calls = stubApi({
      ...signedIn,
      'GET /api/goals/1': () => ok(marathon),
      'GET /api/goals/1/progress': () => ok(linkedYet ? progress(0, [linked(12, 'Stretch', 0, 30)]) : progress(0, [])),
      'GET /api/habits': () => ok(page([run, stretch])),
      'PUT /api/habits/12/goal': () => {
        linkedYet = true
        return ok({ ...stretch, goalId: 1, goalTargetDays: 30 })
      },
    })
    renderApp('/goals/1')
    const input = userEvent.setup()

    await input.click(await screen.findByLabelText('Habit'))
    // the habit already on this goal isn't offered again
    expect(screen.queryByRole('option', { name: 'Morning run' })).toBeNull()
    await input.click(await screen.findByRole('option', { name: 'Stretch' }))
    const target = screen.getByLabelText('Target, in done days')
    await input.clear(target)
    await input.type(target, '30')
    await input.click(screen.getByRole('button', { name: 'Link habit' }))

    expect(await screen.findByText(/0 of 30 done days/)).toBeTruthy()
    expect(calls.find((c) => c.method === 'PUT')!.body).toEqual({ goalId: 1, goalTargetDays: 30 })
  })

  it('warns that linking a habit from another goal moves it', async () => {
    stubApi({
      ...signedIn,
      'GET /api/goals/1': () => ok(marathon),
      'GET /api/goals/1/progress': () => ok(progress(0, [])),
      'GET /api/habits': () => ok(page([read])),
    })
    renderApp('/goals/1')

    await screen.findByLabelText('Habit')
    await choose(userEvent.setup(), 'Habit', 'Read 20 pages (on another goal)')
    expect(screen.getByText(/takes it off its other goal/)).toBeTruthy()
  })

  it('changes a link’s target and unlinks a habit', async () => {
    const calls = stubApi({
      ...signedIn,
      'GET /api/goals/1': () => ok(marathon),
      'GET /api/goals/1/progress': () => ok(progress(50, [linked(11, 'Morning run', 30, 60)])),
      'GET /api/habits': () => ok(page([run])),
      'PUT /api/habits/11/goal': () => ok({ ...run, goalTargetDays: 90 }),
      'DELETE /api/habits/11/goal': () => ok({ ...run, goalId: null, goalTargetDays: null }),
    })
    renderApp('/goals/1')
    const input = userEvent.setup()

    await input.click(await screen.findByRole('button', { name: 'Change target for Morning run' }))
    const target = screen.getByLabelText('Target, in done days')
    expect((target as HTMLInputElement).value).toBe('60')
    await input.clear(target)
    await input.type(target, '90')
    await input.click(screen.getByRole('button', { name: 'Save' }))
    await input.click(await screen.findByRole('button', { name: 'Unlink Morning run' }))

    expect(calls.find((c) => c.method === 'PUT')!.body).toEqual({ goalId: 1, goalTargetDays: 90 })
    expect(calls.some((c) => c.method === 'DELETE' && c.path === '/api/habits/11/goal')).toBe(true)
  })

  it('explains a link the server refuses', async () => {
    stubApi({
      ...signedIn,
      'GET /api/goals/1': () => ok(marathon),
      'GET /api/goals/1/progress': () => ok(progress(0, [])),
      'GET /api/habits': () => ok(page([stretch])),
      'PUT /api/habits/12/goal': () => fail(409, 'GOAL_NOT_ACTIVE'),
    })
    renderApp('/goals/1')
    const input = userEvent.setup()

    await screen.findByLabelText('Habit')
    await choose(input, 'Habit', 'Stretch')
    await input.click(screen.getByRole('button', { name: 'Link habit' }))

    expect((await screen.findByRole('alert')).textContent).toBe('Only an active goal can have habits linked to it.')
  })

  it('asks before marking achieved, then shows it achieved with nothing left to change', async () => {
    const calls = stubApi({
      ...signedIn,
      'GET /api/goals/1': () => ok(marathon),
      'GET /api/goals/1/progress': () => ok(progress(100, [linked(11, 'Morning run', 60, 60)])),
      'GET /api/habits': () => ok(page([run])),
      'POST /api/goals/1/achieve': () => ok({ ...marathon, status: 'ACHIEVED', achievedAt: '2026-10-03T04:00:00Z' }),
    })
    renderApp('/goals/1')
    const input = userEvent.setup()

    expect(await screen.findByText(/Every linked habit has reached its target/)).toBeTruthy()
    await input.click(screen.getByRole('button', { name: 'Mark achieved' }))
    expect(calls.some((c) => c.path === '/api/goals/1/achieve')).toBe(false)
    await input.click(screen.getByRole('button', { name: 'Yes, achieved' }))

    expect(await screen.findByText('Achieved 3 Oct 2026')).toBeTruthy()
    expect(screen.getByText('Target was 31 Dec 2026')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Link a habit' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Unlink Morning run' })).toBeNull()
  })

  it('lets you back out of abandoning, and abandons on a second yes', async () => {
    const calls = stubApi({
      ...signedIn,
      'GET /api/goals/1': () => ok(marathon),
      'GET /api/goals/1/progress': () => ok(progress(0, [])),
      'GET /api/habits': () => ok(page([])),
      'POST /api/goals/1/abandon': () => ok({ ...marathon, status: 'ABANDONED' }),
    })
    renderApp('/goals/1')
    const input = userEvent.setup()

    await input.click(await screen.findByRole('button', { name: 'Abandon' }))
    await input.click(screen.getByRole('button', { name: 'Not yet' }))
    await input.click(screen.getByRole('button', { name: 'Abandon' }))
    await input.click(screen.getByRole('button', { name: 'Yes, abandon' }))

    expect(await screen.findByText('Abandoned')).toBeTruthy()
    expect(calls.filter((c) => c.path === '/api/goals/1/abandon')).toHaveLength(1)
  })

  it('says when the goal is not there or not yours', async () => {
    stubApi({ ...signedIn, 'GET /api/goals/9': () => fail(404, 'GOAL_NOT_FOUND') })
    renderApp('/goals/9')

    expect((await screen.findByRole('alert')).textContent).toContain("This goal doesn't exist")
    expect(screen.getByRole('link', { name: 'Back to goals' })).toBeTruthy()
  })
})

describe('habit detail', () => {
  it('shows the goal a habit is linked to and its done days toward the target', async () => {
    stubApi({
      ...signedIn,
      'GET /api/habits/11': () => ok(run),
      'GET /api/habits/11/streak': () => ok({ current: 0, longest: 0, unit: 'DAYS' }),
      'GET /api/habits/11/stats': () =>
        ok({
          last7Days: { days: 7, done: 0, expected: 0, rate: null },
          last30Days: { days: 30, done: 0, expected: 0, rate: null },
        }),
      'GET /api/habits/11/logs': () => ok(page([])),
      'GET /api/goals/1': () => ok(marathon),
      'GET /api/goals/1/progress': () => ok(progress(50, [linked(11, 'Morning run', 30, 60)])),
    })
    renderApp('/habits/11')

    const card = (await screen.findByText('Run a half marathon')).closest('a')!
    expect(card.getAttribute('href')).toBe('/goals/1')
    expect(await within(card).findByText('30 of 60 done days')).toBeTruthy()
  })
})
