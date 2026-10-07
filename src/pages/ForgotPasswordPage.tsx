import { useMutation } from '@tanstack/react-query'
import { EnvelopeSimple } from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { forgotPassword } from '../api/auth'
import { authErrorMessage, fieldError } from '../api/messages'
import { AuthLayout } from '../components/AuthLayout'
import { Button } from '../components/Button'
import { Field } from '../components/Field'

/** Asks for a reset link. The answer is the same whether or not the email has an account. */
export default function ForgotPasswordPage() {
  // the sign-in page passes on what was already typed there
  const typed = (useLocation().state as { email?: string } | null)?.email ?? ''
  const [email, setEmail] = useState(typed)
  const mutation = useMutation({ mutationFn: () => forgotPassword(email.trim()) })

  function submit(event: FormEvent) {
    event.preventDefault()
    mutation.mutate()
  }

  if (mutation.isSuccess) {
    return (
      <AuthLayout title="Check your email" intro="If there's an account for that address, a reset link is on its way.">
        <div className="stagger flex flex-col gap-5">
          <div className="flex gap-3 rounded-2xl border border-mist bg-surface p-4">
            <EnvelopeSimple size={24} weight="duotone" className="mt-0.5 shrink-0 text-link" aria-hidden="true" />
            <p className="text-sm text-ink-soft">
              If <span className="font-medium break-all text-ink">{email.trim()}</span> has an account, the link is in that
              inbox. It works once, for 30 minutes. Nothing there? Check spam, or ask again in a minute.
            </p>
          </div>
          <button
            type="button"
            onClick={() => mutation.reset()}
            className="self-start text-sm font-medium text-link underline underline-offset-2"
          >
            Use a different email
          </button>
        </div>
        <p className="mt-6 text-sm text-ink-soft">
          Remembered it?{' '}
          <Link to="/signin" className="font-medium text-link underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Forgot your password?" intro="Enter your email and we'll send you a link to choose a new one.">
      <form onSubmit={submit} className="stagger flex flex-col gap-5">
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldError(mutation.error, 'email', 'Email')}
        />
        {mutation.isError && (
          <p role="alert" className="text-sm text-alert">
            {authErrorMessage(mutation.error)}
          </p>
        )}
        <Button type="submit" busy={mutation.isPending}>
          {mutation.isPending ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
      <p className="mt-6 text-sm text-ink-soft">
        <Link to="/signin" className="font-medium text-link underline underline-offset-2">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
