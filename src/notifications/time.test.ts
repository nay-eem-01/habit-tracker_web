import { describe, expect, it } from 'vitest'
import { timeAgo } from './time'

const now = new Date('2026-10-02T12:00:00Z')
const ago = (seconds: number) => new Date(now.getTime() - seconds * 1000).toISOString()

describe('timeAgo', () => {
  it('counts up from just now to days', () => {
    expect(timeAgo(ago(20), now)).toBe('just now')
    expect(timeAgo(ago(5 * 60), now)).toBe('5 min ago')
    expect(timeAgo(ago(3 * 3600), now)).toBe('3 h ago')
    expect(timeAgo(ago(2 * 86400), now)).toBe('2 d ago')
  })

  it('shows the date after a week', () => {
    expect(timeAgo(ago(10 * 86400), now)).toBe('22 Sept')
  })

  it('never reads as the future when the clocks disagree', () => {
    expect(timeAgo(ago(-30), now)).toBe('just now')
  })
})
