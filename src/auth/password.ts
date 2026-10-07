/** At least this long, like the server. */
export const MIN_PASSWORD = 8

/** Why the new password won't do, before it is sent; null when it's fine. */
export function newPasswordProblem(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`
  if (password !== confirm) return "The two passwords don't match."
  return null
}
