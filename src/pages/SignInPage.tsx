import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { login } from '../api/auth'
import { authErrorMessage, fieldError } from '../api/messages'
import { useAuth } from '../auth/context'
import { AuthLayout } from '../components/AuthLayout'
import { Button } from '../components/Button'
import { Field } from '../components/Field'

export default function SignInPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const mutation = useMutation({ mutationFn: () => login(email.trim(), password), onSuccess: signIn })

  function submit(event: FormEvent) {
    event.preventDefault()
    mutation.mutate()
  }

  return (
    <AuthLayout title="Sign in" intro="Your streaks are where you left them.">
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
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldError(mutation.error, 'password', 'Password')}
        />
        <Link
          to="/forgot-password"
          state={{ email: email.trim() }}
          className="-mt-2 self-start text-sm font-medium text-link underline underline-offset-2"
        >
          Forgot password?
        </Link>
        {mutation.isError && (
          <p role="alert" className="text-sm text-alert">
            {authErrorMessage(mutation.error)}
          </p>
        )}
        <Button type="submit" busy={mutation.isPending}>
          {mutation.isPending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <p className="mt-6 text-sm text-ink-soft">
        New here?{' '}
        <Link to="/register" className="font-medium text-link underline underline-offset-2">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  )
}
