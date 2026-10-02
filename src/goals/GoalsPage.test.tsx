// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Goal } from '../api/goals'
import { fail, ok, page, renderApp, resetApp, session, stubApi } from '../test/helpers'

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
const books: Goal = { ...marathon, id: 2, title: 'Read 12 books', description: null, targetDate: '2026-10-01' }
const spanish: Goal = { ...marathon, id: 3, title: 'Learn Spanish', description: null, targetDate: null }

const signedIn = { 'POST /api/auth/refresh': () => ok(session) }
const linked = (habitId: number, archived = false) => ({
  habitId,
  name: `Habit ${habitId}`,
  archived,
  linkedOn: '2026-09-01',
  doneDays: 10,
  goalTargetDays: 60,
  percent: 17,
})
/** Each card asks for its goal's progress. */
const progress = (id: number, percent: number, habits: ReturnType<typeof linked>[]) => ({
  [`GET /api/goals/${id}/progress`]: () => ok({ goalId: id, percent, habits }),
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

describe('goal list', () => {
  it('shows active goals with their deadline in words', async () => {
    const calls = stubApi({
      ...signedIn,
      'GET /api/goals': () => ok(page([marathon, books, spanish])),
      ...progress(1, 0, []),
      ...progress(2, 0, []),
      ...progress(3, 0, []),
    })
    renderApp('/goals')

    expect(await screen.findByRole('heading', { name: 'Run a half marathon' })).toBeTruthy()
    expect(screen.getByText('Under two hours')).toBeTruthy()
    expect(screen.getByText('By 31 Dec 2026 · 89 days left')).toBeTruthy()
    expect(screen.getByText('By 1 Oct 2026 · 2 days overdue')).toBeTruthy()
    expect(screen.getByText('No deadline')).toBeTruthy()
    expect(calls.find((c) => c.path === '/api/goals')!.params.get('status')).toBe('ACTIVE')
  })

  it('shows each goal\'s progress, counting only habits that are not archived', async () => {
    stubApi({
      ...signedIn,
      'GET /api/goals': () => ok(page([marathon, spanish])),
      ...progress(1, 42, [linked(1), linked(2), linked(3, true)]),
      ...progress(3, 0, []),
    })
    renderApp('/goals')

    expect(await screen.findByText('42%')).toBeTruthy()
    expect(screen.getByText('2 habits')).toBeTruthy()
    expect(screen.getByText('No habits linked yet')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Run a half marathon' }).getAttribute('href')).toBe('/goals/1')
  })

  it('opens from the main nav', async () => {
    stubApi({
      ...signedIn,
      'GET /api/habits': () => ok(page([])),
      'GET /api/goals': () => ok(page([])),
    })
    renderApp('/habits')

    await userEvent.click(await screen.findByRole('link', { name: 'Goals' }))
    expect(await screen.findByRole('heading', { name: 'Goals' })).toBeTruthy()
  })

  it('asks for achieved goals on the Achieved tab and says when each was reached', async () => {
    const won: Goal = { ...marathon, status: 'ACHIEVED', achievedAt: '2026-09-30T20:00:00Z' }
    const calls = stubApi({
      ...signedIn,
      'GET /api/goals': (call) => ok(page(call.params.get('status') === 'ACHIEVED' ? [won] : [])),
      ...progress(1, 100, [linked(1)]),
    })
    renderApp('/goals')

    await userEvent.click(await screen.findByRole('button', { name: 'Achieved' }))

    // 8pm UTC on the 30th is already 1 October in Dhaka
    expect(await screen.findByText('Achieved 1 Oct 2026')).toBeTruthy()
    expect(screen.getByText('Target was 31 Dec 2026')).toBeTruthy()
    expect(calls.map((c) => c.params.get('status')).filter(Boolean)).toEqual(['ACTIVE', 'ACHIEVED'])
  })

  it('invites the first goal when there are none', async () => {
    stubApi({ ...signedIn, 'GET /api/goals': () => ok(page([])) })
    renderApp('/goals')
    expect(await screen.findByText(/No goals yet/)).toBeTruthy()
  })

  it('says so, and offers a retry, when the list cannot load', async () => {
    stubApi({ ...signedIn, 'GET /api/goals': () => fail(500, 'INTERNAL_ERROR') })
    renderApp('/goals')
    expect((await screen.findByRole('alert')).textContent).toContain('Something went wrong')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
  })
})

describe('creating a goal', () => {
  it('sends the title, description and date, then opens the new goal', async () => {
    const calls = stubApi({
      ...signedIn,
      'POST /api/goals': () => ok(marathon, 201),
      'GET /api/goals/1': () => ok(marathon),
      ...progress(1, 0, []),
      'GET /api/habits': () => ok(page([])),
    })
    renderApp('/goals/new')
    const input = userEvent.setup()

    await input.type(await screen.findByLabelText('Goal'), 'Run a half marathon')
    await input.type(screen.getByLabelText('Why it matters (optional)'), 'Under two hours')
    await input.type(screen.getByLabelText('Target date (optional)'), '2026-12-31')
    await input.click(screen.getByRole('button', { name: 'Add goal' }))

    expect(await screen.findByRole('heading', { name: 'Run a half marathon' })).toBeTruthy()
    expect(calls.find((c) => c.method === 'POST' && c.path === '/api/goals')!.body).toEqual({
      title: 'Run a half marathon',
      description: 'Under two hours',
      targetDate: '2026-12-31',
    })
  })

  it("shows the server's complaint next to the field", async () => {
    stubApi({ ...signedIn, 'POST /api/goals': () => fail(400, 'VALIDATION_FAILED', { title: 'must not be blank' }) })
    renderApp('/goals/new')
    const input = userEvent.setup()

    await input.type(await screen.findByLabelText('Goal'), ' ')
    await input.click(screen.getByRole('button', { name: 'Add goal' }))

    expect(await screen.findByText('Goal must not be blank')).toBeTruthy()
  })
})

describe('editing a goal', () => {
  it('loads the goal, and a save replaces every field', async () => {
    const calls = stubApi({
      ...signedIn,
      'GET /api/goals/1': () => ok(marathon),
      'PUT /api/goals/1': () => ok(marathon),
      ...progress(1, 0, []),
      'GET /api/habits': () => ok(page([])),
    })
    renderApp('/goals/1/edit')
    const input = userEvent.setup()

    const title = (await screen.findByLabelText('Goal')) as HTMLInputElement
    expect(title.value).toBe('Run a half marathon')
    expect((screen.getByLabelText('Target date (optional)') as HTMLInputElement).value).toBe('2026-12-31')

    await input.clear(screen.getByLabelText('Why it matters (optional)'))
    await input.clear(screen.getByLabelText('Target date (optional)'))
    await input.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByRole('heading', { name: 'Run a half marathon' })).toBeTruthy()
    expect(calls.find((c) => c.method === 'PUT')!.body).toEqual({ title: 'Run a half marathon' })
  })

  it("explains a goal that isn't there", async () => {
    stubApi({ ...signedIn, 'GET /api/goals/99': () => fail(404, 'GOAL_NOT_FOUND') })
    renderApp('/goals/99/edit')
    expect((await screen.findByRole('alert')).textContent).toContain("This goal doesn't exist")
    expect(screen.getByRole('link', { name: 'Back to goals' })).toBeTruthy()
  })
})
