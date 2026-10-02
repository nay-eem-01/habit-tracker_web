import { describe, expect, it } from 'vitest'
import type { HabitLog, WindowStats } from '../api/checkins'
import type { Habit } from '../api/habits'
import { activityStart, activityWeeks, combineWindows, topStreaks } from './dashboard'

const log = (date: string, done = true): HabitLog => ({ id: 1, date, completedCount: done ? 1 : 0, done })
const win = (done: number, expected: number): WindowStats => ({ days: 7, done, expected, rate: null })
const habit = (id: number, name: string) => ({ id, name }) as Habit

describe('the activity grid', () => {
  // Friday 2 October 2026; its week starts Monday 28 September
  const today = '2026-10-02'

  it('starts on a Monday, eleven weeks before this week', () => {
    expect(activityStart(today)).toBe('2026-07-13')
  })

  it('has twelve week columns of seven days, ending on the current week', () => {
    const weeks = activityWeeks([], 1, today)
    expect(weeks).toHaveLength(12)
    expect(weeks.every((week) => week.length === 7)).toBe(true)
    expect(weeks[11][0].date).toBe('2026-09-28')
    expect(weeks[11].filter((day) => day.future).map((day) => day.date)).toEqual(['2026-10-03', '2026-10-04'])
  })

  it('shades a day by the share of habits finished, and ignores logs that were not done', () => {
    const weeks = activityWeeks(
      [[log('2026-09-28'), log('2026-09-29'), log('2026-09-30', false)], [log('2026-09-28')], [log('2026-09-28')], [log('2026-09-28')]],
      4,
      today,
    )
    const [mon, tue, wed] = weeks[11]
    expect([mon.done, mon.level]).toEqual([4, 4])
    expect([tue.done, tue.level]).toEqual([1, 1])
    expect([wed.done, wed.level]).toEqual([0, 0])
  })
})

describe('completion across habits', () => {
  it('adds the days done and the days expected, not the rates', () => {
    expect(combineWindows([win(7, 7), win(1, 3)])).toEqual({ done: 8, expected: 10, rate: 0.8 })
  })

  it("doesn't let extra days on one habit cover for missed days on another", () => {
    expect(combineWindows([win(6, 3), win(0, 7)])).toEqual({ done: 3, expected: 10, rate: 0.3 })
  })

  it('has no rate while nothing was expected', () => {
    expect(combineWindows([win(0, 0)]).rate).toBeNull()
    expect(combineWindows([]).rate).toBeNull()
  })
})

describe('the longest streaks', () => {
  const entry = (id: number, current: number, unit: 'DAYS' | 'WEEKS' = 'DAYS') => ({
    habit: habit(id, `H${id}`),
    streak: { current, longest: current, unit },
  })

  it('leaves out habits with no streak, longest first, three at most', () => {
    const top = topStreaks([entry(1, 0), entry(2, 5), entry(3, 12), entry(4, 1), entry(5, 7)])
    expect(top.map((e) => e.habit.id)).toEqual([3, 5, 2])
  })

  it('puts day streaks ahead of week streaks, which are not comparable', () => {
    const top = topStreaks([entry(1, 20, 'WEEKS'), entry(2, 3)])
    expect(top.map((e) => e.habit.id)).toEqual([2, 1])
  })
})
