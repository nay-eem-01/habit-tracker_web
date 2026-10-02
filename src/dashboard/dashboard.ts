import type { HabitLog, HabitStats, Streak, WindowStats } from '../api/checkins'
import type { Habit } from '../api/habits'
import { shiftDays, weekStart } from '../today/today'

export const ACTIVITY_WEEKS = 12

/** The first day of the activity grid: the Monday `ACTIVITY_WEEKS - 1` weeks before this week's. */
export function activityStart(today: string): string {
  return shiftDays(weekStart(today), -(ACTIVITY_WEEKS - 1) * 7)
}

export interface ActivityDay {
  date: string
  /** Habits finished that day. */
  done: number
  /** 0 (nothing) to 4 (everything), for shading. */
  level: 0 | 1 | 2 | 3 | 4
  future: boolean
}

function levelOf(done: number, habits: number): ActivityDay['level'] {
  if (done <= 0 || habits <= 0) return 0
  const share = Math.min(done / habits, 1)
  return share <= 0.25 ? 1 : share <= 0.5 ? 2 : share < 1 ? 3 : 4
}

/** Weeks as columns, Monday first: each day with how many habits were finished and a shade for it. */
export function activityWeeks(logsByHabit: HabitLog[][], habitCount: number, today: string): ActivityDay[][] {
  const doneByDate = new Map<string, number>()
  for (const logs of logsByHabit) {
    for (const log of logs) if (log.done) doneByDate.set(log.date, (doneByDate.get(log.date) ?? 0) + 1)
  }
  const start = activityStart(today)
  return Array.from({ length: ACTIVITY_WEEKS }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => {
      const date = shiftDays(start, week * 7 + day)
      const done = doneByDate.get(date) ?? 0
      return { date, done, level: levelOf(done, habitCount), future: date > today }
    }),
  )
}

/** Completion over a window, across every habit: all the days done against all the days expected. */
export function combineWindows(windows: WindowStats[]): { done: number; expected: number; rate: number | null } {
  const done = windows.reduce((sum, w) => sum + w.done, 0)
  const expected = windows.reduce((sum, w) => sum + w.expected, 0)
  return { done, expected, rate: expected > 0 ? Math.min(done / expected, 1) : null }
}

export function combineStats(stats: HabitStats[]) {
  return { last7: combineWindows(stats.map((s) => s.last7Days)), last30: combineWindows(stats.map((s) => s.last30Days)) }
}

export interface StreakEntry {
  habit: Habit
  streak: Streak
}

/** The habits on the longest current runs. Day streaks and week streaks aren't comparable, so days come first. */
export function topStreaks(entries: StreakEntry[], limit = 3): StreakEntry[] {
  return entries
    .filter((entry) => entry.streak.current > 0)
    .sort((a, b) => {
      const unit = Number(a.streak.unit === 'WEEKS') - Number(b.streak.unit === 'WEEKS')
      return unit || b.streak.current - a.streak.current || a.habit.name.localeCompare(b.habit.name)
    })
    .slice(0, limit)
}
