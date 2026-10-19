import { Suspense, useState } from 'react'
import { BookOpenText, CalendarCheck, House, Repeat, Target, type Icon as PhosphorIcon } from '@phosphor-icons/react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/context'
import { LevelBadge } from '../level/LevelBadge'
import { LevelUp } from '../level/LevelUp'
import { NotificationBell } from '../notifications/NotificationBell'
import { Brand } from '../components/Brand'
import { UserMenu } from './UserMenu'
import { VerifyBanner } from './VerifyBanner'

/** Long enough to read the goodbye, short enough that nobody waits on it. Skipped for reduced motion. */
const FAREWELL_MS = 900

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const NAV: { to: string; label: string; end: boolean; Icon: PhosphorIcon }[] = [
  { to: '/', label: 'Home', end: true, Icon: House },
  { to: '/today', label: 'Today', end: false, Icon: CalendarCheck },
  { to: '/habits', label: 'Habits', end: false, Icon: Repeat },
  { to: '/goals', label: 'Goals', end: false, Icon: Target },
  { to: '/resources', label: 'Library', end: false, Icon: BookOpenText },
]

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
    // on a phone the tab bar is fixed to the bottom, so the page leaves room for it and the home indicator
    <div className="min-h-dvh pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-0">
      {/* No backdrop blur: it would make the header the containing block of the fixed tab bar inside it. */}
      <header className="sticky top-0 z-20 border-b border-mist bg-chalk/95 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <Brand to="/" />
          {/* One nav: a tab bar along the bottom on a phone, a row in the header from md up. */}
          <nav
            aria-label="Main"
            className="fixed inset-x-0 bottom-0 z-20 border-t border-mist bg-chalk/95 pb-[env(safe-area-inset-bottom)] md:static md:border-0 md:bg-transparent md:pb-0"
          >
            <ul className="mx-auto grid max-w-lg grid-cols-5 md:flex md:max-w-none md:gap-1">
              {NAV.map(({ to, label, end, Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      `flex min-h-[3.75rem] flex-col items-center justify-center gap-0.5 text-[0.8125rem] font-medium transition-colors duration-200 ease-out md:min-h-10 md:flex-row md:gap-2 md:rounded-full md:px-3.5 md:text-[0.9375rem] ${
                        isActive ? 'text-link md:bg-lapis/8' : 'text-ink-soft hover:text-ink'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon size={24} weight={isActive ? 'fill' : 'regular'} aria-hidden="true" className="md:hidden" />
                        {label}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <LevelBadge />
            <NotificationBell />
            <UserMenu user={state.user} onSignOut={leave} />
          </div>
        </div>
      </header>
      <VerifyBanner user={state.user} />
      {/* the header stays put while a page's code arrives */}
      <Suspense
        fallback={
          <p role="status" className="mx-auto max-w-3xl px-4 py-10 text-ink-soft sm:px-6">
            Loading…
          </p>
        }
      >
        <Outlet />
      </Suspense>
      <LevelUp userId={state.user.id} />

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
