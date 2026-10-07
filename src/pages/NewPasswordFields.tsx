import { MIN_PASSWORD } from '../auth/password'
import { Field } from '../components/Field'

interface NewPasswordFieldsProps {
  password: string
  confirm: string
  onPassword: (value: string) => void
  onConfirm: (value: string) => void
  /** The server's complaint about the new password, if any. */
  error?: string
  /** Shown once a submit was attempted, so typing isn't scolded early. */
  problem: string | null
}

/** New password twice, so a typo can't lock anyone out. */
export function NewPasswordFields({ password, confirm, onPassword, onConfirm, error, problem }: NewPasswordFieldsProps) {
  const mismatch = problem !== null && problem.includes("don't match")
  return (
    <>
      <Field
        label="New password"
        type="password"
        autoComplete="new-password"
        required
        minLength={MIN_PASSWORD}
        maxLength={100}
        hint={`At least ${MIN_PASSWORD} characters.`}
        value={password}
        onChange={(event) => onPassword(event.target.value)}
        error={error ?? (problem && !mismatch ? problem : undefined)}
      />
      <Field
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        required
        maxLength={100}
        value={confirm}
        onChange={(event) => onConfirm(event.target.value)}
        error={mismatch ? problem : undefined}
      />
    </>
  )
}
