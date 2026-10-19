import { api, apiBlob, type AuthUser } from './client'
import type { components } from './schema'

export type ProfileRequest = components['schemas']['UpdateProfileRequest']

/** Replaces name, timezone and the promotional-email choice; answers with the updated user. */
export function updateProfile(request: ProfileRequest): Promise<AuthUser> {
  return api('/api/me', { method: 'PUT', body: request })
}

/** Everything the account holds, as one JSON file. */
export function exportData(): Promise<Blob> {
  return apiBlob('/api/me/export')
}

/** Deletes the account and everything in it. The password is checked when the account has one. */
export function deleteAccount(password: string): Promise<void> {
  return api('/api/me', { method: 'DELETE', body: password ? { password } : {} })
}

/** The profile picture's bytes (a JPEG). Fetched with the token, so it can't be a plain <img src>. */
export function getAvatar(): Promise<Blob> {
  return apiBlob('/api/me/avatar')
}

/** Sets the profile picture; answers with the user, whose `avatarUpdatedAt` is new. */
export function setAvatar(picture: Blob): Promise<AuthUser> {
  const form = new FormData()
  form.append('file', picture, 'avatar.jpg')
  return api('/api/me/avatar', { method: 'PUT', body: form })
}

/** Removes the profile picture; initials show again. Fine when there was none. */
export function deleteAvatar(): Promise<void> {
  return api('/api/me/avatar', { method: 'DELETE' })
}
