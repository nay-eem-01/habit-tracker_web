import type { AdminUser } from '../api/admin'

/** Small labels for what sets a user apart: Suspended, Pro, Admin. */
export function Badges({ user }: { user: AdminUser }) {
  return (
    <>
      {user.suspendedAt && <span className="rounded-full bg-alert/12 px-2 py-0.5 text-xs font-semibold text-alert">Suspended</span>}
      {user.plan === 'PRO' && <span className="rounded-full bg-ember/15 px-2 py-0.5 text-xs font-semibold text-ember-deep">Pro</span>}
      {user.role === 'ADMIN' && <span className="rounded-full bg-lapis/12 px-2 py-0.5 text-xs font-semibold text-link">Admin</span>}
    </>
  )
}
