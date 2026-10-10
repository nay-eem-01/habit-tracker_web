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
