import type { Resource, ResourceRequest, ResourceType } from '../api/resources'

/** Everything the resource form edits; an empty goal is "no goal". */
export interface ResourceFormValues {
  type: ResourceType
  title: string
  body: string
  url: string
  goalId: string
  pinned: boolean
}

export function emptyResource(type: ResourceType = 'NOTE', goalId = ''): ResourceFormValues {
  return { type, title: '', body: '', url: '', goalId, pinned: false }
}

export function valuesFromResource(resource: Resource): ResourceFormValues {
  return {
    type: resource.type,
    title: resource.title,
    body: resource.body ?? '',
    url: resource.url ?? '',
    goalId: resource.goalId == null ? '' : String(resource.goalId),
    pinned: resource.pinned,
  }
}

/**
 * The body for create and the full-replace PUT. A note never sends a url (the server refuses one);
 * a link's comment and a missing goal are left out, which clears them.
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
