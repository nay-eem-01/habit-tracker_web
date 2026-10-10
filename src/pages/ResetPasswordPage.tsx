import { useMutation } from '@tanstack/react-query'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { resetPassword } from '../api/auth'
import { ApiError } from '../api/errors'
import { authErrorMessage, fieldError } from '../api/messages'
import { useAuth } from '../auth/context'
import { AuthLayout } from '../components/AuthLayout'
import { Button } from '../components/Button'
import { PRIMARY } from '../components/styles'
import { newPasswordProblem } from '../auth/password'
import { NewPasswordFields } from './NewPasswordFields'

/** The token from the emailed link, `/reset-password#token=…`. In the fragment, it never reaches a server log. */
function tokenFromHash(hash: string): string | null {
  return new URLSearchParams(hash.slice(1)).get('token')
}

/** Chooses a new password from the emailed link, then signs straight in. */
export default function ResetPasswordPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const { hash } = useLocation()
  const [token] = useState(() => tokenFromHash(hash))
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [tried, setTried] = useState(false)

  // the token is read; take it out of the address bar and the history, so it isn't left lying around
  useEffect(() => {
    if (hash) navigate({ hash: '' }, { replace: true })
  }, [hash, navigate])

  const mutation = useMutation({
    mutationFn: () => resetPassword(token!, password),
    onSuccess: (session) => {
      signIn(session)
      navigate('/', { replace: true })
    },
  })
  const problem = tried ? newPasswordProblem(password, confirm) : null
  const expired = mutation.error instanceof ApiError && mutation.error.errorCode === 'AUTH_INVALID_RESET_TOKEN'

  function submit(event: FormEvent) {
    event.preventDefault()
    setTried(true)
    if (newPasswordProblem(password, confirm)) return
    mutation.mutate()
  }

  if (!token || expired) {
    return (
      <AuthLayout
        title="This link doesn't work"
        intro={
          expired
            ? 'It has expired or was already used. Reset links work once, for 30 minutes.'
            : "It's missing its token. Open the link from the email again, or ask for a new one."
        }
      >
        <div className="stagger flex flex-col gap-5">
          <Link
            to="/forgot-password"
            className={`${PRIMARY} h-12 px-6`}
          >
            Ask for a new link
          </Link>
          <Link to="/signin" className="text-sm font-medium text-link underline underline-offset-2">
            Back to sign in
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Choose a new password" intro="You'll be signed in, and signed out everywhere else.">
      <form onSubmit={submit} className="stagger flex flex-col gap-5" noValidate>
        <NewPasswordFields
          password={password}
          confirm={confirm}
          onPassword={setPassword}
          onConfirm={setConfirm}
          error={fieldError(mutation.error, 'newPassword', 'Password')}
          problem={problem}
        />
        {mutation.isError && (
          <p role="alert" className="text-sm text-alert">
            {authErrorMessage(mutation.error)}
          </p>
        )}
        <Button type="submit" busy={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : 'Save and sign in'}
        </Button>
      </form>
    </AuthLayout>
  )
}
