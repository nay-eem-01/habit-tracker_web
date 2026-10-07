import { api } from './client'
import type { DayOfWeek, FrequencyType } from './habits'
import type { Level } from './level'

/** Days for daily and weekday habits; Monday–Sunday weeks for N-a-week ones. */
export type StreakUnit = 'DAYS' | 'WEEKS'

/** One window and the same-length window just before it. Rates are 0–1, null when nothing was expected. */
export interface Period {
  days: number
  done: number
  expected: number
  rate: number | null
  previousRate: number | null
  /** rate − previousRate; null when either is null. */
  change: number | null
}

export interface TodayHabit {
  habitId: number
  name: string
  category?: string | null
  frequencyType: FrequencyType
  targetCount: number
  completedCount: number
  done: boolean
  due: boolean
  /** N-a-week only: done days this week, today included. */
  doneThisWeek?: number | null
  timesPerWeek?: number | null
  streak: number
  streakUnit: StreakUnit
}

export interface AtRiskHabit {
  habitId: number
  name: string
  streak: number
  streakUnit: StreakUnit
  /** Check-ins still needed: 1 for a daily habit, this week's remaining for N-a-week. */
  needed: number
}

export interface HabitRate {
  habitId: number
  name: string
  /** 30-day rate, 0–1. */
  rate: number | null
  /** Against the 30 days before; null with nothing to compare. */
  change: number | null
}

export interface GoalSummary {
  goalId: number
  title: string
  targetDate?: string | null
  percent: number
}

/** The home screen in one call: active habits only, in the user's timezone. */
export interface Dashboard {
  today: { date: string; due: number; done: number; habits: TodayHabit[] }
  completion: {
    last7Days: Period
    last30Days: Period
    last90Days: Period
    habits: { habitId: number; name: string; last7Days: Period; last30Days: Period; last90Days: Period }[]
  }
  /** Streaks of 3+ that end unless something happens today; longest first. */
  atRisk: AtRiskHabit[]
  best: HabitRate[]
  slipping: HabitRate[]
  /** Active goals, oldest first. */
  goals: GoalSummary[]
  level: Level
}

export interface HeatmapDay {
  date: string
  done: number
  expected: number
  /** done / expected; null when nothing was expected. */
  ratio: number | null
}

export interface WeekdayRate {
  day: DayOfWeek
  done: number
  expected: number
  rate: number | null
}

export interface Patterns {
  /** The last 365 days, oldest first, today included. */
  heatmap: HeatmapDay[]
  /** Monday to Sunday over the last 12 full weeks. */
  weekdays: WeekdayRate[]
  weakestDay: DayOfWeek | null
  strongestDay: DayOfWeek | null
  /** Done check-ins of the last 90 days by the hour (0–23) of the first check-in. */
  hours: number[]
  peakHour: number | null
}

export function getDashboard(): Promise<Dashboard> {
  return api('/api/dashboard')
}

export function getPatterns(): Promise<Patterns> {
  return api('/api/dashboard/patterns')
}
