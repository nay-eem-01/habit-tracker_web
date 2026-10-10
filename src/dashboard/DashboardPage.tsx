import { useQuery } from '@tanstack/react-query'
import { ArrowDownRight, ArrowUpRight, Fire, Plant, Target } from '@phosphor-icons/react'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getDashboard, getPatterns, type Dashboard, type HabitRate, type Patterns, type Period } from '../api/dashboard'
import { habitErrorMessage } from '../api/messages'
import { useAuth } from '../auth/context'
import { DayGrid, DayGridLegend } from '../components/DayGrid'
import { ProgressBar } from '../components/ProgressBar'
import { SECONDARY, SURFACE } from '../components/styles'
import { formatDate } from '../goals/goals'
import { LevelCard } from '../level/LevelCard'
import { formatToday } from '../today/today'
import { DAY_NAMES, formatChange, hourLabel, percent, yearWeeks } from './dashboard'

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className={`${SURFACE} p-5 sm:p-6`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

/** "+12 pts" in the link colour, "−5 pts" in the alert colour, with an arrow; nothing to compare, nothing shown. */
function Change({ change, against }: { change: number | null; against?: string }) {
  const text = formatChange(change)
  if (text === null) return null
  const up = (change ?? 0) > 0
  const down = (change ?? 0) < 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-sm font-medium ${up ? 'text-link' : down ? 'text-alert' : 'text-ink-soft'}`}>
      {up && <ArrowUpRight size={14} weight="bold" aria-hidden="true" />}
      {down && <ArrowDownRight size={14} weight="bold" aria-hidden="true" />}
      {text}
      {against && <span className="sr-only"> {against}</span>}
    </span>
  )
}

const unitOf = (n: number, unit: 'DAYS' | 'WEEKS') => `${n} ${unit === 'WEEKS' ? 'week' : 'day'}${n === 1 ? '' : 's'}`

function Hero({ dashboard }: { dashboard: Dashboard }) {
  const { due, done } = dashboard.today
  return (
    <div className="grain relative isolate overflow-hidden rounded-3xl bg-lapis-deep p-6 text-white shadow-[0_24px_40px_-24px_rgb(9_38_52/0.9)] sm:col-span-2 sm:p-8">
      <Link to="/today" className="block transition-transform duration-150 ease-out active:scale-[0.99]">
        <p className="text-sm text-white/75">Today</p>
        <p className="mt-1 font-display text-5xl font-semibold tracking-tight">
          {due === 0 ? 'A day off' : done >= due ? 'All done' : `${done} of ${due} done`}
        </p>
        <p className="mt-1 text-white/75">
          {due === 0 ? 'Nothing is scheduled today.' : done >= due ? 'Every habit due today is finished.' : 'Open Today to check in.'}
        </p>
      </Link>
      {dashboard.atRisk.length > 0 && (
        <div className="mt-5 border-t border-white/15 pt-4">
          <p className="text-sm font-medium text-white/85">These streaks end tonight unless you check in</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {dashboard.atRisk.map((habit) => (
              <li key={habit.habitId}>
                <Link
                  to="/today"
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-sm transition-colors hover:bg-white/20"
                >
                  <Fire size={16} weight="fill" className="text-ember" aria-hidden="true" />
                  <span className="font-medium">{habit.name}</span>
                  <span className="text-white/75">
                    {unitOf(habit.streak, habit.streakUnit)}
                    {habit.needed > 1 ? ` · ${habit.needed} check-ins to go` : ''}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function Completion({ completion }: { completion: Dashboard['completion'] }) {
  const rows: [string, Period][] = [
    ['7 days', completion.last7Days],
    ['30 days', completion.last30Days],
    ['90 days', completion.last90Days],
  ]
  return (
    <Card title="Completion">
      <dl className="mt-4 grid grid-cols-3 gap-3">
        {rows.map(([label, period]) => (
          <div key={label}>
            <dt className="text-sm text-ink-soft">{label}</dt>
            <dd className="mt-1 font-display text-3xl font-semibold text-link sm:text-4xl">{percent(period.rate)}</dd>
            <dd>
              <Change change={period.change} against={`against the ${label} before`} />
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-sm text-ink-soft">
        {completion.last30Days.rate === null
          ? 'Nothing was due yet.'
          : `${Math.round(completion.last30Days.done)} of ${Math.round(completion.last30Days.expected)} due days done in the last 30. Changes compare with the same stretch before.`}
      </p>
    </Card>
  )
}

function RateList({ title, habits, empty }: { title: string; habits: HabitRate[]; empty: string }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-ink-soft">{title}</h3>
      {habits.length === 0 ? (
        <p className="mt-1.5 text-sm text-ink-soft">{empty}</p>
      ) : (
        <ol className="mt-1.5 flex flex-col gap-2">
          {habits.map((habit) => (
            <li key={habit.habitId} className="flex items-baseline justify-between gap-3">
              <Link to={`/habits/${habit.habitId}`} className="truncate font-medium hover:text-link hover:underline underline-offset-2">
                {habit.name}
              </Link>
              <span className="flex shrink-0 items-baseline gap-2">
                <span className="font-semibold">{percent(habit.rate)}</span>
                <Change change={habit.change} against="against the 30 days before" />
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function Momentum({ dashboard }: { dashboard: Dashboard }) {
  return (
    <Card title="Last 30 days">
      <div className="mt-4 grid gap-5">
        {/* the server sends the top three even at 0%, which isn't going well */}
        <RateList
          title="Going well"
          habits={dashboard.best.filter((habit) => (habit.rate ?? 0) > 0)}
          empty="Nothing finished yet this month."
        />
        <RateList title="Slipping" habits={dashboard.slipping} empty="Nothing is slipping. Nice." />
      </div>
    </Card>
  )
}

function Goals({ goals }: { goals: Dashboard['goals'] }) {
  return (
    <Card
      title="Goals"
      action={
        <Link to="/goals" className="text-sm font-medium text-link underline underline-offset-2">
          All goals
        </Link>
      }
    >
      {goals.length === 0 ? (
        <p className="mt-4 text-ink-soft">
          <Link to="/goals/new" className="font-medium text-link underline underline-offset-2">
            Set a goal
          </Link>{' '}
          and link the habits that get you there.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-4">
          {goals.map((goal) => (
            <li key={goal.goalId}>
              <Link to={`/goals/${goal.goalId}`} className="group block">
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2 font-medium group-hover:text-link">
                    <Target size={18} weight="duotone" className="shrink-0 text-link" aria-hidden="true" />
                    <span className="truncate">{goal.title}</span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-link">{goal.percent}%</span>
                </div>
                <ProgressBar percent={goal.percent} />
                {goal.targetDate && <p className="mt-1 text-sm text-ink-soft">By {formatDate(goal.targetDate)}</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

/** The year as a heatmap; on a narrow screen it scrolls sideways and opens on the latest weeks. */
function Year({ patterns }: { patterns: Patterns }) {
  const scroller = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth
  }, [patterns])
  const weeks = yearWeeks(patterns.heatmap)
  const expected = patterns.heatmap.filter((day) => day.expected > 0)
  const full = expected.filter((day) => day.ratio === 1).length
  return (
    <Card title="The last year">
      <div ref={scroller} className="mt-4 overflow-x-auto pb-1">
        <div className="min-w-[640px]">
          <DayGrid weeks={weeks} label={`Every due habit done on ${full} of the last ${expected.length} days with something due`} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-soft">
          Everything done on {full} of {expected.length} days. Darker means more of the day’s habits done.
        </p>
        <DayGridLegend />
      </div>
    </Card>
  )
}

function Weekdays({ patterns }: { patterns: Patterns }) {
  const rates = patterns.weekdays.map((day) => day.rate ?? 0)
  // with every day at the same rate (all 0% early on) there is no strongest or weakest, whatever ties say
  const varied = Math.max(...rates) > Math.min(...rates)
  const strongestDay = varied ? patterns.strongestDay : null
  const weakestDay = varied ? patterns.weakestDay : null
  return (
    <Card title="By weekday">
      {strongestDay === null ? (
        <p className="mt-4 text-ink-soft">Not enough days yet. Give it a couple of weeks.</p>
      ) : (
        <>
          <div
            role="img"
            aria-label={`Completion by weekday over the last 12 weeks: ${patterns.weekdays
              .map((day) => `${DAY_NAMES[day.day].long} ${percent(day.rate)}`)
              .join(', ')}`}
            className="mt-4 flex h-28 items-end gap-2"
          >
            {patterns.weekdays.map((day) => (
              <div key={day.day} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <div
                  title={`${DAY_NAMES[day.day].long}: ${percent(day.rate)}`}
                  className={`w-full rounded-t-md transition-[height] duration-500 ease-out motion-reduce:transition-none ${
                    day.day === strongestDay ? 'bg-lapis' : day.day === weakestDay ? 'bg-ember' : 'bg-lapis/45'
                  }`}
                  style={{ height: day.rate ? `${Math.max(day.rate * 100, 3)}%` : '3px' }}
                />
              </div>
            ))}
          </div>
          <div aria-hidden="true" className="mt-1.5 flex gap-2 text-center text-xs text-ink-soft">
            {patterns.weekdays.map((day) => (
              <span key={day.day} className="flex-1">
                {DAY_NAMES[day.day].short}
              </span>
            ))}
          </div>
          <p className="mt-3 text-sm text-ink-soft">
            Strongest on <span className="font-medium text-ink">{DAY_NAMES[strongestDay].long}s</span>
            {weakestDay && weakestDay !== strongestDay && (
              <>
                , weakest on <span className="font-medium text-ink">{DAY_NAMES[weakestDay].long}s</span>
              </>
            )}
            . Daily and weekday habits, last 12 weeks.
          </p>
        </>
      )}
    </Card>
  )
}

function Hours({ patterns }: { patterns: Patterns }) {
  const top = Math.max(...patterns.hours, 1)
  const total = patterns.hours.reduce((sum, n) => sum + n, 0)
  return (
    <Card title="Time of day">
      {patterns.peakHour === null ? (
        <p className="mt-4 text-ink-soft">No check-ins in the last 90 days yet.</p>
      ) : (
        <>
          <div
            role="img"
            aria-label={`Check-ins by hour over the last 90 days; most around ${hourLabel(patterns.peakHour)}`}
            className="mt-4 flex h-28 items-end gap-[2px]"
          >
            {patterns.hours.map((count, hour) => (
              <div
                key={hour}
                title={`${hourLabel(hour)}: ${count}`}
                className={`flex-1 rounded-t-sm ${hour === patterns.peakHour ? 'bg-lapis' : 'bg-lapis/45'}`}
                style={{ height: count === 0 ? '2px' : `${(count / top) * 100}%` }}
              />
            ))}
          </div>
          <div aria-hidden="true" className="mt-1.5 flex justify-between text-xs text-ink-soft">
            <span>midnight</span>
            <span>6 am</span>
            <span>noon</span>
            <span>6 pm</span>
            <span>11 pm</span>
          </div>
          <p className="mt-3 text-sm text-ink-soft">
            Most check-ins around <span className="font-medium text-ink">{hourLabel(patterns.peakHour)}</span>, out of {total} in
            the last 90 days.
          </p>
        </>
      )}
    </Card>
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
  // one cheap call: fetched fresh on every visit, so check-ins made elsewhere show at once
  const dashboard = useQuery({ queryKey: ['dashboard'], queryFn: getDashboard, staleTime: 0 })
  const patterns = useQuery({ queryKey: ['dashboard', 'patterns'], queryFn: getPatterns, staleTime: 60_000 })

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-1 text-ink-soft">{formatToday(timezone)}</p>

      {dashboard.isPending ? (
        <Skeleton />
      ) : dashboard.isError ? (
        <div className="mt-8">
          <p role="alert" className="text-alert">
            {habitErrorMessage(dashboard.error)}
          </p>
          <button type="button" onClick={() => dashboard.refetch()} className={`${SECONDARY} mt-3`}>
            Try again
          </button>
        </div>
      ) : dashboard.data.today.habits.length === 0 ? (
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
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Hero dashboard={dashboard.data} />
            <div className="sm:col-span-2">
              <Completion completion={dashboard.data.completion} />
            </div>
            <Momentum dashboard={dashboard.data} />
            <Goals goals={dashboard.data.goals} />
            <div className="sm:col-span-2">
              <LevelCard level={dashboard.data.level} />
            </div>
          </div>

          <section aria-labelledby="patterns" className="mt-10">
            <h2 id="patterns" className="font-display text-2xl font-semibold tracking-tight">
              Patterns
            </h2>
            {patterns.isError ? (
              <div className="mt-3">
                <p role="alert" className="text-alert">
                  {habitErrorMessage(patterns.error)}
                </p>
                <button type="button" onClick={() => patterns.refetch()} className={`${SECONDARY} mt-3`}>
                  Try again
                </button>
              </div>
            ) : !patterns.data ? (
              <div role="status" aria-label="Loading patterns" className="mt-3 h-56 animate-pulse rounded-2xl bg-mist/45" />
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Year patterns={patterns.data} />
                </div>
                <Weekdays patterns={patterns.data} />
                <Hours patterns={patterns.data} />
              </div>
            )}
          </section>
        </>
      )}
    </main>
  )
}
