import { ShieldCheck } from '@phosphor-icons/react'
import { Suspense } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/context'
import { Brand } from '../components/Brand'
import { UserMenu } from '../pages/UserMenu'

const TABS = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/users', label: 'Users', end: false },
]

/**
 * The admin app: its own header, tabs and account menu. An admin only administers, so nothing from the
 * user app is here (no bell, level, banner or push): those endpoints answer 403 for an admin.
 */
export default function AdminLayout() {
  const { state, signOut } = useAuth()
  if (state.status !== 'authenticated') return null

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-mist/70 bg-chalk/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3 sm:px-6">
          <Brand to="/admin">
            <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-ember/15 px-2 py-0.5 font-sans text-xs font-semibold text-ember-deep">
              <ShieldCheck size={14} weight="fill" aria-hidden="true" />
              Admin
            </span>
          </Brand>
          <nav
            aria-label="Admin"
            className="order-last flex w-full gap-0.5 rounded-full bg-mist/45 p-1 text-sm font-medium sm:text-base md:order-none md:w-auto"
          >
            {TABS.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  `flex-1 rounded-full px-1.5 py-1.5 text-center transition-[background-color,color,box-shadow] duration-200 ease-out md:flex-none md:px-5 ${
                    isActive ? 'bg-pill text-ink shadow-[0_1px_3px_rgb(9_38_52/0.14)]' : 'text-ink-soft hover:text-ink'
                  }`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
          <UserMenu user={state.user} admin onSignOut={() => void signOut()} />
        </div>
      </header>
      <Suspense
        fallback={
          <p role="status" className="mx-auto max-w-4xl px-4 py-10 text-ink-soft sm:px-6">
            Loading…
          </p>
        }
      >
        <Outlet />
      </Suspense>
    </div>
  )
}
