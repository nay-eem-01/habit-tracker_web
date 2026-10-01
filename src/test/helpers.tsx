import { QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import App from '../App'
import { setAccessToken } from '../api/client'
import { queryClient } from '../queryClient'

export const user = { id: 1, email: 'nayeem@example.com', name: 'Nayeem Ahmed', authProvider: 'LOCAL', timezone: 'Asia/Dhaka' }
export const session = { accessToken: 'token-1', tokenType: 'Bearer', expiresIn: 900, user }

export const ok = (payload: unknown, status = 200) =>
  Response.json({ status: 'OK', success: true, message: 'ok', payload }, { status })

export const fail = (status: number, errorCode: string, fields: Record<string, string> | null = null) =>
  Response.json({ status: 'ERR', success: false, message: 'x', errorCode, fields, payload: null }, { status })

export const page = <T,>(content: T[], totalPages = 1, number = 0) => ({
  content,
  totalElements: content.length,
  totalPages,
  number,
  size: 20,
})

export interface Call {
  method: string
  path: string
  params: URLSearchParams
  body: unknown
}

type Handler = (call: Call) => Response

/**
 * Stubs `fetch` and answers by "METHOD /path" (query string left out, read it from `call.params`).
 * An unexpected request fails the test loudly. Returns the calls made, in order.
 */
export function stubApi(handlers: Record<string, Handler>): Call[] {
  const calls: Call[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: { method?: string; body?: string } = {}) => {
      const [path, query = ''] = url.split('?')
      const call: Call = {
        method: init.method ?? 'GET',
        path,
        params: new URLSearchParams(query),
        body: init.body ? JSON.parse(init.body) : undefined,
      }
      const handler = handlers[`${call.method} ${call.path}`]
      if (!handler) throw new Error(`unexpected request: ${call.method} ${url}`)
      calls.push(call)
      return handler(call)
    }),
  )
  return calls
}

export function resetApp() {
  setAccessToken(null)
  queryClient.clear()
  // no waiting through retries in tests: a failed request should show its error at once
  queryClient.setDefaultOptions({ queries: { retry: false, staleTime: 0, refetchOnWindowFocus: false } })
}

export function renderApp(path = '/') {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
