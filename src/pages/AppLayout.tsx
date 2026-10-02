import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/context'
import { NotificationBell } from '../notifications/NotificationBell'
import { UserMenu } from './UserMenu'

/** Long enough to read the goodbye, short enough that nobody waits on it. Skipped for reduced motion. */
const FAREWELL_MS = 900

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** The frame around every signed-in page. */
export default function AppLayout() {
  const { state, signOut } = useAuth()
  const [signingOut, setSigningOut] = useState(false)
  if (state.status !== 'authenticated') return null

  const firstName = state.user.name.trim().split(/\s+/)[0]

  function leave() {
    setSigningOut(true)
    // the revoke happens once the goodbye has been seen; signing out is rare, so it can have a moment
    setTimeout(() => void signOut(), prefersReducedMotion() ? 0 : FAREWELL_MS)
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-mist/70 bg-chalk/85 backdrop-blur-md">
        {/* On a phone the links drop to their own row, so the bell and avatar always fit, even at 320px. */}
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight">
            <span aria-hidden="true" className="grid grid-cols-2 gap-[2px]">
              <span className="size-[7px] rounded-[2px] bg-lapis" />
              <span className="size-[7px] rounded-[2px] bg-lapis" />
              <span className="size-[7px] rounded-[2px] bg-lapis" />
              <span className="size-[7px] rounded-[2px] bg-ember" />
            </span>
            DevHabit
          </Link>
          <nav
            aria-label="Main"
            className="order-last flex w-full gap-1 rounded-full bg-mist/45 p-1 font-medium sm:order-none sm:w-auto"
          >
            {[
              { to: '/', label: 'Today', end: true },
              { to: '/habits', label: 'Habits', end: false },
            ].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex-1 rounded-full px-5 py-1.5 text-center transition-[background-color,color,box-shadow] duration-200 ease-out sm:flex-none ${
                    isActive ? 'bg-pill text-ink shadow-[0_1px_3px_rgb(29_36_51/0.14)]' : 'text-ink-soft hover:text-ink'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <UserMenu user={state.user} onSignOut={leave} />
          </div>
        </div>
      </header>
      <Outlet />

      {signingOut && (
        <div
          role="status"
          className="farewell fixed inset-0 z-50 grid place-items-center bg-lapis-deep px-6 text-center text-white"
        >
          <div>
            <p className="font-display text-4xl font-semibold tracking-tight">See you tomorrow, {firstName}.</p>
            <p className="mt-2 text-white/70">Your chain will be here.</p>
          </div>
        </div>
      )}
    </div>
  )
}
