import { api, apiBlob } from './client'
import type { Page } from './habits'
import type { components } from './schema'

export type ResourceRequest = components['schemas']['ResourceRequest']
export type ResourceType = ResourceRequest['type']

/** What the client shows about an uploaded file; the bytes come from {@link downloadResourceFile}. */
export interface FileInfo {
  name: string
  /** Detected by the server from the bytes. */
  contentType: string
  sizeBytes: number
}

/** A Markdown note, a link or an uploaded file the user keeps, on its own or next to a goal. */
export interface Resource {
  id: number
  type: ResourceType
  title: string
  /** Markdown: the note itself, or an optional comment on a link or file. */
  body?: string | null
  /** http(s) address; links only. */
  url?: string | null
  /** FILE only. */
  file?: FileInfo | null
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

/** Notes and links; a file goes through {@link uploadResourceFile}. */
export function createResource(request: ResourceRequest): Promise<Resource> {
  return api('/api/resources', { method: 'POST', body: request })
}

/** A full replace; a field left out is cleared. A FILE keeps its file and stays a FILE. */
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

/** What the server takes; it checks the bytes too, these only save a doomed upload. */
export const FILE_MAX_BYTES = 10 * 1024 * 1024
export const FILE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'pdf', 'txt', 'md'] as const

export interface FileUpload {
  file: File
  title: string
  body?: string
  goalId?: number
  pinned: boolean
}

/** Multipart: the `file` part plus the other fields as form fields. */
export function uploadResourceFile(upload: FileUpload): Promise<Resource> {
  const form = new FormData()
  form.append('file', upload.file)
  form.append('title', upload.title)
  if (upload.body) form.append('body', upload.body)
  if (upload.goalId !== undefined) form.append('goalId', String(upload.goalId))
  form.append('pinned', String(upload.pinned))
  return api('/api/resources/files', { method: 'POST', body: form })
}

/** The file's bytes. It needs the bearer token, so a plain link can't fetch it. */
export function downloadResourceFile(id: number): Promise<Blob> {
  return apiBlob(`/api/resources/${id}/file`)
}
