import type { Goal, GoalRequest } from '../api/goals'

/** Everything the goal form edits; an empty date is no deadline. */
export interface GoalFormValues {
  title: string
  description: string
  targetDate: string
}

export const EMPTY_GOAL: GoalFormValues = { title: '', description: '', targetDate: '' }

export function valuesFromGoal(goal: Goal): GoalFormValues {
  return { title: goal.title, description: goal.description ?? '', targetDate: goal.targetDate ?? '' }
}

/** The body for create and for the full-replace PUT; an empty description or date is left out, which clears it. */
export function toGoalRequest(values: GoalFormValues): GoalRequest {
  const request: GoalRequest = { title: values.title.trim() }
  const description = values.description.trim()
  if (description) request.description = description
  if (values.targetDate) request.targetDate = values.targetDate
  return request
}

/** "31 Dec 2026": a goal's date can be a long way off, so it keeps the year. */
export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(`${date}T00:00:00Z`),
  )
}

/** "3 Oct 2026" for a moment, on the user's calendar. */
export function formatInstant(instant: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: timezone, day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(instant),
  )
}

/** Whole days from one YYYY-MM-DD to another (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

export interface Deadline {
  text: string
  /** Past the date and still active. */
  overdue: boolean
}

/**
 * The deadline in words, counted from `today`: "By 31 Dec 2026 · 90 days left", "Due today",
 * "2 days overdue". A closed goal only says what the date was. Null without a date.
 */
export function deadline(goal: Pick<Goal, 'targetDate' | 'status'>, today: string): Deadline | null {
  if (!goal.targetDate) return null
  const by = formatDate(goal.targetDate)
  if (goal.status !== 'ACTIVE') return { text: `Target was ${by}`, overdue: false }
  const left = daysBetween(today, goal.targetDate)
  if (left === 0) return { text: `Due today, ${by}`, overdue: false }
  if (left < 0) return { text: `By ${by} · ${-left} day${left === -1 ? '' : 's'} overdue`, overdue: true }
  return { text: `By ${by} · ${left} day${left === 1 ? '' : 's'} left`, overdue: false }
}
