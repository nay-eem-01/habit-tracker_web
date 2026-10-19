import { ChartBar, ShieldCheck, Users, type Icon as PhosphorIcon } from '@phosphor-icons/react'
import { Suspense } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/context'
import { Brand } from '../components/Brand'
import { UserMenu } from '../pages/UserMenu'

const TABS: { to: string; label: string; end: boolean; Icon: PhosphorIcon }[] = [
  { to: '/admin', label: 'Overview', end: true, Icon: ChartBar },
  { to: '/admin/users', label: 'Users', end: false, Icon: Users },
]

/**
 * The admin app: its own header, tabs and account menu. An admin only administers, so nothing from the
 * user app is here (no bell, level, banner or push): those endpoints answer 403 for an admin.
 */
export default function AdminLayout() {
  const { state, signOut } = useAuth()
  if (state.status !== 'authenticated') return null

  return (
    // the same frame as the user app: a tab bar along the bottom on a phone, a row in the header from md up
    <div className="min-h-dvh pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-0">
      {/* No backdrop blur: it would make the header the containing block of the fixed tab bar inside it. */}
      <header className="sticky top-0 z-20 border-b border-mist bg-chalk/95 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <Brand to="/admin">
            <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-lapis/10 px-2 py-0.5 font-sans text-[0.8125rem] font-semibold text-link">
              <ShieldCheck size={14} weight="fill" aria-hidden="true" />
              Admin
            </span>
          </Brand>
          <nav
            aria-label="Admin"
            className="fixed inset-x-0 bottom-0 z-20 border-t border-mist bg-chalk/95 pb-[env(safe-area-inset-bottom)] md:static md:border-0 md:bg-transparent md:pb-0"
          >
            <ul className="mx-auto grid max-w-xs grid-cols-2 md:flex md:max-w-none md:gap-1">
              {TABS.map(({ to, label, end, Icon }) => (
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
          <UserMenu user={state.user} admin onSignOut={() => void signOut()} />
        </div>
      </header>
      <Suspense
        fallback={
          <p role="status" className="mx-auto max-w-5xl px-4 py-10 text-ink-soft sm:px-6">
            Loading…
          </p>
        }
      >
        <Outlet />
      </Suspense>
    </div>
  )
}
