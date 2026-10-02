import { api } from './client'
import type { Page } from './habits'
import type { components } from './schema'

export type ResourceRequest = components['schemas']['ResourceRequest']
export type ResourceType = ResourceRequest['type']

/** A Markdown note or a link the user keeps, on its own or next to a goal. */
export interface Resource {
  id: number
  type: ResourceType
  title: string
  /** Markdown: the note itself, or an optional comment on a link. */
  body?: string | null
  /** http(s) address; links only. */
  url?: string | null
  goalId?: number | null
  pinned: boolean
  createdAt: string
}

export const RESOURCES_PAGE_SIZE = 20

/** Pinned first, then newest. `q` matches the title, any case. */
export function listResources(options: {
  type?: ResourceType
  q?: string
  goalId?: number
  page: number
  size?: number
}): Promise<Page<Resource>> {
  return api('/api/resources', {
    params: {
      type: options.type,
      q: options.q || undefined,
      goalId: options.goalId,
      page: options.page,
      size: options.size ?? RESOURCES_PAGE_SIZE,
    },
  })
}

/** A goal's resources, pinned first, then newest. */
export function listGoalResources(goalId: number, options: { page: number; size?: number }): Promise<Page<Resource>> {
  return api(`/api/goals/${goalId}/resources`, {
    params: { page: options.page, size: options.size ?? RESOURCES_PAGE_SIZE },
  })
}

export function getResource(id: number): Promise<Resource> {
  return api(`/api/resources/${id}`)
}

export function createResource(request: ResourceRequest): Promise<Resource> {
  return api('/api/resources', { method: 'POST', body: request })
}

/** A full replace; a field left out is cleared. */
export function updateResource(id: number, request: ResourceRequest): Promise<Resource> {
  return api(`/api/resources/${id}`, { method: 'PUT', body: request })
}

export function pinResource(id: number, pinned: boolean): Promise<Resource> {
  return api(`/api/resources/${id}/${pinned ? 'pin' : 'unpin'}`, { method: 'POST' })
}

/** Gone for good: there is no archive for resources. */
export function deleteResource(id: number): Promise<void> {
  return api(`/api/resources/${id}`, { method: 'DELETE' })
}
