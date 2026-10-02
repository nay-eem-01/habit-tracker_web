import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getUnreadCount, listNotifications, markAllRead, markRead, type Notification } from '../api/notifications'
import { timeAgo } from './time'

/** How often the unread count is asked for while the tab is visible. */
export const POLL_MS = 30_000

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path
        d="M6 9a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7ZM10 20a2 2 0 0 0 4 0"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function NotificationBell() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  const unread = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: getUnreadCount,
    refetchInterval: POLL_MS,
  })
  const list = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => listNotifications(),
    enabled: open,
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  const read = useMutation({ mutationFn: markRead, onSuccess: refresh })
  const readAll = useMutation({ mutationFn: markAllRead, onSuccess: refresh })

  // close on Escape or a click elsewhere
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
    const onClick = (event: MouseEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [open])

  const count = unread.data?.unread ?? 0

  const open_ = (notification: Notification) => {
    if (!notification.readAt) read.mutate(notification.id)
    setOpen(false)
  }

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="notifications-panel"
        aria-label={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
        onClick={() => setOpen(!open)}
        className="relative grid size-9 place-items-center rounded-md border border-mist hover:border-ink-soft"
      >
        <BellIcon />
        {count > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-1.5 -right-1.5 grid min-w-5 place-items-center rounded-full bg-ember-deep px-1 text-xs font-semibold text-white"
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <section
          id="notifications-panel"
          aria-label="Notifications"
          className="absolute right-0 z-10 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-md border border-mist bg-white shadow-lg"
        >
          <div className="flex items-center justify-between gap-3 border-b border-mist px-4 py-3">
            <h2 className="font-display text-lg font-semibold tracking-tight">Notifications</h2>
            <button
              type="button"
              disabled={count === 0 || readAll.isPending}
              onClick={() => readAll.mutate()}
              className="text-sm font-medium text-lapis underline underline-offset-2 disabled:text-ink-soft disabled:no-underline"
            >
              Mark all read
            </button>
          </div>
          {list.isPending ? (
            <p role="status" className="px-4 py-4 text-sm text-ink-soft">
              Loading…
            </p>
          ) : list.isError ? (
            <div className="px-4 py-4 text-sm">
              <p role="alert" className="text-alert">
                Couldn’t load your notifications.
              </p>
              <button type="button" onClick={() => list.refetch()} className="mt-2 font-medium text-lapis underline">
                Try again
              </button>
            </div>
          ) : list.data.content.length === 0 ? (
            <p className="px-4 py-4 text-sm text-ink-soft">No reminders yet.</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {list.data.content.map((notification) => {
                const unreadItem = !notification.readAt
                const body = (
                  <>
                    <span className="flex items-baseline justify-between gap-3">
                      <span className={unreadItem ? 'font-semibold' : 'font-medium'}>{notification.title}</span>
                      <span className="shrink-0 text-xs text-ink-soft">{timeAgo(notification.createdAt)}</span>
                    </span>
                    <span className="mt-0.5 block text-sm text-ink-soft">{notification.body}</span>
                  </>
                )
                return (
                  <li key={notification.id} className="border-b border-mist last:border-b-0">
                    {notification.habitId ? (
                      <Link
                        to={`/habits/${notification.habitId}`}
                        onClick={() => open_(notification)}
                        data-unread={unreadItem}
                        className={`block px-4 py-3 hover:bg-chalk ${unreadItem ? 'border-l-4 border-lapis' : ''}`}
                      >
                        {body}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => open_(notification)}
                        data-unread={unreadItem}
                        className={`block w-full px-4 py-3 text-left hover:bg-chalk ${unreadItem ? 'border-l-4 border-lapis' : ''}`}
                      >
                        {body}
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
