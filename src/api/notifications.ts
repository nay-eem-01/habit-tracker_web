import { api } from './client'
import type { Page } from './habits'

export interface Notification {
  id: number
  type: 'HABIT_REMINDER'
  title: string
  body: string
  habitId?: number | null
  /** When it was read, or absent while unread. */
  readAt?: string | null
  createdAt: string
}

export const NOTIFICATIONS_PAGE_SIZE = 10

export function listNotifications(options: { page?: number; size?: number } = {}): Promise<Page<Notification>> {
  return api('/api/notifications', {
    params: { page: options.page ?? 0, size: options.size ?? NOTIFICATIONS_PAGE_SIZE },
  })
}

/** Cheap enough to poll. */
export function getUnreadCount(): Promise<{ unread: number }> {
  return api('/api/notifications/unread-count')
}

export function markRead(id: number): Promise<Notification> {
  return api(`/api/notifications/${id}/read`, { method: 'POST' })
}

export function markAllRead(): Promise<{ marked: number }> {
  return api('/api/notifications/read-all', { method: 'POST' })
}
