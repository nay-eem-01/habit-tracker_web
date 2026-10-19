import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, ArrowCounterClockwise, BellSimple, CalendarBlank, PencilSimple, Plant, Plus, Tag } from '@phosphor-icons/react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { archiveHabit, listHabits, unarchiveHabit, type Habit } from '../api/habits'
import { habitErrorMessage } from '../api/messages'
import { RowMenu } from '../components/RowMenu'
import { PAGE, PAGE_TITLE, PRIMARY, SECONDARY, TABS, TEXT_BUTTON, tab } from '../components/styles'
import { describeSchedule } from './form'

const BUTTON = SECONDARY

/** One fact about a habit, with a small icon so the line scans. */
function Meta({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden="true" className="text-ink-soft/80">
        {icon}
      </span>
      <span>{children}</span>
    </span>
  )
}

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
    <main className={PAGE}>
      <div className="flex items-end justify-between gap-4">
        <h1 className={PAGE_TITLE}>Habits</h1>
        <Link to="/habits/new" className={`${PRIMARY} h-11 px-4 sm:px-5`}>
          <Plus size={18} weight="bold" aria-hidden="true" />
          New habit
        </Link>
      </div>

      <div className={`mt-6 ${TABS}`}>
        {[
          { label: 'Active', value: false },
          { label: 'Archived', value: true },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => showTab(item.value)}
            aria-current={archived === item.value ? 'true' : undefined}
            className={tab(archived === item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {notice && (
        <p role="status" className="mt-4 flex items-center gap-3 rounded-xl bg-wash px-4 py-2 text-[0.9375rem]">
          <span>
            {notice.kind === 'archived' ? 'Archived' : 'Restored'} “{notice.habit.name}”.
          </span>
          {notice.kind === 'archived' && (
            <button type="button" onClick={() => restore.mutate(notice.habit.id)} className={TEXT_BUTTON}>
              Undo
            </button>
          )}
        </p>
      )}
      {failure && (
        <p role="alert" className="mt-4 text-[0.9375rem] text-alert">
          {habitErrorMessage(failure)}
        </p>
      )}

      {habits.isPending ? (
        <div role="status" aria-label="Loading habits" className="mt-6 flex animate-pulse flex-col gap-6">
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <div className="h-5 w-1/2 rounded-md bg-mist/70" />
              <div className="mt-2 h-4 w-3/4 rounded-md bg-mist/50" />
            </div>
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
        <div className="mt-6 flex flex-col items-start rounded-2xl bg-wash px-6 py-10 sm:items-center sm:py-14 sm:text-center">
          <span aria-hidden="true" className="grid size-12 place-items-center rounded-xl bg-surface text-link ring-1 ring-mist">
            {archived ? <Archive size={26} weight="duotone" /> : <Plant size={26} weight="duotone" />}
          </span>
          <p className="mt-4 max-w-sm text-ink-soft">
            {archived ? 'No archived habits.' : 'Nothing here yet. Add the first habit you want to keep.'}
          </p>
        </div>
      ) : (
        <>
          <ul className="mt-4 divide-y divide-mist border-t border-mist">
            {habits.data.content.map((habit) => (
              <li key={habit.id} className="flex items-start gap-3 py-4">
                <div className="min-w-0 flex-1">
                  <h2 className={`font-display text-lg leading-snug font-semibold tracking-tight sm:text-xl ${habit.archived ? 'text-ink-soft' : ''}`}>
                    <Link to={`/habits/${habit.id}`} className="underline-offset-[3px] hover:text-link hover:underline">
                      {habit.name}
                    </Link>
                  </h2>
                  <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[0.9375rem] text-ink-soft">
                    <Meta icon={<CalendarBlank size={16} weight="bold" />}>{habit.kind === 'QUIT' ? 'Quitting' : describeSchedule(habit)}</Meta>
                    {habit.targetCount > 1 && (
                      <span>
                        {habit.targetCount} {habit.unit ?? 'times'} a day
                      </span>
                    )}
                    {habit.reminderTime && <Meta icon={<BellSimple size={16} weight="bold" />}>{`Reminder at ${habit.reminderTime}`}</Meta>}
                    {habit.category && <Meta icon={<Tag size={16} weight="bold" />}>{habit.category}</Meta>}
                  </p>
                </div>
                {habit.archived && (
                  <button
                    type="button"
                    aria-label={`Restore ${habit.name}`}
                    disabled={restore.isPending}
                    onClick={() => restore.mutate(habit.id)}
                    className={`${BUTTON} h-10`}
                  >
                    Restore
                  </button>
                )}
                <RowMenu
                  label={`More for ${habit.name}`}
                  items={[
                    { label: 'Edit', icon: <PencilSimple size={18} />, render: <Link to={`/habits/${habit.id}/edit`} /> },
                    habit.archived
                      ? { label: 'Restore', icon: <ArrowCounterClockwise size={18} />, disabled: restore.isPending, onSelect: () => restore.mutate(habit.id) }
                      : { label: 'Archive', icon: <Archive size={18} />, disabled: archive.isPending, onSelect: () => archive.mutate(habit.id) },
                  ]}
                />
              </li>
            ))}
          </ul>
          {habits.data.totalPages > 1 && (
            <nav aria-label="Pages" className="mt-6 flex items-center gap-4 text-[0.9375rem]">
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
