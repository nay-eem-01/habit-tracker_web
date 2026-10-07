// @vitest-environment jsdom
import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Goal } from '../api/goals'
import type { Resource } from '../api/resources'
import { fail, ok, page, renderApp, resetApp, session, stubApi } from '../test/helpers'

const marathon: Goal = {
  id: 1,
  title: 'Run a half marathon',
  description: null,
  targetDate: null,
  status: 'ACTIVE',
  achievedAt: null,
  createdAt: '2026-09-01T00:00:00Z',
}
const books: Goal = { ...marathon, id: 2, title: 'Read 12 books', status: 'ACHIEVED' }

const note: Resource = {
  id: 1,
  type: 'NOTE',
  title: 'Race-day checklist',
  body: '**Shoes** laced\n\n- gels\n- water',
  url: null,
  goalId: 1,
  pinned: true,
  createdAt: '2026-10-01T00:00:00Z',
}
const link: Resource = {
  id: 2,
  type: 'LINK',
  title: 'Couch to 5K plan',
  body: null,
  url: 'https://www.example.com/c25k',
  goalId: null,
  pinned: false,
  createdAt: '2026-10-02T00:00:00Z',
}

const signedIn = {
  'POST /api/auth/refresh': () => ok(session),
  'GET /api/goals': () => ok(page([marathon, books])),
}

beforeEach(resetApp)
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('library', () => {
  it('lists notes and links, pinned first as the server sends them, with their goal', async () => {
    stubApi({ ...signedIn, 'GET /api/resources': () => ok(page([note, link])) })
    renderApp('/resources')

    // the cards, not the list items inside a note's Markdown
    await screen.findByText('Race-day checklist')
    const items = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.closest('li')!)
    expect(within(items[0]).getByRole('heading').textContent).toBe('Race-day checklist')
    expect(within(items[0]).getByText('Pinned')).toBeTruthy()
    expect((await within(items[0]).findByText('Shoes')).tagName).toBe('STRONG')
    expect(within(items[0]).getByText('gels').tagName).toBe('LI')
    expect((await within(items[0]).findByRole('link', { name: 'Goal: Run a half marathon' })).getAttribute('href')).toBe('/goals/1')

    const out = within(items[1]).getByRole('link', { name: /^Couch to 5K plan/ })
    expect(out.getAttribute('href')).toBe('https://www.example.com/c25k')
    expect(out.getAttribute('target')).toBe('_blank')
    expect(out.getAttribute('rel')).toBe('noopener noreferrer')
    expect(within(items[1]).getByText('example.com')).toBeTruthy()
  })

  it('opens from the main nav', async () => {
    stubApi({ ...signedIn, 'GET /api/habits': () => ok(page([])), 'GET /api/resources': () => ok(page([])) })
    renderApp('/habits')

    await userEvent.click(await screen.findByRole('link', { name: 'Library' }))
    expect(await screen.findByRole('heading', { name: 'Library' })).toBeTruthy()
    expect(screen.getByText(/Nothing saved yet/)).toBeTruthy()
  })

  it('never injects raw HTML or makes a script link clickable', async () => {
    const sneaky: Resource = {
      ...note,
      body: 'Hi <img src=x onerror="alert(1)"> [click](javascript:alert(1)) <b>bold?</b>',
    }
    stubApi({ ...signedIn, 'GET /api/resources': () => ok(page([sneaky])) })
    const { container } = renderApp('/resources')

    await screen.findByText(/Hi/)
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('b')).toBeNull()
    expect(screen.queryByRole('link', { name: 'click' })).toBeNull()
    expect(screen.getByText(/click/)).toBeTruthy()
  })

  it('filters by kind and searches titles after a pause in typing', async () => {
    const calls = stubApi({ ...signedIn, 'GET /api/resources': () => ok(page([link])) })
    renderApp('/resources')
    const input = userEvent.setup()

    await screen.findByText('Couch to 5K plan')
    await input.click(screen.getByRole('button', { name: 'Links' }))
    await input.type(screen.getByLabelText('Search titles'), 'couch')

    await vi.waitFor(() => expect(calls.some((c) => c.params.get('q') === 'couch')).toBe(true))
    const searches = calls.filter((c) => c.path === '/api/resources')
    // one request for the whole word, not one per key
    expect(searches.filter((c) => c.params.get('q')?.startsWith('c'))).toHaveLength(1)
    expect(searches.at(-1)!.params.get('type')).toBe('LINK')
  })

  it('says when nothing matches a search', async () => {
    stubApi({ ...signedIn, 'GET /api/resources': (call) => ok(page(call.params.get('q') ? [] : [link])) })
    renderApp('/resources')

    await userEvent.type(await screen.findByLabelText('Search titles'), 'zzz')
    expect(await screen.findByText('Nothing matches. Try another word or filter.')).toBeTruthy()
  })

  it('shows one goal’s resources from ?goalId, and clears that filter', async () => {
    const calls = stubApi({ ...signedIn, 'GET /api/resources': () => ok(page([note])) })
    renderApp('/resources?goalId=1')

    expect(await screen.findByText('Goal: Run a half marathon')).toBeTruthy()
    expect(calls.find((c) => c.path === '/api/resources')!.params.get('goalId')).toBe('1')

    await userEvent.click(screen.getByRole('button', { name: "Show every goal's resources" }))
    await vi.waitFor(() => expect(calls.filter((c) => c.path === '/api/resources').at(-1)!.params.get('goalId')).toBeNull())
  })

  it('pins and unpins', async () => {
    const calls = stubApi({
      ...signedIn,
      'GET /api/resources': () => ok(page([note, link])),
      'POST /api/resources/2/pin': () => ok({ ...link, pinned: true }),
      'POST /api/resources/1/unpin': () => ok({ ...note, pinned: false }),
    })
    renderApp('/resources')
    const input = userEvent.setup()

    const pin = await screen.findByRole('button', { name: 'Pin Couch to 5K plan' })
    expect(pin.getAttribute('aria-pressed')).toBe('false')
    await input.click(pin)
    await input.click(screen.getByRole('button', { name: 'Unpin Race-day checklist' }))

    await vi.waitFor(() => expect(calls.filter((c) => c.method === 'POST' && c.path.startsWith('/api/resources'))).toHaveLength(2))
  })

  it('asks before deleting for good', async () => {
    const calls = stubApi({
      ...signedIn,
      'GET /api/resources': () => ok(page([link])),
      'DELETE /api/resources/2': () => new Response(null, { status: 204 }),
    })
    renderApp('/resources')
    const input = userEvent.setup()

    await input.click(await screen.findByRole('button', { name: 'Delete Couch to 5K plan' }))
    expect(screen.getByText('Delete for good?')).toBeTruthy()
    await input.click(screen.getByRole('button', { name: 'Keep it' }))
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false)

    await input.click(screen.getByRole('button', { name: 'Delete Couch to 5K plan' }))
    await input.click(screen.getByRole('button', { name: 'Yes, delete' }))
    await vi.waitFor(() => expect(calls.some((c) => c.method === 'DELETE')).toBe(true))
  })

  it('folds a long note until asked', async () => {
    const long: Resource = { ...note, body: Array.from({ length: 14 }, (_, i) => `Line ${i + 1}`).join('\n\n') }
    stubApi({ ...signedIn, 'GET /api/resources': () => ok(page([long])) })
    renderApp('/resources')
    const input = userEvent.setup()

    const more = await screen.findByRole('button', { name: 'Show all' })
    expect(more.getAttribute('aria-expanded')).toBe('false')
    await input.click(more)
    expect(screen.getByRole('button', { name: 'Show less' }).getAttribute('aria-expanded')).toBe('true')
  })

  it('says so, and offers a retry, when the list cannot load', async () => {
    stubApi({ ...signedIn, 'GET /api/resources': () => fail(500, 'INTERNAL_ERROR') })
    renderApp('/resources')
    expect((await screen.findByRole('alert')).textContent).toContain('Something went wrong')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
  })
})

describe('adding and editing', () => {
  it('saves a note on a goal and returns to the library', async () => {
    const calls = stubApi({
      ...signedIn,
      'POST /api/resources': () => ok(note, 201),
      'GET /api/resources': () => ok(page([note])),
    })
    renderApp('/resources/new')
    const input = userEvent.setup()

    await input.type(await screen.findByLabelText('Title'), 'Race-day checklist')
    await input.type(screen.getByLabelText('Note', { selector: 'textarea' }), 'Shoes laced')
    // only active goals are offered for a new note
    const goal = screen.getByLabelText('Goal (optional)')
    expect(within(goal).queryByRole('option', { name: /Read 12 books/ })).toBeNull()
    await input.selectOptions(goal, 'Run a half marathon')
    await input.click(screen.getByLabelText('Pin it to the top'))
    await input.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('heading', { name: 'Library' })).toBeTruthy()
    expect(calls.find((c) => c.method === 'POST' && c.path === '/api/resources')!.body).toEqual({
      type: 'NOTE',
      title: 'Race-day checklist',
      body: 'Shoes laced',
      goalId: 1,
      pinned: true,
    })
  })

  it('saves a link from a goal’s page and goes back to the goal', async () => {
    const calls = stubApi({
      ...signedIn,
      'POST /api/resources': () => ok({ ...link, goalId: 1 }, 201),
      'GET /api/goals/1': () => ok(marathon),
      'GET /api/goals/1/progress': () => ok({ goalId: 1, percent: 0, habits: [] }),
      'GET /api/goals/1/resources': () => ok(page([{ ...link, goalId: 1 }])),
      'GET /api/habits': () => ok(page([])),
    })
    renderApp('/resources/new?goalId=1&back=%2Fgoals%2F1')
    const input = userEvent.setup()

    await input.click(await screen.findByLabelText('Link'))
    expect((screen.getByLabelText('Goal (optional)') as HTMLSelectElement).value).toBe('1')
    await input.type(screen.getByLabelText('Title'), 'Couch to 5K plan')
    await input.type(screen.getByLabelText('Address'), 'https://www.example.com/c25k')
    await input.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('heading', { name: 'Run a half marathon' })).toBeTruthy()
    expect(await screen.findByRole('heading', { name: 'Notes, links and files' })).toBeTruthy()
    expect(calls.find((c) => c.method === 'POST' && c.path === '/api/resources')!.body).toEqual({
      type: 'LINK',
      title: 'Couch to 5K plan',
      url: 'https://www.example.com/c25k',
      goalId: 1,
      pinned: false,
    })
  })

  it("shows the server's reason when the fields don't fit the kind", async () => {
    stubApi({
      ...signedIn,
      'POST /api/resources': () =>
        Response.json(
          { status: 'ERR', success: false, message: 'The url must be an http or https address', errorCode: 'RESOURCE_INVALID', payload: null },
          { status: 400 },
        ),
    })
    renderApp('/resources/new?type=LINK')
    const input = userEvent.setup()

    await input.type(await screen.findByLabelText('Title'), 'FTP')
    await input.type(screen.getByLabelText('Address'), 'ftp://example.com')
    await input.click(screen.getByRole('button', { name: 'Save' }))

    expect((await screen.findByRole('alert')).textContent).toBe('The url must be an http or https address')
  })

  it('loads a note on a closed goal and keeps that goal on offer when editing', async () => {
    const onBooks: Resource = { ...note, goalId: 2, pinned: false }
    const calls = stubApi({
      ...signedIn,
      'GET /api/resources/1': () => ok(onBooks),
      'PUT /api/resources/1': () => ok(onBooks),
      'GET /api/resources': () => ok(page([onBooks])),
    })
    renderApp('/resources/1/edit')
    const input = userEvent.setup()

    const title = (await screen.findByLabelText('Title')) as HTMLInputElement
    expect(title.value).toBe('Race-day checklist')
    expect((screen.getByLabelText('Goal (optional)') as HTMLSelectElement).value).toBe('2')
    expect(screen.getByRole('option', { name: 'Read 12 books (achieved)' })).toBeTruthy()

    await input.selectOptions(screen.getByLabelText('Goal (optional)'), 'No goal')
    await input.click(screen.getByRole('button', { name: 'Save changes' }))

    await screen.findByRole('heading', { name: 'Library' })
    expect(calls.find((c) => c.method === 'PUT')!.body).toEqual({
      type: 'NOTE',
      title: 'Race-day checklist',
      body: '**Shoes** laced\n\n- gels\n- water',
      pinned: false,
    })
  })

  it("explains a resource that isn't there", async () => {
    stubApi({ ...signedIn, 'GET /api/resources/99': () => fail(404, 'RESOURCE_NOT_FOUND') })
    renderApp('/resources/99/edit')
    expect((await screen.findByRole('alert')).textContent).toContain("doesn't exist, or it isn't yours")
  })
})

describe('on the goal page', () => {
  it('lists the goal’s notes and links, and links to the rest in the library', async () => {
    stubApi({
      ...signedIn,
      'GET /api/goals/1': () => ok(marathon),
      'GET /api/goals/1/progress': () => ok({ goalId: 1, percent: 0, habits: [] }),
      'GET /api/habits': () => ok(page([])),
      'GET /api/goals/1/resources': () => ok({ ...page([note, link]), totalElements: 7 }),
    })
    renderApp('/goals/1')

    const section = (await screen.findByRole('heading', { name: 'Notes, links and files' })).closest('section')!
    expect(await within(section).findByText('Race-day checklist')).toBeTruthy()
    // the goal's own page doesn't name the goal on each card
    expect(within(section).queryByText(/Goal:/)).toBeNull()
    expect(within(section).getByRole('link', { name: 'See all 7 in the library' }).getAttribute('href')).toBe('/resources?goalId=1')
    expect(within(section).getByRole('link', { name: 'Add' }).getAttribute('href')).toBe('/resources/new?goalId=1&back=%2Fgoals%2F1')
  })
})
