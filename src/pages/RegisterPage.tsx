import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { register } from '../api/auth'
import { ApiError } from '../api/errors'
import { authErrorMessage, fieldError } from '../api/messages'
import { useAuth } from '../auth/context'
import { AuthLayout } from '../components/AuthLayout'
import { Button } from '../components/Button'
import { Field } from '../components/Field'

/** Check-ins and reminders follow the user's own calendar day, so their timezone is part of sign-up. */
function browserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

export default function RegisterPage() {
  const { signIn } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const mutation = useMutation({
    mutationFn: () => register({ name: name.trim(), email: email.trim(), password, timezone: browserTimezone() }),
    onSuccess: signIn,
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    mutation.mutate()
  }

  const emailTaken = mutation.error instanceof ApiError && mutation.error.errorCode === 'USER_EMAIL_TAKEN'

  return (
    <AuthLayout title="Create your account" intro="Track habits, keep streaks, get reminded.">
      <form onSubmit={submit} className="flex flex-col gap-5">
        <Field
          label="Name"
          autoComplete="name"
          required
          minLength={2}
          maxLength={100}
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={fieldError(mutation.error, 'name', 'Name')}
        />
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldError(mutation.error, 'email', 'Email')}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={100}
          hint="At least 8 characters."
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldError(mutation.error, 'password', 'Password')}
        />
        {mutation.isError && (
          <p role="alert" className="text-sm text-alert">
            {authErrorMessage(mutation.error)}{' '}
            {emailTaken && (
              <Link to="/signin" className="font-medium underline underline-offset-2">
                Go to sign in
              </Link>
            )}
          </p>
        )}
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
      <p className="mt-6 text-sm text-ink-soft">
        Already have an account?{' '}
        <Link to="/signin" className="font-medium text-lapis underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
