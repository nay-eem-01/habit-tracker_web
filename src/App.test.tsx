// @vitest-environment jsdom
import { QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { getAccessToken, setAccessToken } from './api/client'
import { queryClient } from './queryClient'

const user = { id: 1, email: 'nayeem@example.com', name: 'Nayeem Ahmed', authProvider: 'LOCAL', timezone: 'Asia/Dhaka' }
const session = { accessToken: 'token-1', tokenType: 'Bearer', expiresIn: 900, user }

const emptyPage = { content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 }
const ok = (payload: unknown, status = 200) =>
  Response.json({ status: 'OK', success: true, message: 'ok', payload }, { status })
const fail = (status: number, errorCode: string, fields: Record<string, string> | null = null) =>
  Response.json({ status: 'ERR', success: false, message: 'x', errorCode, fields, payload: null }, { status })

let fetchMock: ReturnType<typeof vi.fn>

/** Answers each call by URL, so the order the app makes them in doesn't matter. */
function routes(handlers: Record<string, () => Response>) {
  fetchMock.mockImplementation(async (url: string) => {
    const handler = handlers[url.split('?')[0]]
    if (!handler) throw new Error(`unexpected request: ${url}`)
    return handler()
  })
}

function renderApp(path = '/') {
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  setAccessToken(null)
  queryClient.clear()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('protected pages', () => {
  it('send a visitor with no session to sign in', async () => {
    routes({ '/api/auth/refresh': () => fail(401, 'AUTH_INVALID_REFRESH_TOKEN') })
    renderApp('/')
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeTruthy()
  })

  it('open straight away when the refresh cookie is still good', async () => {
    routes({ '/api/auth/refresh': () => ok(session), '/api/habits': () => ok(emptyPage) })
    renderApp('/')
    expect(await screen.findByRole('heading', { name: 'Today' })).toBeTruthy()
  })

  it('show the sign-in page, not a blank screen, when the server is down', async () => {
    routes({ '/api/auth/refresh': () => fail(500, 'INTERNAL_ERROR') })
    renderApp('/')
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeTruthy()
  })
})

describe('signing in', () => {
  it('goes to the habits page and keeps the token in memory', async () => {
    routes({
      '/api/auth/refresh': () => fail(401, 'AUTH_INVALID_REFRESH_TOKEN'),
      '/api/auth/login': () => ok(session),
      '/api/habits': () => ok(emptyPage),
    })
    renderApp('/signin')
    const input = userEvent.setup()

    await input.type(await screen.findByLabelText('Email'), 'nayeem@example.com')
    await input.type(screen.getByLabelText('Password'), 'correct horse')
    await input.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('heading', { name: 'Today' })).toBeTruthy()
    expect(getAccessToken()).toBe('token-1')
    const login = fetchMock.mock.calls.find(([url]) => url === '/api/auth/login')!
    expect(JSON.parse(login[1].body)).toEqual({ email: 'nayeem@example.com', password: 'correct horse' })
  })

  it('says plainly when the email and password are wrong', async () => {
    routes({
      '/api/auth/refresh': () => fail(401, 'AUTH_INVALID_REFRESH_TOKEN'),
      '/api/auth/login': () => fail(401, 'AUTH_INVALID_CREDENTIALS'),
    })
    renderApp('/signin')
    const input = userEvent.setup()

    await input.type(await screen.findByLabelText('Email'), 'nayeem@example.com')
    await input.type(screen.getByLabelText('Password'), 'wrong')
    await input.click(screen.getByRole('button', { name: 'Sign in' }))

    expect((await screen.findByRole('alert')).textContent).toContain("don't match")
  })
})

describe('registering', () => {
  it('sends the browser timezone and signs the new user in', async () => {
    routes({
      '/api/auth/refresh': () => fail(401, 'AUTH_INVALID_REFRESH_TOKEN'),
      '/api/auth/register': () => ok(session, 201),
      '/api/habits': () => ok(emptyPage),
    })
    renderApp('/register')
    const input = userEvent.setup()

    await input.type(await screen.findByLabelText('Name'), 'Nayeem Ahmed')
    await input.type(screen.getByLabelText('Email'), 'nayeem@example.com')
    await input.type(screen.getByLabelText('Password'), 'long enough')
    await input.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByRole('heading', { name: 'Today' })).toBeTruthy()
    const call = fetchMock.mock.calls.find(([url]) => url === '/api/auth/register')!
    expect(JSON.parse(call[1].body)).toMatchObject({
      name: 'Nayeem Ahmed',
      email: 'nayeem@example.com',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })
  })

  it('points to sign in when the email is taken', async () => {
    routes({
      '/api/auth/refresh': () => fail(401, 'AUTH_INVALID_REFRESH_TOKEN'),
      '/api/auth/register': () => fail(409, 'USER_EMAIL_TAKEN'),
    })
    renderApp('/register')
    const input = userEvent.setup()

    await input.type(await screen.findByLabelText('Name'), 'Nayeem Ahmed')
    await input.type(screen.getByLabelText('Email'), 'nayeem@example.com')
    await input.type(screen.getByLabelText('Password'), 'long enough')
    await input.click(screen.getByRole('button', { name: 'Create account' }))

    expect((await screen.findByRole('alert')).textContent).toContain('already exists')
    expect(screen.getByRole('link', { name: 'Go to sign in' })).toBeTruthy()
  })

  it('shows the server\'s field complaints next to the field', async () => {
    routes({
      '/api/auth/refresh': () => fail(401, 'AUTH_INVALID_REFRESH_TOKEN'),
      '/api/auth/register': () => fail(400, 'VALIDATION_FAILED', { email: 'must be a well-formed email address' }),
    })
    renderApp('/register')
    const input = userEvent.setup()

    await input.type(await screen.findByLabelText('Name'), 'Nayeem Ahmed')
    await input.type(screen.getByLabelText('Email'), 'nayeem@example.com')
    await input.type(screen.getByLabelText('Password'), 'long enough')
    await input.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('Email must be a well-formed email address')).toBeTruthy()
  })
})

describe('signing out', () => {
  it('revokes the session, drops the token and returns to sign in', async () => {
    routes({
      '/api/auth/refresh': () => ok(session),
      '/api/auth/logout': () => new Response(null, { status: 204 }),
      '/api/habits': () => ok(emptyPage),
    })
    renderApp('/')
    const input = userEvent.setup()

    await input.click(await screen.findByRole('button', { name: /Account/ }))
    await input.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(await screen.findByRole('heading', { name: 'Sign in' }, { timeout: 3000 })).toBeTruthy()
    expect(getAccessToken()).toBeNull()
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/auth/logout')).toBe(true)
  })
})
