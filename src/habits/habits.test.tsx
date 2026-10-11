// @vitest-environment jsdom
import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Habit } from '../api/habits'
import { fail, ok, page, renderApp, resetApp, session, stubApi } from '../test/helpers'

const read: Habit = {
  id: 1,
  name: 'Read 20 pages',
  category: 'Learning',
  frequencyType: 'SPECIFIC_DAYS',
  frequencyConfig: { days: ['MONDAY', 'WEDNESDAY', 'FRIDAY'] },
  targetCount: 1,
  reminderTime: '07:30',
  archived: false,
  createdAt: '2026-10-01T00:00:00Z',
}
const water: Habit = {
  id: 2,
  name: 'Drink water',
  category: null,
  frequencyType: 'DAILY',
  frequencyConfig: null,
  targetCount: 8,
  reminderTime: null,
  archived: false,
  createdAt: '2026-10-01T00:00:00Z',
}
const signedIn = { 'POST /api/auth/refresh': () => ok(session) }

beforeEach(resetApp)
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('habit list', () => {
  it('shows each habit with its schedule, target and reminder in words', async () => {
    stubApi({ ...signedIn, 'GET /api/habits': () => ok(page([read, water])) })
    renderApp('/habits')

    const first = (await screen.findByRole('heading', { name: 'Read 20 pages' })).closest('li')!
    expect(within(first).getByText('Learning')).toBeTruthy()
    expect(within(first).getByText('Mon, Wed, Fri')).toBeTruthy()
    expect(within(first).getByText('Reminder at 07:30')).toBeTruthy()
    const second = screen.getByRole('heading', { name: 'Drink water' }).closest('li')!
    expect(within(second).getByText('Every day')).toBeTruthy()
    expect(within(second).getByText('8 times a day')).toBeTruthy()
  })

  it('invites the first habit when there are none', async () => {
    stubApi({ ...signedIn, 'GET /api/habits': () => ok(page([])) })
    renderApp('/habits')
    expect(await screen.findByText(/Add the first habit/)).toBeTruthy()
  })

  it('asks for the archived list on the Archived tab', async () => {
    const calls = stubApi({ ...signedIn, 'GET /api/habits': () => ok(page([])) })
    renderApp('/habits')
    await userEvent.click(await screen.findByRole('button', { name: 'Archived' }))

    expect(await screen.findByText('No archived habits.')).toBeTruthy()
    expect(calls.filter((c) => c.path === '/api/habits').map((c) => c.params.get('archived'))).toEqual(['false', 'true'])
  })

  it('says so, and offers a retry, when the list cannot load', async () => {
    let attempts = 0
    stubApi({
      ...signedIn,
      'GET /api/habits': () => (++attempts === 1 ? fail(400, 'MALFORMED_REQUEST') : ok(page([water]))),
    })
    renderApp('/habits')

    expect(await screen.findByRole('alert')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { name: 'Drink water' })).toBeTruthy()
  })
})

describe('archiving', () => {
  it('archives, confirms, and undoes', async () => {
    let list = [read]
    const calls = stubApi({
      ...signedIn,
      'GET /api/habits': () => ok(page(list)),
      'POST /api/habits/1/archive': () => {
        list = []
        return ok({ ...read, archived: true })
      },
      'POST /api/habits/1/unarchive': () => {
        list = [read]
        return ok(read)
      },
    })
    renderApp('/habits')
    const input = userEvent.setup()

    await input.click(await screen.findByRole('button', { name: 'Archive Read 20 pages' }))
    expect((await screen.findByRole('status')).textContent).toContain('Archived “Read 20 pages”.')
    await screen.findByText(/Add the first habit/)

    await input.click(screen.getByRole('button', { name: 'Undo' }))
    expect(await screen.findByRole('heading', { name: 'Read 20 pages' })).toBeTruthy()
    expect(calls.map((c) => `${c.method} ${c.path}`)).toContain('POST /api/habits/1/unarchive')
  })
})

describe('creating a habit', () => {
  it('sends a weekday habit with a reminder, then returns to the list', async () => {
    const calls = stubApi({
      ...signedIn,
      'GET /api/habits': () => ok(page([])),
      'POST /api/habits': () => ok(read, 201),
    })
    renderApp('/habits/new')
    const input = userEvent.setup()

    await input.type(await screen.findByLabelText('Name'), 'Read 20 pages')
    await input.type(screen.getByLabelText('Category (optional)'), 'Learning')
    await input.click(screen.getByLabelText('On specific days'))
    await input.click(screen.getByRole('button', { name: 'Friday' }))
    await input.click(screen.getByRole('button', { name: 'Monday' }))
    await input.click(screen.getByLabelText('Remind me'))
    await input.click(screen.getByRole('button', { name: 'Add habit' }))

    expect(await screen.findByRole('heading', { name: 'Habits' })).toBeTruthy()
    expect(calls.find((c) => c.method === 'POST' && c.path === '/api/habits')!.body).toEqual({
      name: 'Read 20 pages',
      kind: 'BUILD',
      category: 'Learning',
      frequencyType: 'SPECIFIC_DAYS',
      frequencyConfig: { days: ['MONDAY', 'FRIDAY'] },
      targetCount: 1,
      reminderTime: '08:00',
    })
  })

  it('asks for at least one day before sending anything', async () => {
    const calls = stubApi({ ...signedIn })
    renderApp('/habits/new')
    const input = userEvent.setup()

    await input.type(await screen.findByLabelText('Name'), 'Run')
    await input.click(screen.getByLabelText('On specific days'))
    await input.click(screen.getByRole('button', { name: 'Add habit' }))

    expect((await screen.findByRole('alert')).textContent).toBe('Pick at least one day.')
    expect(calls.some((c) => c.method === 'POST' && c.path === '/api/habits')).toBe(false)
  })

  it("shows the server's complaint next to the field", async () => {
    stubApi({
      ...signedIn,
      'POST /api/habits': () => fail(400, 'VALIDATION_FAILED', { name: 'must not be blank' }),
    })
    renderApp('/habits/new')
    const input = userEvent.setup()

    await input.type(await screen.findByLabelText('Name'), ' ')
    await input.click(screen.getByRole('button', { name: 'Add habit' }))

    expect(await screen.findByText('Name must not be blank')).toBeTruthy()
  })

  it('names the timezone the reminder runs in', async () => {
    stubApi({ ...signedIn })
    renderApp('/habits/new')
    await userEvent.click(await screen.findByLabelText('Remind me'))
    expect(await screen.findByText('In your timezone, Asia/Dhaka.')).toBeTruthy()
  })
})

describe('editing a habit', () => {
  it('loads the habit, and a save replaces every field', async () => {
    const calls = stubApi({
      ...signedIn,
      'GET /api/habits/1': () => ok(read),
      'GET /api/habits': () => ok(page([read])),
      'PUT /api/habits/1': () => ok(read),
    })
    renderApp('/habits/1/edit')
    const input = userEvent.setup()

    const name = (await screen.findByLabelText('Name')) as HTMLInputElement
    expect(name.value).toBe('Read 20 pages')
    expect((screen.getByLabelText('Reminder time') as HTMLInputElement).value).toBe('07:30')
    expect(screen.getByRole('button', { name: 'Wednesday' }).getAttribute('aria-pressed')).toBe('true')

    await input.clear(name)
    await input.type(name, 'Read 30 pages')
    await input.click(screen.getByLabelText('Remind me')) // turn the reminder off
    await input.click(screen.getByRole('button', { name: 'Save changes' }))

    await screen.findByRole('heading', { name: 'Habits' })
    expect(calls.find((c) => c.method === 'PUT')!.body).toEqual({
      name: 'Read 30 pages',
      kind: 'BUILD',
      category: 'Learning',
      frequencyType: 'SPECIFIC_DAYS',
      frequencyConfig: { days: ['MONDAY', 'WEDNESDAY', 'FRIDAY'] },
      targetCount: 1,
    })
  })

  it("explains a habit that isn't there", async () => {
    stubApi({ ...signedIn, 'GET /api/habits/99': () => fail(404, 'HABIT_NOT_FOUND') })
    renderApp('/habits/99/edit')
    expect((await screen.findByRole('alert')).textContent).toContain("doesn't exist, or it isn't yours")
    expect(screen.getByRole('link', { name: 'Back to habits' })).toBeTruthy()
  })
})
