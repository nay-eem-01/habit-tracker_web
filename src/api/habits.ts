import { api } from './client'
import type { components } from './schema'

/** Request bodies come from the generated schema; the spec leaves response payloads untyped, so those are written here. */
export type HabitRequest = components['schemas']['HabitRequest']
export type FrequencyType = HabitRequest['frequencyType']
export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'

export interface FrequencyConfig {
  days?: DayOfWeek[] | null
  timesPerWeek?: number | null
}

export interface Habit {
  id: number
  name: string
  category?: string | null
  frequencyType: FrequencyType
  frequencyConfig?: FrequencyConfig | null
  targetCount: number
  /** HH:mm in the user's timezone, or absent for no reminder. */
  reminderTime?: string | null
  archived: boolean
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

export function listHabits(options: { archived: boolean; page: number }): Promise<Page<Habit>> {
  return api('/api/habits', { params: { archived: options.archived, page: options.page, size: HABITS_PAGE_SIZE } })
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
