import { api } from './client'
import type { components } from './schema'

/** Request bodies come from the generated schema; the spec leaves response payloads untyped, so those are written here. */
export type HabitRequest = components['schemas']['HabitRequest']
export type GoalLinkRequest = components['schemas']['GoalLinkRequest']
export type FrequencyType = HabitRequest['frequencyType']
/** BUILD: check in when done. QUIT: check in when you slip. Fixed at creation. */
export type HabitKind = NonNullable<HabitRequest['kind']>
export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'

export interface FrequencyConfig {
  days?: DayOfWeek[] | null
  timesPerWeek?: number | null
}

export interface Habit {
  id: number
  name: string
  category?: string | null
  /** Absent on old fixtures; the server always sends it. */
  kind?: HabitKind
  frequencyType: FrequencyType
  frequencyConfig?: FrequencyConfig | null
  targetCount: number
  /** What is counted, shown with the target: "8 glasses". */
  unit?: string | null
  /** HH:mm in the user's timezone, or absent for no reminder. */
  reminderTime?: string | null
  archived: boolean
  /** The goal it is linked to, and the done days that make it "built" for that goal. */
  goalId?: number | null
  goalTargetDays?: number | null
  createdAt: string
}

export interface Page<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export const HABITS_PAGE_SIZE = 20

export function listHabits(options: { archived: boolean; page: number; size?: number }): Promise<Page<Habit>> {
  return api('/api/habits', {
    params: { archived: options.archived, page: options.page, size: options.size ?? HABITS_PAGE_SIZE },
  })
}

export function getHabit(id: number): Promise<Habit> {
  return api(`/api/habits/${id}`)
}

export function createHabit(request: HabitRequest): Promise<Habit> {
  return api('/api/habits', { method: 'POST', body: request })
}

/** A full replace: every field of the request, as on create. */
export function updateHabit(id: number, request: HabitRequest): Promise<Habit> {
  return api(`/api/habits/${id}`, { method: 'PUT', body: request })
}

export function archiveHabit(id: number): Promise<Habit> {
  return api(`/api/habits/${id}/archive`, { method: 'POST' })
}

export function unarchiveHabit(id: number): Promise<Habit> {
  return api(`/api/habits/${id}/unarchive`, { method: 'POST' })
}

/** Links to an active goal, or changes the target of the current link. Moves it off any other goal. */
export function linkGoal(id: number, request: GoalLinkRequest): Promise<Habit> {
  return api(`/api/habits/${id}/goal`, { method: 'PUT', body: request })
}

export function unlinkGoal(id: number): Promise<Habit> {
  return api(`/api/habits/${id}/goal`, { method: 'DELETE' })
}

/** Gone for good, with its check-ins and the XP and goal progress they earned. Archive keeps them. */
export function deleteHabit(id: number): Promise<void> {
  return api(`/api/habits/${id}`, { method: 'DELETE' })
}
