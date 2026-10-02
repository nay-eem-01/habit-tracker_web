import type { HabitLog } from '../api/checkins'
import type { Habit } from '../api/habits'
import type { GridDay } from '../components/DayGrid'
import { formatDay, shiftDays, weekStart } from '../today/today'

/** Half a year: two pages of logs at most, inside the API's one-year range. */
export const HEATMAP_WEEKS = 26
export const TREND_WEEKS = 12

/** The heatmap's first day: the Monday `weeks - 1` weeks before this week's. */
export function heatmapStart(today: string, weeks = HEATMAP_WEEKS): string {
  return shiftDays(weekStart(today), -(weeks - 1) * 7)
}

function levelOf(log: HabitLog | undefined, target: number): GridDay['level'] {
  if (!log || log.completedCount <= 0) return 0
  if (log.done) return 4
  // part of a daily target: 1–3, never the full shade
  return Math.min(3, Math.max(1, Math.floor((log.completedCount / target) * 4))) as 1 | 2 | 3
}

/** One habit's days as heatmap weeks; days after today, or before the habit was made with nothing logged, are blank. */
export function habitHeatmap(habit: Habit, logs: HabitLog[], today: string, weeks = HEATMAP_WEEKS): GridDay[][] {
  const byDate = new Map(logs.map((log) => [log.date, log]))
  const created = habit.createdAt.slice(0, 10)
  const start = heatmapStart(today, weeks)
  return Array.from({ length: weeks }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => {
      const date = shiftDays(start, week * 7 + day)
      const log = byDate.get(date)
      const count = log?.completedCount ?? 0
      const what = habit.targetCount > 1 ? `${count} of ${habit.targetCount}` : log?.done ? 'done' : 'not done'
      return {
        date,
        level: levelOf(log, habit.targetCount),
        // a backdated check-in still shows, even from before the habit was made
        blank: date > today || (date < created && !log),
        title: `${formatDay(date)}: ${what}`,
      }
    }),
  )
}

/** Days the habit is meant to be done in a full week. */
export function weeklyGoal(habit: Habit): number {
  if (habit.frequencyType === 'SPECIFIC_DAYS') return habit.frequencyConfig?.days?.length ?? 0
  if (habit.frequencyType === 'X_TIMES_PER_WEEK') return habit.frequencyConfig?.timesPerWeek ?? 0
  return 7
}

export interface WeekTotal {
  /** The Monday the week starts on. */
  start: string
  done: number
}

/** Days done in each of the last `weeks` weeks, oldest first; the last one is this week, so far. */
export function weeklyTotals(logs: HabitLog[], today: string, weeks = TREND_WEEKS): WeekTotal[] {
  const first = heatmapStart(today, weeks)
  const totals = Array.from({ length: weeks }, (_, i) => ({ start: shiftDays(first, i * 7), done: 0 }))
  for (const log of logs) {
    if (!log.done || log.date < first || log.date > today) continue
    const index = Math.floor((Date.parse(log.date) - Date.parse(first)) / (7 * 86_400_000))
    totals[index].done += 1
  }
  return totals
}

/** "6 of 7 done", or "5 done, goal 3" when a habit went past what it needed. */
export function doneOf(done: number, expected: number): string {
  const goal = Math.round(expected)
  done = Math.round(done)
  return done > goal ? `${done} done, goal ${goal}` : `${done} of ${goal} done`
}
