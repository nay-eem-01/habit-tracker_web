import { useQueries, useQuery } from '@tanstack/react-query'
import { Fire, Plant } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { getStats, getStreak, listLogs } from '../api/checkins'
import { listHabits } from '../api/habits'
import { habitErrorMessage } from '../api/messages'
import { useAuth } from '../auth/context'
import { DayGrid, DayGridLegend } from '../components/DayGrid'
import { SECONDARY, SURFACE } from '../components/styles'
import { formatDay, formatToday, todayStatus } from '../today/today'
import { doneOf } from '../habits/detail'
import { LevelCard } from '../level/LevelCard'
import { useLevel } from '../level/useLevel'
import { useToday } from '../today/useToday'
import { activityStart, activityWeeks, combineStats, topStreaks, type ActivityDay } from './dashboard'

/** One request covers every active habit; a user with more than this many sees the first of them. */
const MAX_HABITS = 100
/** The activity grid's whole span fits in one page of logs per habit. */
const LOGS_PAGE = 100

const percent = (rate: number | null) => (rate === null ? '–' : `${Math.round(rate * 100)}%`)

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={`${SURFACE} p-5 sm:p-6`}>
      <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  )
}

function Rate({ label, rate, detail }: { label: string; rate: number | null; detail: string }) {
  return (
    <div>
      <dt className="text-sm text-ink-soft">{label}</dt>
      <dd className="mt-1 font-display text-4xl font-semibold text-link">{percent(rate)}</dd>
      <dd className="text-sm text-ink-soft">{detail}</dd>
    </div>
  )
}

function ActivityGrid({ weeks }: { weeks: ActivityDay[][] }) {
  const days = weeks.flat().filter((day) => !day.future)
  const active = days.filter((day) => day.done > 0).length
  const grid = weeks.map((week) =>
    week.map((day) => ({ date: day.date, level: day.level, blank: day.future, title: `${formatDay(day.date)}: ${day.done} done` })),
  )
  return (
    <div className="mt-4">
      <DayGrid weeks={grid} label={`At least one habit finished on ${active} of the last ${days.length} days`} />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-soft">The darker the day, the more of your habits you finished.</p>
        <DayGridLegend />
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div role="status" aria-label="Loading dashboard" className="mt-6 grid animate-pulse gap-4 sm:grid-cols-2">
      <div className="h-36 rounded-3xl bg-mist/60 sm:col-span-2" />
      <div className="h-40 rounded-2xl bg-mist/45" />
      <div className="h-40 rounded-2xl bg-mist/45" />
      <div className="h-48 rounded-2xl bg-mist/45 sm:col-span-2" />
    </div>
  )
}

export default function DashboardPage() {
  const { state } = useAuth()
  const timezone = state.status === 'authenticated' ? state.user.timezone : 'UTC'
  const today = useToday(timezone)
  const since = activityStart(today)

  const level = useLevel()
  const habits = useQuery({
    queryKey: ['habits', { archived: false, all: true }],
    queryFn: () => listHabits({ archived: false, page: 0, size: MAX_HABITS }),
  })
  const list = habits.data?.content ?? []

  const logs = useQueries({
    queries: list.map((habit) => ({
      queryKey: ['logs', habit.id, 'activity', since],
      queryFn: () => listLogs(habit.id, { from: since, size: LOGS_PAGE }),
    })),
  })
  const streaks = useQueries({
    queries: list.map((habit) => ({ queryKey: ['streak', habit.id], queryFn: () => getStreak(habit.id) })),
  })
  const stats = useQueries({
    queries: list.map((habit) => ({ queryKey: ['stats', habit.id], queryFn: () => getStats(habit.id) })),
  })

  const all = [...logs, ...streaks, ...stats]
  const loading = habits.isPending || all.some((result) => result.isPending)
  const failed = habits.error ?? all.find((result) => result.error)?.error

  const logsByHabit = logs.map((result) => result.data?.content ?? [])
  const items = list
    .map((habit, index) => ({ habit, status: todayStatus(habit, logsByHabit[index], today) }))
    .filter((item) => item.status.due)
  const doneToday = items.filter((item) => item.status.done).length
  const combined = combineStats(stats.flatMap((result) => (result.data ? [result.data] : [])))
  const top = topStreaks(list.flatMap((habit, index) => (streaks[index]?.data ? [{ habit, streak: streaks[index].data }] : [])))
  const weeks = activityWeeks(logsByHabit, list.length, today)

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-1 text-ink-soft">{formatToday(timezone)}</p>

      {loading && !failed ? (
        <Skeleton />
      ) : failed ? (
        <div className="mt-8">
          <p role="alert" className="text-alert">
            {habitErrorMessage(failed)}
          </p>
          <button
            type="button"
            onClick={() => {
              void habits.refetch()
              all.forEach((result) => void result.refetch())
            }}
            className={`${SECONDARY} mt-3`}
          >
            Try again
          </button>
        </div>
      ) : list.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-3xl border border-dashed border-mist px-6 py-14 text-center text-ink-soft">
          <Plant size={40} weight="duotone" className="text-link" aria-hidden="true" />
          <p className="mt-3 font-display text-2xl font-semibold tracking-tight text-ink">Nothing to show yet</p>
          <p className="mt-1">
            <Link to="/habits/new" className="font-medium text-link underline underline-offset-2">
              Add a habit
            </Link>{' '}
            and your progress will build up here.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Link
            to="/today"
            className="grain relative isolate overflow-hidden rounded-3xl bg-lapis-deep p-6 text-white shadow-[0_24px_40px_-24px_rgb(34_50_143/0.9)] transition-transform duration-150 ease-out active:scale-[0.99] sm:col-span-2 sm:p-8"
          >
            <p className="text-sm text-white/75">Today</p>
            <p className="mt-1 font-display text-5xl font-semibold tracking-tight">
              {items.length === 0 ? 'A day off' : `${doneToday} of ${items.length} done`}
            </p>
            <p className="mt-1 text-white/75">{items.length === 0 ? 'Nothing is scheduled today.' : 'Open Today to check in.'}</p>
          </Link>

          <Card title="Completion">
            <dl className="mt-4 grid grid-cols-2 gap-4">
              <Rate
                label="Last 7 days"
                rate={combined.last7.rate}
                detail={combined.last7.rate === null ? 'Nothing was due yet' : doneOf(combined.last7.done, combined.last7.expected)}
              />
              <Rate
                label="Last 30 days"
                rate={combined.last30.rate}
                detail={combined.last30.rate === null ? 'Nothing was due yet' : doneOf(combined.last30.done, combined.last30.expected)}
              />
            </dl>
          </Card>

          <Card title="Longest streaks">
            {top.length === 0 ? (
              <p className="mt-4 text-ink-soft">No streak running. Finish a habit today to start one.</p>
            ) : (
              <ol className="mt-4 flex flex-col gap-3">
                {top.map(({ habit, streak }) => (
                  <li key={habit.id}>
                    <Link to={`/habits/${habit.id}`} className="flex items-center justify-between gap-3">
                      <span className="truncate font-medium">{habit.name}</span>
                      <span className="flex shrink-0 items-center gap-1 text-ember-deep">
                        <Fire size={18} weight="fill" aria-hidden="true" />
                        {streak.current} {streak.unit === 'WEEKS' ? 'week' : 'day'}
                        {streak.current === 1 ? '' : 's'}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          {level.data && (
            <div className="sm:col-span-2">
              <LevelCard level={level.data} />
            </div>
          )}

          <div className="sm:col-span-2">
            <Card title="Last 12 weeks">
              <ActivityGrid weeks={weeks} />
            </Card>
          </div>
        </div>
      )}
    </main>
  )
}
