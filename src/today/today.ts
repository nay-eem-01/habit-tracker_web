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

/** A day moved by whole days (negative goes back). */
export function shiftDays(date: string, days: number): string {
  const d = parse(date)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** "Fri 2 Oct", for a row in a history list. */
export function formatDay(date: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' })
    .format(parse(date))
    .replace(',', '')
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
  /** Today is a rest day: the streak holds without a check-in. */
  resting: boolean
  /** XP a rest today would cost, or null when this habit can't rest today. */
  restCost: number | null
}

/** The 1st, 2nd and 3rd rest day of a habit's Monday–Sunday week; there is no 4th. Mirrors the server. */
const REST_COST = [0, 100, 200]

/** What today looks like for one habit, from its logs since the start of the week. */
export function todayStatus(habit: Habit, logs: HabitLog[], today: string): TodayStatus {
  const log = logs.find((entry) => entry.date === today)
  const count = log?.completedCount ?? 0
  const start = weekStart(today)
  const status: TodayStatus = {
    due: true,
    count,
    target: habit.targetCount,
    done: count >= habit.targetCount,
    resting: Boolean(log?.rest),
    restCost: null,
  }
  // only daily and chosen-weekday build habits rest; an N-a-week one already has its slack
  if (habit.kind !== 'QUIT' && habit.frequencyType !== 'X_TIMES_PER_WEEK' && !status.done && !status.resting) {
    const rests = logs.filter((entry) => entry.rest && entry.date >= start && entry.date <= today).length
    status.restCost = REST_COST[rests] ?? null
  }
  if (habit.frequencyType === 'SPECIFIC_DAYS') {
    status.due = habit.frequencyConfig?.days?.includes(weekdayOf(today)) ?? false
  } else if (habit.frequencyType === 'X_TIMES_PER_WEEK') {
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
