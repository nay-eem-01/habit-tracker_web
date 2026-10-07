import { describe, expect, it } from 'vitest'
import type { HeatmapDay } from '../api/dashboard'
import { formatChange, hourLabel, levelOf, yearWeeks } from './dashboard'

const day = (date: string, done: number, expected: number): HeatmapDay => ({
  date,
  done,
  expected,
  ratio: expected ? Math.round((done / expected) * 100) / 100 : null,
})

describe('levelOf', () => {
  it('shades by the share done: none, some, half, most, all', () => {
    expect([null, 0, 0.2, 0.5, 0.75, 1].map(levelOf)).toEqual([0, 0, 1, 2, 3, 4])
  })
})

describe('yearWeeks', () => {
  it('pads the first week back to Monday and the last to Sunday with blanks', () => {
    // Wednesday 30 September to Friday 2 October 2026
    const weeks = yearWeeks([day('2026-09-30', 1, 2), day('2026-10-01', 0, 0), day('2026-10-02', 2, 2)])

    expect(weeks).toHaveLength(1)
    expect(weeks[0].map((d) => d.date)).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ])
    expect(weeks[0].map((d) => d.blank)).toEqual([true, true, false, false, false, true, true])
    expect(weeks[0][2].level).toBe(2)
    expect(weeks[0][2].title).toMatch(/^Wed 30 Sept?: 1 of 2 done$/)
    expect(weeks[0][3].title).toBe('Thu 1 Oct: nothing due')
    expect(weeks[0][4].level).toBe(4)
  })

  it('spans a whole year in week columns', () => {
    const days: HeatmapDay[] = []
    for (let d = new Date('2025-10-03T00:00:00Z'); d <= new Date('2026-10-02T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1)) {
      days.push(day(d.toISOString().slice(0, 10), 1, 1))
    }
    expect(days).toHaveLength(365)
    expect(yearWeeks(days)).toHaveLength(53)
  })
})

describe('formatChange', () => {
  it('says the change in percentage points, with a real minus sign', () => {
    expect(formatChange(0.12)).toBe('+12 pts')
    expect(formatChange(-0.05)).toBe('−5 pts')
    expect(formatChange(0.001)).toBe('no change')
    expect(formatChange(null)).toBeNull()
  })
})

describe('hourLabel', () => {
  it('names hours the way people say them', () => {
    expect([0, 7, 12, 13, 23].map(hourLabel)).toEqual(['midnight', '7 am', '12 pm', '1 pm', '11 pm'])
  })
})
