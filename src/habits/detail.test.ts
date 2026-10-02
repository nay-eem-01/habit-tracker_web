import { describe, expect, it } from 'vitest'
import type { HabitLog } from '../api/checkins'
import type { Habit } from '../api/habits'
import { doneOf, habitHeatmap, heatmapStart, weeklyGoal, weeklyTotals } from './detail'

// Friday 2 October 2026; its week starts Monday 28 September
const today = '2026-10-02'
const log = (date: string, completedCount: number, done: boolean): HabitLog => ({ id: 1, date, completedCount, done })
const habit = (over: Partial<Habit> = {}): Habit => ({
  id: 1,
  name: 'Read',
  frequencyType: 'DAILY',
  frequencyConfig: null,
  targetCount: 1,
  archived: false,
  createdAt: '2026-09-29T08:00:00Z',
  ...over,
})

describe('the habit heatmap', () => {
  it('starts on a Monday 25 weeks before this one, inside the API one-year range', () => {
    expect(heatmapStart(today)).toBe('2026-04-06')
  })

  it('leaves out days before the habit existed and after today', () => {
    const week = habitHeatmap(habit(), [], today).at(-1)!
    expect(week.map((day) => day.blank)).toEqual([true, false, false, false, false, true, true])
  })

  it('still shows a check-in backdated to before the habit was made', () => {
    const [mon] = habitHeatmap(habit(), [log('2026-09-28', 1, true)], today).at(-1)!
    expect([mon.blank, mon.level]).toEqual([false, 4])
  })

  it('shades a full day darkest and part of a daily target lighter', () => {
    const water = habit({ targetCount: 8 })
    const logs = [log('2026-09-29', 8, true), log('2026-09-30', 4, false), log('2026-10-01', 1, false)]
    const [, tue, wed, thu, fri] = habitHeatmap(water, logs, today).at(-1)!
    expect([tue.level, wed.level, thu.level, fri.level]).toEqual([4, 2, 1, 0])
    expect(wed.title).toBe('Wed 30 Sept: 4 of 8')
  })
})

describe('the weekly trend', () => {
  it('counts days done in each week, oldest first, ending with this week', () => {
    const totals = weeklyTotals(
      [log('2026-10-02', 1, true), log('2026-09-28', 1, true), log('2026-09-27', 1, true), log('2026-09-26', 0, false)],
      today,
    )
    expect(totals).toHaveLength(12)
    expect(totals.at(-1)).toEqual({ start: '2026-09-28', done: 2 })
    expect(totals.at(-2)).toEqual({ start: '2026-09-21', done: 1 })
  })

  it('sets the goal by schedule', () => {
    expect(weeklyGoal(habit())).toBe(7)
    expect(weeklyGoal(habit({ frequencyType: 'SPECIFIC_DAYS', frequencyConfig: { days: ['MONDAY', 'FRIDAY'] } }))).toBe(2)
    expect(weeklyGoal(habit({ frequencyType: 'X_TIMES_PER_WEEK', frequencyConfig: { timesPerWeek: 3 } }))).toBe(3)
  })
})

describe('done against expected', () => {
  it('reads as a fraction, or as done-and-goal once past the goal', () => {
    expect(doneOf(6, 7)).toBe('6 of 7 done')
    expect(doneOf(6, 3)).toBe('6 done, goal 3')
    expect(doneOf(2, 2.6)).toBe('2 of 3 done')
    expect(doneOf(56.86, 73)).toBe('57 of 73 done')
  })
})
