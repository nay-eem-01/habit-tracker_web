import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, Plant } from '@phosphor-icons/react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { archiveHabit, listHabits, unarchiveHabit, type Habit } from '../api/habits'
import { habitErrorMessage } from '../api/messages'
import { SECONDARY, SURFACE } from '../components/styles'
import { describeSchedule } from './form'

const BUTTON = SECONDARY

type Notice = { kind: 'archived' | 'restored'; habit: Habit }

export default function HabitsPage() {
  const queryClient = useQueryClient()
  const [archived, setArchived] = useState(false)
  const [page, setPage] = useState(0)
  const [notice, setNotice] = useState<Notice | null>(null)

  const habits = useQuery({
    queryKey: ['habits', { archived, page }],
    queryFn: () => listHabits({ archived, page }),
    placeholderData: keepPreviousData,
  })

  // taking the only habit off a later page would leave that page empty: step back first
  const refresh = () => {
    if (page > 0 && habits.data?.content.length === 1) setPage(page - 1)
    return queryClient.invalidateQueries({ queryKey: ['habits'] })
  }
  const archive = useMutation({
    mutationFn: archiveHabit,
    onSuccess: (habit) => {
      setNotice({ kind: 'archived', habit })
      return refresh()
    },
  })
  const restore = useMutation({
    mutationFn: unarchiveHabit,
    onSuccess: (habit) => {
      setNotice({ kind: 'restored', habit })
      return refresh()
    },
  })

  const showTab = (next: boolean) => {
    setArchived(next)
    setPage(0)
    setNotice(null)
  }

  const failure = archive.error ?? restore.error

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex items-end justify-between gap-4">
        <h1 className="font-display text-4xl font-semibold tracking-tight">Habits</h1>
        <Link
          to="/habits/new"
          className="inline-flex h-11 items-center rounded-xl bg-lapis px-5 font-medium text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_8px_20px_-8px_rgb(34_50_143/0.7)] transition-[transform,background-color] duration-150 ease-out active:scale-[0.97] [@media(hover:hover)]:hover:bg-lapis-deep"
        >
          New habit
        </Link>
      </div>

      <div className="mt-6 inline-flex gap-1 rounded-full bg-mist/45 p-1">
        {[
          { label: 'Active', value: false },
          { label: 'Archived', value: true },
        ].map((tab) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => showTab(tab.value)}
            aria-current={archived === tab.value ? 'true' : undefined}
            className={`rounded-full px-5 py-1.5 font-medium transition-[background-color,color,box-shadow] duration-200 ease-out ${
              archived === tab.value ? 'bg-white text-ink shadow-[0_1px_3px_rgb(29_36_51/0.14)]' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {notice && (
        <p role="status" className="mt-4 flex items-center gap-3 text-sm">
          <span>
            {notice.kind === 'archived' ? 'Archived' : 'Restored'} “{notice.habit.name}”.
          </span>
          {notice.kind === 'archived' && (
            <button
              type="button"
              onClick={() => restore.mutate(notice.habit.id)}
              className="font-medium text-lapis underline underline-offset-2"
            >
              Undo
            </button>
          )}
        </p>
      )}
      {failure && (
        <p role="alert" className="mt-4 text-sm text-alert">
          {habitErrorMessage(failure)}
        </p>
      )}

      {habits.isPending ? (
        <div role="status" aria-label="Loading habits" className="mt-6 flex animate-pulse flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-mist/45" />
          ))}
        </div>
      ) : habits.isError ? (
        <div className="mt-8">
          <p role="alert" className="text-alert">
            {habitErrorMessage(habits.error)}
          </p>
          <button type="button" onClick={() => habits.refetch()} className={`${BUTTON} mt-3`}>
            Try again
          </button>
        </div>
      ) : habits.data.content.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-3xl border border-dashed border-mist px-6 py-14 text-center text-ink-soft">
          {archived ? (
            <Archive size={40} weight="duotone" className="text-lapis" aria-hidden="true" />
          ) : (
            <Plant size={40} weight="duotone" className="text-lapis" aria-hidden="true" />
          )}
          <p className="mt-3">
            {archived ? 'No archived habits.' : 'Nothing here yet. Add the first habit you want to keep.'}
          </p>
        </div>
      ) : (
        <>
          <ul className="mt-4 flex flex-col gap-3">
            {habits.data.content.map((habit) => (
              <li key={habit.id} className={`${SURFACE} flex items-start justify-between gap-4 p-4 sm:p-5`}>
                <div className="min-w-0">
                  <h2 className="font-display text-xl font-semibold tracking-tight">
                    <Link to={`/habits/${habit.id}`} className="hover:text-lapis hover:underline underline-offset-2">
                      {habit.name}
                    </Link>
                  </h2>
                  <p className="mt-1 flex flex-wrap gap-x-4 text-sm text-ink-soft">
                    {habit.category && <span>{habit.category}</span>}
                    <span>{describeSchedule(habit)}</span>
                    {habit.targetCount > 1 && <span>{habit.targetCount} times a day</span>}
                    {habit.reminderTime && <span>Reminder at {habit.reminderTime}</span>}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link to={`/habits/${habit.id}/edit`} aria-label={`Edit ${habit.name}`} className={BUTTON}>
                    Edit
                  </Link>
                  {habit.archived ? (
                    <button
                      type="button"
                      aria-label={`Restore ${habit.name}`}
                      disabled={restore.isPending}
                      onClick={() => restore.mutate(habit.id)}
                      className={BUTTON}
                    >
                      Restore
                    </button>
                  ) : (
                    <button
                      type="button"
                      aria-label={`Archive ${habit.name}`}
                      disabled={archive.isPending}
                      onClick={() => archive.mutate(habit.id)}
                      className={BUTTON}
                    >
                      Archive
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {habits.data.totalPages > 1 && (
            <nav aria-label="Pages" className="mt-6 flex items-center gap-4 text-sm">
              <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className={BUTTON}>
                Previous
              </button>
              <span className="text-ink-soft">
                Page {habits.data.number + 1} of {habits.data.totalPages}
              </span>
              <button
                type="button"
                disabled={page + 1 >= habits.data.totalPages}
                onClick={() => setPage(page + 1)}
                className={BUTTON}
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </main>
  )
}
