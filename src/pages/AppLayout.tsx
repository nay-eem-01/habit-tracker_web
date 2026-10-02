import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '../auth/context'

/** The frame around every signed-in page. */
export default function AppLayout() {
  const { state, signOut } = useAuth()
  const [signingOut, setSigningOut] = useState(false)
  if (state.status !== 'authenticated') return null

  return (
    <div className="min-h-dvh">
      <header className="border-b border-mist">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <p className="font-display text-xl font-semibold tracking-tight">DevHabit</p>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-ink-soft">{state.user.name}</span>
            <button
              type="button"
              disabled={signingOut}
              onClick={() => {
                setSigningOut(true)
                void signOut()
              }}
              className="rounded-md border border-mist px-3 py-1.5 font-medium hover:border-ink-soft disabled:opacity-60"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  )
}
