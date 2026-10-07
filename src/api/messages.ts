import { ApiError } from './errors'

/** Plain-language text for a failed sign-in, registration or password change. Branches on `errorCode`, never on the server's message. */
export function authErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.errorCode) {
      case 'AUTH_INVALID_CREDENTIALS':
        return "That email and password don't match. Check them and try again."
      case 'USER_EMAIL_TAKEN':
        return 'An account with this email already exists. Sign in instead.'
      case 'AUTH_INVALID_RESET_TOKEN':
        return 'This reset link has expired or was already used. Ask for a new one.'
      case 'AUTH_WRONG_PASSWORD':
        return "That isn't your current password."
      case 'AUTH_PASSWORD_NOT_SET':
        return 'This account has no password yet. Use “Forgot password” to set one.'
      case 'VALIDATION_FAILED':
        return 'Some details need fixing. Check the highlighted fields.'
    }
    if (error.status >= 500) return 'Something went wrong on our side. Try again in a moment.'
  }
  if (error instanceof TypeError) return "Can't reach the server. Check your connection and try again."
  return "That didn't work. Try again in a moment."
}

/** The server's per-field complaints, phrased with the field's name: "Email must not be blank". */
export function fieldError(error: unknown, field: string, label: string): string | undefined {
  if (!(error instanceof ApiError)) return undefined
  const message = error.fields?.[field]
  return message ? `${label} ${message}` : undefined
}

/** Plain-language text for a failed goal save, load or change. */
export function goalErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.errorCode) {
      case 'VALIDATION_FAILED':
        return 'Some details need fixing. Check the highlighted fields.'
      case 'GOAL_NOT_FOUND':
        return "This goal doesn't exist, or it isn't yours."
      case 'GOAL_ALREADY_CLOSED':
        return 'This goal is already achieved or abandoned.'
      case 'GOAL_NOT_ACTIVE':
        return 'Only an active goal can have habits linked to it.'
      case 'HABIT_ARCHIVED':
        return 'That habit is archived. Restore it before linking it.'
    }
  }
  return habitErrorMessage(error)
}

/** Plain-language text for a failed note, link or file save, load, upload or download. */
export function resourceErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.errorCode) {
      case 'RESOURCE_NOT_FOUND':
        return "This note or link doesn't exist, or it isn't yours."
      case 'FILE_EMPTY':
        return 'That file is empty. Choose another one.'
      case 'FILE_TOO_LARGE':
        return 'That file is over 10 MB. Choose a smaller one.'
      case 'FILE_QUOTA_EXCEEDED':
        return 'Your 100 MB of file storage is full. Delete a file to make room.'
      case 'FILE_TYPE_NOT_ALLOWED':
        return 'That kind of file isn’t allowed. Use PNG, JPEG, WebP, GIF, PDF, or a .txt or .md text file.'
      case 'FILE_NOT_FOUND':
        return 'This file is missing. Delete the entry and upload it again.'
      case 'RESOURCE_INVALID':
        // the server says which rule it broke ("A link needs a url"), in plain words already
        return error.message
    }
  }
  return goalErrorMessage(error)
}

/** Plain-language text for a failed habit save, load or archive. */
export function habitErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.errorCode) {
      case 'VALIDATION_FAILED':
        return 'Some details need fixing. Check the highlighted fields.'
      case 'HABIT_INVALID_FREQUENCY':
        return "That schedule doesn't work. Pick at least one day, or between 1 and 6 times a week."
      case 'HABIT_NOT_FOUND':
        return "This habit doesn't exist, or it isn't yours."
      case 'HABIT_ARCHIVED':
        return 'This habit is archived. Restore it to check in.'
      case 'LOG_DATE_OUT_OF_RANGE':
        return "That day can't be checked in."
    }
    if (error.status >= 500) return 'Something went wrong on our side. Try again in a moment.'
  }
  if (error instanceof TypeError) return "Can't reach the server. Check your connection and try again."
  return "That didn't work. Try again in a moment."
}
