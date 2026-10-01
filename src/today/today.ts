import type { DayOfWeek, Habit } from '../api/habits'
import type { HabitLog } from '../api/checkins'

const DAYS: DayOfWeek[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']

/** The calendar day (YYYY-MM-DD) it is right now in an IANA timezone. */
export function todayIn(timezone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

/** "Friday 2 October", for the heading. */
export function formatToday(timezone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: timezone, weekday: 'long', day: 'numeric', month: 'long' })
    .format(now)
    .replace(',', '')
}

function parse(date: string): Date {
  return new Date(`${date}T00:00:00Z`)
}

export function weekdayOf(date: string): DayOfWeek {
  return DAYS[parse(date).getUTCDay()]
}

/** The Monday of the week a day is in — the backend's weeks run Monday to Sunday. */
export function weekStart(date: string): string {
  const d = parse(date)
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}

export interface TodayStatus {
  /** Scheduled for today (N-times-a-week habits are open every day of the week). */
  due: boolean
  count: number
  target: number
  done: boolean
  /** For N-times-a-week habits: days done so far this week against the weekly goal. */
  week?: { done: number; goal: number }
}

/** What today looks like for one habit, from its logs since the start of the week. */
export function todayStatus(habit: Habit, logs: HabitLog[], today: string): TodayStatus {
  const count = logs.find((log) => log.date === today)?.completedCount ?? 0
  const status: TodayStatus = {
    due: true,
    count,
    target: habit.targetCount,
    done: count >= habit.targetCount,
  }
  if (habit.frequencyType === 'SPECIFIC_DAYS') {
    status.due = habit.frequencyConfig?.days?.includes(weekdayOf(today)) ?? false
  } else if (habit.frequencyType === 'X_TIMES_PER_WEEK') {
    const start = weekStart(today)
    status.week = {
      done: logs.filter((log) => log.done && log.date >= start && log.date <= today).length,
      goal: habit.frequencyConfig?.timesPerWeek ?? 0,
    }
  }
  return status
}

/** The week's logs with today's count replaced, for showing a tap before the server answers. */
export function withTodayCount(logs: HabitLog[], today: string, count: number, target: number): HabitLog[] {
  const rest = logs.filter((log) => log.date !== today)
  return [{ id: -1, date: today, completedCount: count, done: count >= target }, ...rest]
}
