import { describe, expect, it } from 'vitest'
import type { HabitLog } from '../api/checkins'
import type { Habit } from '../api/habits'
import { formatToday, todayIn, todayStatus, weekdayOf, weekStart, withTodayCount } from './today'

const base: Habit = {
  id: 1,
  name: 'Read',
  frequencyType: 'DAILY',
  targetCount: 1,
  archived: false,
  createdAt: '2026-09-01T00:00:00Z',
}
const log = (date: string, completedCount: number, target = 1): HabitLog => ({
  id: 1,
  date,
  completedCount,
  done: completedCount >= target,
})

describe('dates', () => {
  it("uses the user's calendar day, not UTC's", () => {
    const instant = new Date('2026-10-01T20:00:00Z')
    expect(todayIn('Asia/Dhaka', instant)).toBe('2026-10-02')
    expect(todayIn('America/New_York', instant)).toBe('2026-10-01')
  })

  it('words the date for the heading', () => {
    expect(formatToday('Asia/Dhaka', new Date('2026-10-01T20:00:00Z'))).toBe('Friday 2 October')
  })

  it('finds the weekday and the Monday that starts the week', () => {
    expect(weekdayOf('2026-10-02')).toBe('FRIDAY')
    expect(weekStart('2026-10-02')).toBe('2026-09-28') // Friday → Monday, across a month boundary
    expect(weekStart('2026-09-28')).toBe('2026-09-28') // a Monday is its own start
    expect(weekStart('2026-10-04')).toBe('2026-09-28') // Sunday belongs to the week before
  })
})

describe('todayStatus', () => {
  it('daily habits are always due; done once the count reaches the target', () => {
    expect(todayStatus(base, [], '2026-10-02')).toMatchObject({ due: true, count: 0, done: false })
    expect(todayStatus(base, [log('2026-10-02', 1)], '2026-10-02')).toMatchObject({ count: 1, done: true })
  })

  it('counts towards a target above one', () => {
    const water = { ...base, targetCount: 8 }
    expect(todayStatus(water, [log('2026-10-02', 3, 8)], '2026-10-02')).toMatchObject({ count: 3, target: 8, done: false })
  })

  it('weekday habits are only due on their days', () => {
    const mondays: Habit = { ...base, frequencyType: 'SPECIFIC_DAYS', frequencyConfig: { days: ['MONDAY'] } }
    expect(todayStatus(mondays, [], '2026-09-28').due).toBe(true)
    expect(todayStatus(mondays, [], '2026-09-29').due).toBe(false)
  })

  it('N-a-week habits are open all week and count this week’s done days', () => {
    const run: Habit = { ...base, frequencyType: 'X_TIMES_PER_WEEK', frequencyConfig: { timesPerWeek: 3 } }
    const logs = [log('2026-09-30', 1), log('2026-09-28', 1), log('2026-09-27', 1)] // the 27th is last week
    expect(todayStatus(run, logs, '2026-10-02')).toMatchObject({ due: true, done: false, week: { done: 2, goal: 3 } })
  })

  it('prices a rest by this week’s rests: free, 100, 200, then none', () => {
    const rest = (date: string): HabitLog => ({ ...log(date, 0), rest: true })
    const cost = (logs: HabitLog[]) => todayStatus(base, logs, '2026-10-02').restCost
    expect(cost([rest('2026-09-27')])).toBe(0) // last week's rest doesn't count
    expect(cost([rest('2026-09-28')])).toBe(100)
    expect(cost([rest('2026-09-28'), rest('2026-09-29')])).toBe(200)
    expect(cost([rest('2026-09-28'), rest('2026-09-29'), rest('2026-09-30')])).toBeNull()
  })

  it('a rest day today is resting; done, quit and N-a-week habits have no rest to offer', () => {
    expect(todayStatus(base, [{ ...log('2026-10-02', 0), rest: true }], '2026-10-02')).toMatchObject({ resting: true, restCost: null })
    expect(todayStatus(base, [log('2026-10-02', 1)], '2026-10-02').restCost).toBeNull()
    expect(todayStatus({ ...base, kind: 'QUIT' }, [], '2026-10-02').restCost).toBeNull()
    const run: Habit = { ...base, frequencyType: 'X_TIMES_PER_WEEK', frequencyConfig: { timesPerWeek: 3 } }
    expect(todayStatus(run, [], '2026-10-02').restCost).toBeNull()
  })
})

describe('withTodayCount', () => {
  it('replaces today’s entry and keeps the rest', () => {
    const result = withTodayCount([log('2026-10-02', 1, 8), log('2026-10-01', 8, 8)], '2026-10-02', 4, 8)
    expect(result.map((entry) => [entry.date, entry.completedCount, entry.done])).toEqual([
      ['2026-10-02', 4, false],
      ['2026-10-01', 8, true],
    ])
  })

  it('adds today when there is no entry yet', () => {
    expect(withTodayCount([], '2026-10-02', 1, 1)).toEqual([{ id: -1, date: '2026-10-02', completedCount: 1, done: true }])
  })
})
