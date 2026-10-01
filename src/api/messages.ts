import { ApiError } from './errors'

/** Plain-language text for a failed sign-in or registration. Branches on `errorCode`, never on the server's message. */
export function authErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.errorCode) {
      case 'AUTH_INVALID_CREDENTIALS':
        return "That email and password don't match. Check them and try again."
      case 'USER_EMAIL_TAKEN':
        return 'An account with this email already exists. Sign in instead.'
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
