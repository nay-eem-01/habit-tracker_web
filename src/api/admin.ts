import { api } from './client'
import type { Page } from './habits'

export interface DayCount {
  /** YYYY-MM-DD. */
  date: string
  count: number
}

export interface AdminStats {
  users: { total: number; verified: number; withGoogle: number; pro: number; suspended: number; signUps: DayCount[] }
  /** Distinct users who logged anything in the last 24 hours / 7 / 30 days. */
  active: { day: number; week: number; month: number }
  usage: { activeHabits: number; activeGoals: number; pushUsers: number; freeUsersAtLimit: number; checkIns: DayCount[] }
  /** Counted in memory since `since`; a server restart sets them back to zero. */
  delivery: { since: string; emailsSent: number; emailsFailed: number; pushesSent: number; pushesGone: number; pushesFailed: number }
}

export type Plan = 'FREE' | 'PRO'

export interface AdminUser {
  id: number
  email: string
  name: string
  authProvider: 'LOCAL' | 'GOOGLE'
  emailVerified: boolean
  plan: Plan
  role: 'USER' | 'ADMIN'
  suspendedAt?: string | null
  createdAt: string
}

/** Counts only: no habit names, notes or links, by design. */
export interface AdminUserDetail {
  user: AdminUser
  activeHabits: number
  archivedHabits: number
  checkIns: number
  goals: number
  lastActiveAt?: string | null
  pushSubscriptions: number
}

export interface UserQuery {
  q?: string
  page?: number
  size?: number
  sortBy?: 'createdAt' | 'email'
  sortDir?: 'asc' | 'desc'
}

export function getAdminStats(): Promise<AdminStats> {
  return api('/api/admin/stats')
}

export function listAdminUsers(query: UserQuery): Promise<Page<AdminUser>> {
  return api('/api/admin/users', { params: { ...query, q: query.q || undefined } })
}

export function getAdminUser(id: number): Promise<AdminUserDetail> {
  return api(`/api/admin/users/${id}`)
}

export function changePlan(id: number, plan: Plan): Promise<AdminUser> {
  return api(`/api/admin/users/${id}/plan`, { method: 'PUT', body: { plan } })
}

export function suspendUser(id: number, suspend: boolean): Promise<AdminUser> {
  return api(`/api/admin/users/${id}/${suspend ? 'suspend' : 'unsuspend'}`, { method: 'POST' })
}

export function deleteUser(id: number): Promise<void> {
  return api(`/api/admin/users/${id}`, { method: 'DELETE' })
}
