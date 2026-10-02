import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/context'
import { NotificationBell } from '../notifications/NotificationBell'

/** The frame around every signed-in page. */
export default function AppLayout() {
  const { state, signOut } = useAuth()
  const [signingOut, setSigningOut] = useState(false)
  if (state.status !== 'authenticated') return null

  return (
    <div className="min-h-dvh">
      <header className="border-b border-mist">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link to="/" className="font-display text-xl font-semibold tracking-tight">
            DevHabit
          </Link>
          <nav aria-label="Main" className="flex gap-4 font-medium sm:gap-5">
            {[
              { to: '/', label: 'Today', end: true },
              { to: '/habits', label: 'Habits', end: false },
            ].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `border-b-2 py-1 ${isActive ? 'border-lapis text-ink' : 'border-transparent text-ink-soft hover:text-ink'}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-4 text-sm">
            <NotificationBell />
            <span className="hidden text-ink-soft sm:inline">{state.user.name}</span>
            <button
              type="button"
              disabled={signingOut}
              onClick={() => {
                setSigningOut(true)
                void signOut()
              }}
              className="rounded-md border border-mist px-3 py-1.5 font-medium whitespace-nowrap hover:border-ink-soft disabled:opacity-60"
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
