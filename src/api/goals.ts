import { api } from './client'
import type { Page } from './habits'
import type { components } from './schema'

export type GoalRequest = components['schemas']['GoalRequest']

/** The user decides when a goal moves on; reaching 100% doesn't close it. */
export type GoalStatus = 'ACTIVE' | 'ACHIEVED' | 'ABANDONED'

export interface Goal {
  id: number
  title: string
  description?: string | null
  /** "By when", YYYY-MM-DD in the user's timezone, or absent for no deadline. */
  targetDate?: string | null
  status: GoalStatus
  /** When it was marked achieved; absent otherwise. */
  achievedAt?: string | null
  createdAt: string
}

export const GOALS_PAGE_SIZE = 20

export function listGoals(options: { status: GoalStatus; page: number; size?: number }): Promise<Page<Goal>> {
  return api('/api/goals', {
    params: { status: options.status, page: options.page, size: options.size ?? GOALS_PAGE_SIZE },
  })
}

export function getGoal(id: number): Promise<Goal> {
  return api(`/api/goals/${id}`)
}

export function createGoal(request: GoalRequest): Promise<Goal> {
  return api('/api/goals', { method: 'POST', body: request })
}

/** A full replace of title, description and target date; a field left out is cleared. */
export function updateGoal(id: number, request: GoalRequest): Promise<Goal> {
  return api(`/api/goals/${id}`, { method: 'PUT', body: request })
}
