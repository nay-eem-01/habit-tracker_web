import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { CaretRight, CheckCircle, GoogleLogo, MagnifyingGlass } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listAdminUsers, type AdminUser, type UserQuery } from '../api/admin'
import { habitErrorMessage } from '../api/messages'
import { INPUT } from '../components/Field'
import { SelectField } from '../components/pickers'
import { SECONDARY, SURFACE } from '../components/styles'
import { Badges } from './Badges'
import { joined } from './format'

const PAGE_SIZE = 20

const SORTS: { value: string; label: string; sortBy: UserQuery['sortBy']; sortDir: UserQuery['sortDir'] }[] = [
  { value: 'new', label: 'Newest first', sortBy: 'createdAt', sortDir: 'desc' },
  { value: 'old', label: 'Oldest first', sortBy: 'createdAt', sortDir: 'asc' },
  { value: 'az', label: 'Email A–Z', sortBy: 'email', sortDir: 'asc' },
  { value: 'za', label: 'Email Z–A', sortBy: 'email', sortDir: 'desc' },
]

function Row({ user }: { user: AdminUser }) {
  return (
    <li>
      <Link
        to={`/admin/users/${user.id}`}
        className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3.5 transition-colors hover:bg-mist/25 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_6rem_6rem_1rem]"
      >
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="truncate font-medium">{user.email}</span>
            <Badges user={user} />
          </span>
          <span className="block truncate text-sm text-ink-soft">{user.name}</span>
        </span>
        <CaretRight size={16} className="row-span-2 text-ink-soft sm:hidden" aria-hidden="true" />
        <span className="flex items-center gap-3 text-sm text-ink-soft sm:contents">
          <span className="flex items-center gap-1.5">
            {user.authProvider === 'GOOGLE' ? (
              <>
                <GoogleLogo size={16} weight="bold" aria-hidden="true" /> Google
              </>
            ) : (
              'Password'
            )}
          </span>
          <span className={`flex items-center gap-1 ${user.emailVerified ? 'text-link' : ''}`}>
            {user.emailVerified ? (
              <>
                <CheckCircle size={16} weight="fill" aria-hidden="true" /> Verified
              </>
            ) : (
              'Unverified'
            )}
          </span>
          <span>{joined(user.createdAt)}</span>
        </span>
        <CaretRight size={16} className="hidden text-ink-soft sm:block" aria-hidden="true" />
      </Link>
    </li>
  )
}

export default function AdminUsers() {
  const [typed, setTyped] = useState('')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('new')
  const [page, setPage] = useState(0)

  // wait for a pause in typing before asking the server
  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(typed.trim())
      setPage(0)
    }, 300)
    return () => clearTimeout(timer)
  }, [typed])

  const { sortBy, sortDir } = SORTS.find((option) => option.value === sort)!
  const users = useQuery({
    queryKey: ['admin', 'users', { q, sortBy, sortDir, page }],
    queryFn: () => listAdminUsers({ q, sortBy, sortDir, page, size: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  })

  return (
    <section className="mt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="relative sm:w-80">
          <label htmlFor="admin-search" className="sr-only">
            Search by email
          </label>
          <MagnifyingGlass size={18} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-soft" />
          <input
            id="admin-search"
            type="search"
            placeholder="Search by email"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            className={`${INPUT} h-12 border-mist pl-10`}
          />
        </div>
        <div className="sm:w-48">
          <SelectField
            label="Sort"
            value={sort}
            onChange={(value) => {
              setSort(value)
              setPage(0)
            }}
            options={SORTS}
          />
        </div>
      </div>

      {users.isError ? (
        <div className="mt-6">
          <p role="alert" className="text-alert">
            {habitErrorMessage(users.error)}
          </p>
          <button type="button" onClick={() => users.refetch()} className={`${SECONDARY} mt-3`}>
            Try again
          </button>
        </div>
      ) : !users.data ? (
        <div role="status" aria-label="Loading users" className="mt-4 h-72 animate-pulse rounded-2xl bg-mist/45" />
      ) : users.data.content.length === 0 ? (
        <p className="mt-8 text-center text-ink-soft">{q ? `No email contains “${q}”.` : 'No users yet.'}</p>
      ) : (
        <>
          <p className="mt-4 text-sm text-ink-soft">
            {users.data.totalElements} {users.data.totalElements === 1 ? 'user' : 'users'}
            {q && ` matching “${q}”`}
          </p>
          <div className={`${SURFACE} mt-2 overflow-hidden`}>
            <div
              aria-hidden="true"
              className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_6rem_6rem_1rem] gap-x-4 border-b border-mist/70 px-4 py-2.5 text-xs font-semibold tracking-wide text-ink-soft uppercase sm:grid"
            >
              <span>User</span>
              <span>Sign-in</span>
              <span>Email</span>
              <span>Joined</span>
              <span />
            </div>
            <ul className={`divide-y divide-mist/70 transition-opacity ${users.isPlaceholderData ? 'opacity-60' : ''}`}>
              {users.data.content.map((user) => (
                <Row key={user.id} user={user} />
              ))}
            </ul>
          </div>
          {users.data.totalPages > 1 && (
            <nav aria-label="Pages" className="mt-6 flex items-center gap-4 text-sm">
              <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className={SECONDARY}>
                Previous
              </button>
              <span className="text-ink-soft">
                Page {users.data.number + 1} of {users.data.totalPages}
              </span>
              <button type="button" disabled={page + 1 >= users.data.totalPages} onClick={() => setPage(page + 1)} className={SECONDARY}>
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  )
}
