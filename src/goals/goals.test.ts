import { describe, expect, it } from 'vitest'
import { daysBetween, deadline, toGoalRequest } from './goals'

describe('toGoalRequest', () => {
  it('trims, and leaves out an empty description and date so the server clears them', () => {
    expect(toGoalRequest({ title: '  Run a half marathon ', description: '  ', targetDate: '' })).toEqual({
      title: 'Run a half marathon',
    })
  })

  it('sends a description and date when given', () => {
    expect(toGoalRequest({ title: 'Read', description: ' 12 books ', targetDate: '2026-12-31' })).toEqual({
      title: 'Read',
      description: '12 books',
      targetDate: '2026-12-31',
    })
  })
})

describe('daysBetween', () => {
  it('counts whole days, across months, either way', () => {
    expect(daysBetween('2026-10-03', '2026-12-31')).toBe(89)
    expect(daysBetween('2026-10-03', '2026-10-01')).toBe(-2)
    expect(daysBetween('2026-10-03', '2026-10-03')).toBe(0)
  })
})

describe('deadline', () => {
  const today = '2026-10-03'

  it('is null without a date', () => {
    expect(deadline({ targetDate: null, status: 'ACTIVE' }, today)).toBeNull()
  })

  it('counts the days left, and says a single day plainly', () => {
    expect(deadline({ targetDate: '2026-12-31', status: 'ACTIVE' }, today)).toEqual({
      text: 'By 31 Dec 2026 · 89 days left',
      overdue: false,
    })
    expect(deadline({ targetDate: '2026-10-04', status: 'ACTIVE' }, today)!.text).toBe('By 4 Oct 2026 · 1 day left')
  })

  it('says due today, and flags a passed date as overdue', () => {
    expect(deadline({ targetDate: today, status: 'ACTIVE' }, today)!.text).toBe('Due today, 3 Oct 2026')
    expect(deadline({ targetDate: '2026-10-01', status: 'ACTIVE' }, today)).toEqual({
      text: 'By 1 Oct 2026 · 2 days overdue',
      overdue: true,
    })
  })

  it('only names the date for a closed goal, never overdue', () => {
    expect(deadline({ targetDate: '2026-10-01', status: 'ACHIEVED' }, today)).toEqual({
      text: 'Target was 1 Oct 2026',
      overdue: false,
    })
  })
})
