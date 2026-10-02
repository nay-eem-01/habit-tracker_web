import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './api/errors'

/** Client errors (4xx) won't fix themselves on retry; network and server errors get two more tries. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failures, error) => !(error instanceof ApiError && error.status < 500) && failures < 2,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})
