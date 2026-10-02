import { useAuth } from '../auth/context'

export default function HomePage() {
  const { state } = useAuth()
  const firstName = state.status === 'authenticated' ? state.user.name.split(' ')[0] : ''

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Hi, {firstName}</h1>
      <p className="mt-2 text-ink-soft">Your habits will show up here.</p>
    </main>
  )
}
