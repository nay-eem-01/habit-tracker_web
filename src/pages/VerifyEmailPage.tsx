import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { verifyEmail } from '../api/auth'
import { authErrorMessage } from '../api/messages'
import { useAuth } from '../auth/context'
import { AuthLayout } from '../components/AuthLayout'
import { PRIMARY } from '../components/styles'

/** Confirms the email from the link, `/verify-email#token=…`, as soon as it opens. Works signed in or out. */
export default function VerifyEmailPage() {
  const { state, updateUser } = useAuth()
  const navigate = useNavigate()
  const { hash } = useLocation()
  const [token] = useState(() => new URLSearchParams(hash.slice(1)).get('token'))

  // read once; take it out of the address bar and the history
  useEffect(() => {
    if (hash) navigate({ hash: '' }, { replace: true })
  }, [hash, navigate])

  // a query, not an effect: the token works once, and a query runs once however often the page renders
  const verify = useQuery({
    queryKey: ['verify-email', token],
    queryFn: () => verifyEmail(token!).then(() => true),
    enabled: Boolean(token),
    retry: false,
    staleTime: Infinity,
  })

  const signedIn = state.status === 'authenticated'
  useEffect(() => {
    if (verify.isSuccess && state.status === 'authenticated' && !state.user.emailVerified) {
      updateUser({ ...state.user, emailVerified: true })
    }
  }, [verify.isSuccess, state, updateUser])

  const next = signedIn ? (
    <Link to="/" className={`${PRIMARY} h-12 px-6`}>
      Open DevHabit
    </Link>
  ) : (
    <Link to="/signin" className={`${PRIMARY} h-12 px-6`}>
      Sign in
    </Link>
  )

  if (!token || verify.isError) {
    return (
      <AuthLayout
        title="This link doesn't work"
        intro={
          token
            ? authErrorMessage(verify.error)
            : "It's missing its token. Open the link from the email again."
        }
      >
        <div className="stagger flex flex-col gap-5">
          {next}
          {signedIn && <p className="text-sm text-ink-soft">A new link can be sent from the banner at the top of the app.</p>}
        </div>
      </AuthLayout>
    )
  }

  if (!verify.isSuccess) {
    return (
      <AuthLayout title="Confirming your email…" intro="One moment.">
        <span aria-hidden="true" className="spinner block size-6 rounded-full border-2 border-mist border-t-ember" />
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Email confirmed" intro="Thanks. Your account is all set.">
      <div className="stagger flex flex-col gap-5">{next}</div>
    </AuthLayout>
  )
}
