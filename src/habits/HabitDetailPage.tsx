import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getStats, getStreak, listLogs, type WindowStats } from '../api/checkins'
import { getHabit } from '../api/habits'
import { habitErrorMessage } from '../api/messages'
import { useAuth } from '../auth/context'
import { formatDay, shiftDays } from '../today/today'
import { useToday } from '../today/useToday'
import { describeSchedule } from './form'

const BUTTON = 'rounded-md border border-mist px-3 py-1.5 text-sm font-medium hover:border-ink-soft disabled:opacity-60'

/** How far back the history reaches; the API allows up to a year. */
const HISTORY_DAYS = 90

const NOT_FOUND = "This habit doesn't exist, or it isn't yours."

function percent(rate: number | null): string {
  return rate === null ? '–' : `${Math.round(rate * 100)}%`
}

function Window({ label, stats }: { label: string; stats: WindowStats }) {
  return (
    <div className="border-t border-mist pt-3">
      <dt className="text-sm text-ink-soft">{label}</dt>
      <dd className="mt-1 font-display text-3xl font-semibold text-lapis">{percent(stats.rate)}</dd>
      <dd className="text-sm text-ink-soft">
        {stats.rate === null ? 'Nothing was due yet' : `${stats.done} of ${Math.round(stats.expected)} done`}
      </dd>
    </div>
  )
}

export default function HabitDetailPage() {
  const id = Number(useParams().id)
  const { state } = useAuth()
  const timezone = state.status === 'authenticated' ? state.user.timezone : 'UTC'
  const today = useToday(timezone)
  const [page, setPage] = useState(0)

  const habit = useQuery({ queryKey: ['habit', id], queryFn: () => getHabit(id), enabled: Number.isInteger(id) })
  const streak = useQuery({ queryKey: ['streak', id], queryFn: () => getStreak(id), enabled: habit.isSuccess })
  const stats = useQuery({ queryKey: ['stats', id], queryFn: () => getStats(id), enabled: habit.isSuccess })
  const since = shiftDays(today, -HISTORY_DAYS)
  const logs = useQuery({
    queryKey: ['logs', id, 'history', since, page],
    queryFn: () => listLogs(id, { from: since, page }),
    enabled: habit.isSuccess,
    placeholderData: keepPreviousData,
  })

  if (habit.isPending && habit.fetchStatus !== 'idle') {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <p role="status" className="text-ink-soft">
          Loading habit…
        </p>
      </main>
    )
  }
  if (!habit.data) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <p role="alert" className="text-alert">
          {habit.error ? habitErrorMessage(habit.error) : NOT_FOUND}
        </p>
        <Link to="/habits" className="mt-3 inline-block font-medium text-lapis underline underline-offset-2">
          Back to habits
        </Link>
      </main>
    )
  }

  const { name, category, targetCount, reminderTime, archived } = habit.data
  const unit = streak.data?.unit === 'WEEKS' ? 'week' : 'day'
  const plural = (n: number) => `${n} ${unit}${n === 1 ? '' : 's'}`

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link to="/habits" className="text-sm font-medium text-lapis underline underline-offset-2">
        All habits
      </Link>
      <div className="mt-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-4xl font-semibold tracking-tight">{name}</h1>
          <p className="mt-1 flex flex-wrap gap-x-4 text-ink-soft">
            {category && <span>{category}</span>}
            <span>{describeSchedule(habit.data)}</span>
            {targetCount > 1 && <span>{targetCount} times a day</span>}
            {reminderTime && <span>Reminder at {reminderTime}</span>}
            {archived && <span>Archived</span>}
          </p>
        </div>
        <Link to={`/habits/${id}/edit`} aria-label={`Edit ${name}`} className={`${BUTTON} shrink-0`}>
          Edit
        </Link>
      </div>

      <section aria-labelledby="progress" className="mt-8">
        <h2 id="progress" className="font-display text-2xl font-semibold tracking-tight">
          Progress
        </h2>
        {streak.isError || stats.isError ? (
          <p role="alert" className="mt-3 text-alert">
            {habitErrorMessage(streak.error ?? stats.error)}
          </p>
        ) : !streak.data || !stats.data ? (
          <p role="status" className="mt-3 text-ink-soft">
            Loading progress…
          </p>
        ) : (
          <dl className="mt-3 grid gap-6 sm:grid-cols-4">
            <div className="border-t border-mist pt-3">
              <dt className="text-sm text-ink-soft">Current streak</dt>
              <dd className="mt-1 font-display text-3xl font-semibold text-ember-deep">
                {plural(streak.data.current)}
              </dd>
            </div>
            <div className="border-t border-mist pt-3">
              <dt className="text-sm text-ink-soft">Longest streak</dt>
              <dd className="mt-1 font-display text-3xl font-semibold">{plural(streak.data.longest)}</dd>
            </div>
            <Window label="Last 7 days" stats={stats.data.last7Days} />
            <Window label="Last 30 days" stats={stats.data.last30Days} />
          </dl>
        )}
      </section>

      <section aria-labelledby="history" className="mt-10">
        <h2 id="history" className="font-display text-2xl font-semibold tracking-tight">
          History
        </h2>
        {logs.isError ? (
          <div className="mt-3">
            <p role="alert" className="text-alert">
              {habitErrorMessage(logs.error)}
            </p>
            <button type="button" onClick={() => logs.refetch()} className={`${BUTTON} mt-3`}>
              Try again
            </button>
          </div>
        ) : !logs.data ? (
          <p role="status" className="mt-3 text-ink-soft">
            Loading history…
          </p>
        ) : logs.data.content.length === 0 ? (
          <p className="mt-3 text-ink-soft">No check-ins in the last {HISTORY_DAYS} days.</p>
        ) : (
          <>
            <ul className="mt-2">
              {logs.data.content.map((log) => (
                <li key={log.date} className="flex items-baseline justify-between gap-4 border-b border-mist py-3">
                  <span className="font-medium">{formatDay(log.date)}</span>
                  <span className={log.done ? 'font-medium text-lapis' : 'text-ink-soft'}>
                    {targetCount > 1 ? `${log.completedCount} of ${targetCount}` : log.done ? 'Done' : 'Not done'}
                  </span>
                  {log.note && <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">{log.note}</span>}
                </li>
              ))}
            </ul>
            {logs.data.totalPages > 1 && (
              <nav aria-label="Pages" className="mt-6 flex items-center gap-4 text-sm">
                <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className={BUTTON}>
                  Previous
                </button>
                <span className="text-ink-soft">
                  Page {logs.data.number + 1} of {logs.data.totalPages}
                </span>
                <button
                  type="button"
                  disabled={page + 1 >= logs.data.totalPages}
                  onClick={() => setPage(page + 1)}
                  className={BUTTON}
                >
                  Next
                </button>
              </nav>
            )}
          </>
        )}
      </section>
    </main>
  )
}
