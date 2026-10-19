// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fail, ok, renderApp, resetApp, session, stubApi, user } from '../test/helpers'
import { squareJpeg } from './picture'

// jsdom has no canvas: the crop is tested on its own, here it hands back a stand-in JPEG
vi.mock('./picture', () => ({ squareJpeg: vi.fn(async () => new Blob(['jpeg'], { type: 'image/jpeg' })) }))

const appShell = {
  'POST /api/auth/refresh': () => ok(session),
  'GET /api/me/level': () => ok({ xp: 0, level: 1, tier: 'BRONZE', xpForNextLevel: 100, progressToNextLevel: 0, spentXp: 0, xpBalance: 0 }),
  'GET /api/notifications/unread-count': () => ok({ count: 0 }),
}

beforeEach(resetApp)
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('settings', () => {
  it('saves name, timezone and the email choice, and offers the device’s timezone', async () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({ timeZone: 'Europe/London' } as Intl.ResolvedDateTimeFormatOptions)
    const calls = stubApi({
      ...appShell,
      'PUT /api/me': (call) => ok({ ...user, ...(call.body as object) }),
    })
    renderApp('/settings')
    const input = userEvent.setup()

    const name = await screen.findByLabelText('Name')
    await input.clear(name)
    await input.type(name, 'Nayeem A.')
    await input.click(screen.getByRole('button', { name: 'Use it' }))
    await input.click(screen.getByRole('switch', { name: 'News and tips by email' }))
    await input.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Saved.')).toBeTruthy()
    expect(calls.find((c) => c.method === 'PUT')!.body).toEqual({ name: 'Nayeem A.', timezone: 'Europe/London', marketingEmails: true })
    expect(screen.getByRole('button', { name: 'Account, Nayeem A.' })).toBeTruthy()
  })

  it('deletes the account only with the password, then signs out', async () => {
    const calls = stubApi({
      ...appShell,
      'DELETE /api/me': (call) => ((call.body as { password?: string }).password === 'right-one' ? new Response(null, { status: 204 }) : fail(400, 'AUTH_WRONG_PASSWORD')),
      'POST /api/auth/logout': () => fail(401, 'AUTH_INVALID_REFRESH_TOKEN'),
    })
    renderApp('/settings')
    const input = userEvent.setup()

    await input.click(await screen.findByRole('button', { name: 'Delete my account' }))
    await input.type(screen.getByLabelText('Password'), 'wrong-one')
    await input.click(screen.getByRole('button', { name: 'Delete everything' }))
    expect(await screen.findByText("That isn't your current password.")).toBeTruthy()

    await input.clear(screen.getByLabelText('Password'))
    await input.type(screen.getByLabelText('Password'), 'right-one')
    await input.click(screen.getByRole('button', { name: 'Delete everything' }))
    expect(await screen.findByRole('heading', { name: /Welcome back|Sign in/ })).toBeTruthy()
    expect(calls.filter((c) => c.method === 'DELETE')).toHaveLength(2)
  })

  it('links the privacy policy', async () => {
    stubApi({ ...appShell })
    renderApp('/settings')
    const link = await screen.findByRole('link', { name: 'Privacy policy' })
    expect(link.getAttribute('href')).toBe('/privacy.html')
  })
})

describe('profile picture', () => {
  // a string body: jsdom's Blob can't be handed to Node's Response
  const jpeg = () => new Response('jpeg', { headers: { 'Content-Type': 'image/jpeg' } })
  const photo = () => new File(['png'], 'me.png', { type: 'image/png' })

  beforeEach(() => {
    // jsdom has no object URLs; the picture only needs an address to point at
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:avatar'), revokeObjectURL: vi.fn() }))
  })

  it('uploads the cropped picture and shows it in the account menu', async () => {
    const calls = stubApi({
      ...appShell,
      'PUT /api/me/avatar': () => ok({ ...user, avatarUpdatedAt: '2026-10-16T10:00:00Z' }),
      'GET /api/me/avatar': jpeg,
    })
    renderApp('/settings')
    const input = userEvent.setup()

    await input.upload(await screen.findByLabelText('Upload photo'), photo())

    expect(await screen.findByText('Photo updated.')).toBeTruthy()
    const sent = calls.find((c) => c.method === 'PUT')!.body as FormData
    expect((sent.get('file') as File).type).toBe('image/jpeg')
    await vi.waitFor(() => expect(screen.getByRole('button', { name: /^Account,/ }).querySelector('img')).toBeTruthy())
    expect(screen.getByLabelText('Change photo')).toBeTruthy()
  })

  it('removes it, back to initials', async () => {
    const calls = stubApi({
      ...appShell,
      'POST /api/auth/refresh': () => ok({ ...session, user: { ...user, avatarUpdatedAt: '2026-10-16T10:00:00Z' } }),
      'GET /api/me/avatar': jpeg,
      'DELETE /api/me/avatar': () => new Response(null, { status: 204 }),
    })
    renderApp('/settings')
    const input = userEvent.setup()

    await input.click(await screen.findByRole('button', { name: 'Remove photo' }))

    expect(await screen.findByText('Photo removed.')).toBeTruthy()
    expect(calls.some((c) => c.method === 'DELETE' && c.path === '/api/me/avatar')).toBe(true)
    expect(screen.getByRole('button', { name: /^Account,/ }).textContent).toBe('NA')
    expect(screen.getByLabelText('Upload photo')).toBeTruthy()
  })

  it('says so when the browser can’t open the file, and sends nothing', async () => {
    vi.mocked(squareJpeg).mockRejectedValueOnce(new Error('decode'))
    const calls = stubApi(appShell)
    renderApp('/settings')
    const input = userEvent.setup()

    await input.upload(await screen.findByLabelText('Upload photo'), photo())

    expect((await screen.findByRole('alert')).textContent).toContain('couldn’t be opened as a picture')
    expect(calls.some((c) => c.path === '/api/me/avatar')).toBe(false)
  })

  it('explains a picture the server turns away', async () => {
    stubApi({ ...appShell, 'PUT /api/me/avatar': () => fail(415, 'USER_AVATAR_INVALID') })
    renderApp('/settings')
    const input = userEvent.setup()

    await input.upload(await screen.findByLabelText('Upload photo'), photo())

    expect((await screen.findByRole('alert')).textContent).toBe('That file isn’t a picture we can use. Choose a JPEG, PNG or GIF.')
  })
})
