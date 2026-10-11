import { ShieldCheck } from '@phosphor-icons/react'
import { NavLink, Outlet } from 'react-router-dom'

const TABS = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/users', label: 'Users', end: false },
]

/** The admin area: its own heading and tabs, under the app's header. */
export default function AdminLayout() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <p className="flex items-center gap-1.5 text-sm font-medium text-ember-deep">
        <ShieldCheck size={18} weight="fill" aria-hidden="true" />
        Admin
      </p>
      <nav aria-label="Admin" className="mt-3 inline-flex gap-1 rounded-full bg-mist/45 p-1">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `rounded-full px-4 py-1.5 text-sm font-medium transition-[background-color,color,box-shadow] duration-200 ease-out sm:px-5 sm:text-base ${
                isActive ? 'bg-pill text-ink shadow-[0_1px_3px_rgb(9_38_52/0.14)]' : 'text-ink-soft hover:text-ink'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </main>
  )
}
