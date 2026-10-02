import { api } from './client'
import type { Page } from './habits'
import type { components } from './schema'

export type CheckInRequest = components['schemas']['CheckInRequest']

export interface HabitLog {
  id: number
  /** The user's calendar day, YYYY-MM-DD. */
  date: string
  completedCount: number
  /** The day's count reached the habit's target. */
  done: boolean
  note?: string | null
}

export interface Streak {
  current: number
  longest: number
  /** Days for daily and weekday habits; Monday–Sunday weeks for N-times-a-week ones. */
  unit: 'DAYS' | 'WEEKS'
}

/** Sets the day's total (not +1): today unless `date` is given; 0 undoes. Safe to repeat. */
export function checkIn(habitId: number, request: CheckInRequest): Promise<HabitLog> {
  return api(`/api/habits/${habitId}/checkin`, { method: 'POST', body: request })
}

/** Completion over the last `days` days. `rate` is 0–1, or null when nothing was expected yet. */
export interface WindowStats {
  days: number
  done: number
  expected: number
  rate: number | null
}

export interface HabitStats {
  last7Days: WindowStats
  last30Days: WindowStats
}

/** Logs from `from` up to today (the server's idea of today, in the user's timezone), newest first. */
export function listLogs(
  habitId: number,
  options: { from: string; page?: number; size?: number },
): Promise<Page<HabitLog>> {
  return api(`/api/habits/${habitId}/logs`, {
    params: { from: options.from, page: options.page, size: options.size ?? 10 },
  })
}

export function getStats(habitId: number): Promise<HabitStats> {
  return api(`/api/habits/${habitId}/stats`)
}

export function getStreak(habitId: number): Promise<Streak> {
  return api(`/api/habits/${habitId}/streak`)
}
