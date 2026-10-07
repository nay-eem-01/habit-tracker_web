import { FILE_EXTENSIONS, FILE_MAX_BYTES, type Resource, type ResourceRequest, type ResourceType } from '../api/resources'

/** Everything the resource form edits; an empty goal is "no goal". `file` is the one picked to upload. */
export interface ResourceFormValues {
  type: ResourceType
  file: File | null
  title: string
  body: string
  url: string
  goalId: string
  pinned: boolean
}

export function emptyResource(type: ResourceType = 'NOTE', goalId = ''): ResourceFormValues {
  return { type, file: null, title: '', body: '', url: '', goalId, pinned: false }
}

export function valuesFromResource(resource: Resource): ResourceFormValues {
  return {
    type: resource.type,
    file: null,
    title: resource.title,
    body: resource.body ?? '',
    url: resource.url ?? '',
    goalId: resource.goalId == null ? '' : String(resource.goalId),
    pinned: resource.pinned,
  }
}

/**
 * The body for create and the full-replace PUT. Only a link sends a url (the server refuses one on
 * a note or file); an empty comment and a missing goal are left out, which clears them.
 */
export function toResourceRequest(values: ResourceFormValues): ResourceRequest {
  const request: ResourceRequest = { type: values.type, title: values.title.trim(), pinned: values.pinned }
  const body = values.body.trim()
  if (body) request.body = body
  if (values.type === 'LINK') request.url = values.url.trim()
  if (values.goalId) request.goalId = Number(values.goalId)
  return request
}

/** The address, only if it is http(s): anything else is never made clickable. */
export function safeHref(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null
  } catch {
    return null
  }
}

/** "example.com" for a link's subtitle; the raw text when it can't be parsed. */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** Where to go after a save or cancel: a path inside the app from `?back=`, else the fallback. */
export function backPath(back: string | null, fallback: string): string {
  return back && back.startsWith('/') && !back.startsWith('//') ? back : fallback
}

/** "820 B", "48 KB", "2.4 MB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Why the server would refuse this file, checked before uploading it; null when it looks fine. */
export function fileProblem(file: File): string | null {
  const extension = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : ''
  if (!(FILE_EXTENSIONS as readonly string[]).includes(extension)) {
    return 'Use a PNG, JPEG, WebP, GIF, PDF, or a .txt or .md text file.'
  }
  if (file.size === 0) return 'That file is empty.'
  if (file.size > FILE_MAX_BYTES) return `That file is ${formatBytes(file.size)}; the limit is 10 MB.`
  return null
}

/** "Week 1 plan" from "Week 1 plan.pdf", as a first title. */
export function titleFromFileName(name: string): string {
  const dot = name.lastIndexOf('.')
  return (dot > 0 ? name.slice(0, dot) : name).slice(0, 200)
}

/** The server only stores these image types, so they are safe to show inline. */
export function isImage(contentType: string | undefined): boolean {
  return ['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(contentType ?? '')
}

/** Hands a downloaded file to the browser to save, under its own name. */
export function saveBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  // give the browser a moment to start the download before the address goes away
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
