// @vitest-environment jsdom
import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Resource } from '../api/resources'
import { fail, ok, page, renderApp, resetApp, session, stubApi } from '../test/helpers'

const pdf: Resource = {
  id: 7,
  type: 'FILE',
  title: 'Week 1 plan',
  body: 'From the coach',
  url: null,
  goalId: null,
  file: { name: 'Week 1 plan.pdf', contentType: 'application/pdf', sizeBytes: 48_213 },
  pinned: false,
  createdAt: '2026-10-05T00:00:00Z',
}
const photo: Resource = {
  ...pdf,
  id: 8,
  title: 'Finish line',
  body: null,
  file: { name: 'finish.png', contentType: 'image/png', sizeBytes: 2_500_000 },
}

const signedIn = {
  'POST /api/auth/refresh': () => ok(session),
  'GET /api/goals': () => ok(page([])),
}
// a string body: jsdom's Blob can't be handed to Node's Response
const bytes = (type: string) => () => new Response('x', { headers: { 'Content-Type': type } })

beforeEach(() => {
  resetApp()
  // jsdom has no object URLs; the download and the preview only need an address to point at
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:local/1'), revokeObjectURL: vi.fn() }))
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('files in the library', () => {
  it('shows a file with its name and size, and downloads it with the token', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const calls = stubApi({
      ...signedIn,
      'GET /api/resources': () => ok(page([pdf])),
      'GET /api/resources/7/file': bytes('application/pdf'),
    })
    renderApp('/resources')

    expect(await screen.findByText('Week 1 plan.pdf · 47 KB')).toBeTruthy()
    expect(screen.getByLabelText('PDF file')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Download Week 1 plan.pdf' }))

    await vi.waitFor(() => expect(click).toHaveBeenCalled())
    const download = calls.find((c) => c.path === '/api/resources/7/file')!
    expect(download.headers.Authorization).toBe('Bearer token-1')
    expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe('Week 1 plan.pdf')
  })

  it('shows an uploaded image inline', async () => {
    stubApi({
      ...signedIn,
      'GET /api/resources': () => ok(page([photo])),
      'GET /api/resources/8/file': bytes('image/png'),
    })
    renderApp('/resources')

    const image = (await screen.findByRole('img', { name: 'Finish line' })) as HTMLImageElement
    await vi.waitFor(() => expect(image.getAttribute('src')).toBe('blob:local/1'))
  })

  it('says so when a file has gone missing', async () => {
    stubApi({
      ...signedIn,
      'GET /api/resources': () => ok(page([pdf])),
      'GET /api/resources/7/file': () => fail(404, 'FILE_NOT_FOUND'),
    })
    renderApp('/resources')

    await userEvent.click(await screen.findByRole('button', { name: 'Download Week 1 plan.pdf' }))
    expect((await screen.findByRole('alert')).textContent).toContain('This file is missing')
  })

  it('asks for files on the Files tab', async () => {
    const calls = stubApi({ ...signedIn, 'GET /api/resources': () => ok(page([])) })
    renderApp('/resources')

    await userEvent.click(await screen.findByRole('button', { name: 'Files' }))
    await vi.waitFor(() => expect(calls.at(-1)!.params.get('type')).toBe('FILE'))
  })
})

describe('uploading', () => {
  it('uploads the file with its fields, taking the title from the file name', async () => {
    const calls = stubApi({
      ...signedIn,
      'POST /api/resources/files': () => ok(pdf, 201),
      'GET /api/resources': () => ok(page([pdf])),
    })
    renderApp('/resources/new?type=FILE')
    const input = userEvent.setup()

    await input.upload(await screen.findByLabelText('File to upload'), new File(['%PDF-1.7'], 'Week 1 plan.pdf', { type: 'application/pdf' }))
    expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('Week 1 plan')
    await input.type(screen.getByLabelText('Comment (optional)'), 'From the coach')
    await input.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('heading', { name: 'Library' })).toBeTruthy()
    const form = calls.find((c) => c.path === '/api/resources/files')!.body as FormData
    expect((form.get('file') as File).name).toBe('Week 1 plan.pdf')
    expect(form.get('title')).toBe('Week 1 plan')
    expect(form.get('body')).toBe('From the coach')
    expect(form.get('pinned')).toBe('false')
    expect(form.has('goalId')).toBe(false)
  })

  it('refuses a file type the server would, without uploading', async () => {
    const calls = stubApi({ ...signedIn })
    renderApp('/resources/new?type=FILE')
    const input = userEvent.setup({ applyAccept: false })

    await input.upload(await screen.findByLabelText('File to upload'), new File(['MZ'], 'setup.exe'))
    expect(await screen.findByText(/Use a PNG, JPEG/)).toBeTruthy()
    await input.click(screen.getByRole('button', { name: 'Save' }))

    expect(calls.some((c) => c.path === '/api/resources/files')).toBe(false)
  })

  it('asks for a file before saving', async () => {
    stubApi({ ...signedIn })
    renderApp('/resources/new?type=FILE')
    const input = userEvent.setup()

    await input.type(await screen.findByLabelText('Title'), 'Plan')
    await input.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Choose a file to upload.')).toBeTruthy()
  })

  it('explains a full storage', async () => {
    stubApi({ ...signedIn, 'POST /api/resources/files': () => fail(413, 'FILE_QUOTA_EXCEEDED') })
    renderApp('/resources/new?type=FILE')
    const input = userEvent.setup()

    await input.upload(await screen.findByLabelText('File to upload'), new File(['x'], 'notes.txt', { type: 'text/plain' }))
    await input.click(screen.getByRole('button', { name: 'Save' }))
    expect((await screen.findByRole('alert')).textContent).toContain('100 MB of file storage is full')
  })
})

describe('editing a file', () => {
  it('keeps the file and its kind, and sends a FILE replace', async () => {
    const calls = stubApi({
      ...signedIn,
      'GET /api/resources/7': () => ok(pdf),
      'PUT /api/resources/7': () => ok(pdf),
      'GET /api/resources': () => ok(page([pdf])),
    })
    renderApp('/resources/7/edit')
    const input = userEvent.setup()

    const title = await screen.findByLabelText('Title')
    expect(screen.queryByRole('group', { name: 'Kind' })).toBeNull()
    expect(screen.queryByLabelText('File to upload')).toBeNull()
    expect(screen.getByText('Week 1 plan.pdf')).toBeTruthy()
    await input.clear(title)
    await input.type(title, 'Week one')
    await input.click(screen.getByRole('button', { name: 'Save changes' }))

    await screen.findByRole('heading', { name: 'Library' })
    expect(calls.find((c) => c.method === 'PUT')!.body).toEqual({
      type: 'FILE',
      title: 'Week one',
      body: 'From the coach',
      pinned: false,
    })
  })

  it('lets a note become a link but never a file', async () => {
    const note: Resource = { ...pdf, type: 'NOTE', file: null }
    stubApi({ ...signedIn, 'GET /api/resources/7': () => ok(note) })
    renderApp('/resources/7/edit')

    const kinds = within(await screen.findByRole('group', { name: 'Kind' }))
    expect(kinds.getByLabelText('Link')).toBeTruthy()
    expect(kinds.queryByLabelText('File')).toBeNull()
  })
})
