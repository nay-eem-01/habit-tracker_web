import { useMutation } from '@tanstack/react-query'
import { CheckCircle } from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { changePassword } from '../api/auth'
import { ApiError } from '../api/errors'
import { authErrorMessage, fieldError } from '../api/messages'
import { useAuth } from '../auth/context'
import { Button } from '../components/Button'
import { Field } from '../components/Field'
import { SURFACE } from '../components/styles'
import { newPasswordProblem } from '../auth/password'
import { NewPasswordFields } from './NewPasswordFields'

/** Change the password while signed in. Every other device is signed out; this one stays. */
export default function ChangePasswordPage() {
  const { state, signIn } = useAuth()
  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [tried, setTried] = useState(false)

  const mutation = useMutation({
    mutationFn: () => changePassword(current, password),
    onSuccess: (session) => {
      // fresh tokens for this session; the user is the same
      signIn(session)
      setCurrent('')
      setPassword('')
      setConfirm('')
      setTried(false)
    },
  })
  const problem = tried ? newPasswordProblem(password, confirm) : null
  const code = mutation.error instanceof ApiError ? mutation.error.errorCode : null

  function submit(event: FormEvent) {
    event.preventDefault()
    setTried(true)
    if (newPasswordProblem(password, confirm)) return
    mutation.mutate()
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Change password</h1>
      <p className="mt-1 text-ink-soft">
        {state.status === 'authenticated' ? state.user.email : ''} · other devices will be signed out.
      </p>
      <div className={`${SURFACE} mt-6 p-5 sm:p-8`}>
        {mutation.isSuccess && (
          <p role="status" className="mb-6 flex items-center gap-2 rounded-xl bg-lapis/10 px-4 py-3 font-medium text-link">
            <CheckCircle size={20} weight="fill" aria-hidden="true" />
            Password changed. You're signed out everywhere else.
          </p>
        )}
        <form onSubmit={submit} className="flex max-w-sm flex-col gap-5" noValidate>
          <Field
            label="Current password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={100}
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
            error={code === 'AUTH_WRONG_PASSWORD' ? authErrorMessage(mutation.error) : undefined}
          />
          <NewPasswordFields
            password={password}
            confirm={confirm}
            onPassword={setPassword}
            onConfirm={setConfirm}
            error={fieldError(mutation.error, 'newPassword', 'Password')}
            problem={problem}
          />
          {mutation.isError && code !== 'AUTH_WRONG_PASSWORD' && (
            <p role="alert" className="text-sm text-alert">
              {authErrorMessage(mutation.error)}
              {code === 'AUTH_PASSWORD_NOT_SET' && (
                <>
                  {' '}
                  <Link to="/forgot-password" className="font-medium text-link underline underline-offset-2">
                    Set one by email
                  </Link>
                </>
              )}
            </p>
          )}
          <div>
            <Button type="submit" busy={mutation.isPending}>
              {mutation.isPending ? 'Changing…' : 'Change password'}
            </Button>
          </div>
        </form>
      </div>
    </main>
  )
}
