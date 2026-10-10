import { describe, expect, it } from 'vitest'
import { ApiError } from './errors'
import { authErrorMessage, goalErrorMessage, habitErrorMessage, resourceErrorMessage } from './messages'

describe('limits in plain words', () => {
  it('says how long to wait after too many tries, from Retry-After', () => {
    const limited = (seconds: number | null) => new ApiError(429, 'RATE_LIMITED', 'Too many attempts', null, null, seconds)
    expect(authErrorMessage(limited(600))).toBe('Too many tries. Try again in 10 minutes.')
    expect(authErrorMessage(limited(30))).toBe('Too many tries. Try again in a minute.')
    expect(authErrorMessage(limited(null))).toBe('Too many tries. Wait a little and try again.')
  })

  it('passes on the plan limit the server names, for habits and goals', () => {
    const habits = new ApiError(403, 'PLAN_LIMIT_REACHED', 'The free plan keeps up to 7 active habits; archive one first')
    expect(habitErrorMessage(habits)).toBe('The free plan keeps up to 7 active habits; archive one first.')
    const goals = new ApiError(403, 'PLAN_LIMIT_REACHED', 'The free plan keeps up to 2 active goals; close one first')
    expect(goalErrorMessage(goals)).toBe('The free plan keeps up to 2 active goals; close one first.')
  })

  it('says uploads are off', () => {
    expect(resourceErrorMessage(new ApiError(403, 'FILE_UPLOADS_DISABLED', 'off'))).toContain('File uploads are off')
  })
})
