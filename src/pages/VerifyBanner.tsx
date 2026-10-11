import { EnvelopeSimple } from '@phosphor-icons/react'
import { useMutation } from '@tanstack/react-query'
import type { AuthUser } from '../api/client'
import { resendVerification } from '../api/auth'
import { ApiError } from '../api/errors'
import { authErrorMessage } from '../api/messages'
import { useAuth } from '../auth/context'

/** Until the email is confirmed: one quiet line under the header, with a way to get the link again. */
export function VerifyBanner({ user }: { user: AuthUser }) {
  const { updateUser } = useAuth()
  const resend = useMutation({
    mutationFn: resendVerification,
    onError: (error) => {
      // confirmed on another device since this page loaded
      if (error instanceof ApiError && error.errorCode === 'AUTH_EMAIL_ALREADY_VERIFIED') updateUser({ ...user, emailVerified: true })
    },
  })
  if (user.emailVerified !== false) return null

  return (
    <div className="border-b border-mist/70 bg-ember/10">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm sm:px-6">
        <EnvelopeSimple size={18} weight="bold" className="shrink-0 text-ember-deep" aria-hidden="true" />
        <p className="min-w-0 flex-1">
          Confirm your email: we sent a link to <span className="font-medium break-words">{user.email}</span>.
        </p>
        {resend.isSuccess ? (
          <p role="status" className="font-medium">
            Sent. Check your inbox.
          </p>
        ) : (
          <button
            type="button"
            disabled={resend.isPending}
            onClick={() => resend.mutate()}
            className="font-medium text-link underline underline-offset-2 disabled:opacity-60"
          >
            {resend.isPending ? 'Sending…' : 'Send it again'}
          </button>
        )}
        {resend.isError && (
          <p role="alert" className="w-full text-alert">
            {authErrorMessage(resend.error)}
          </p>
        )}
      </div>
    </div>
  )
}
