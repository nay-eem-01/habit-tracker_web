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

/** One status, or every goal when `status` is left out. */
export function listGoals(options: { status?: GoalStatus; page: number; size?: number }): Promise<Page<Goal>> {
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

/** Marks it achieved; repeating is fine, but an abandoned goal can't be (GOAL_ALREADY_CLOSED). */
export function achieveGoal(id: number): Promise<Goal> {
  return api(`/api/goals/${id}/achieve`, { method: 'POST' })
}

/** Gives it up; its habits stay linked. An achieved goal can't be (GOAL_ALREADY_CLOSED). */
export function abandonGoal(id: number): Promise<Goal> {
  return api(`/api/goals/${id}/abandon`, { method: 'POST' })
}

/** One linked habit's share of its goal. */
export interface HabitGoalProgress {
  habitId: number
  name: string
  /** Archived habits are listed but don't count toward the goal's percent. */
  archived: boolean
  /** The day it was linked; done days count from then on. */
  linkedOn: string
  doneDays: number
  goalTargetDays: number
  /** 0–100, capped at 100. */
  percent: number
}

export interface GoalProgress {
  goalId: number
  /** 0–100: the average over the linked habits that aren't archived; 0 with none. */
  percent: number
  habits: HabitGoalProgress[]
}

export function getGoalProgress(id: number): Promise<GoalProgress> {
  return api(`/api/goals/${id}/progress`)
}
