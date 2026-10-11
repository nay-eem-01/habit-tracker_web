import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Target } from '@phosphor-icons/react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getStats, getStreak, listLogs, type HabitLog, type Streak, type WindowStats } from '../api/checkins'
import { getGoal, getGoalProgress } from '../api/goals'
import { deleteHabit, getHabit, type Habit } from '../api/habits'
import { habitErrorMessage } from '../api/messages'
import { DayGrid, DayGridLegend } from '../components/DayGrid'
import { ProgressBar } from '../components/ProgressBar'
import { Ring } from '../components/Ring'
import { SECONDARY, SURFACE } from '../components/styles'
import { useAuth } from '../auth/context'
import { formatDay, shiftDays } from '../today/today'
import { useToday } from '../today/useToday'
import { doneOf, HEATMAP_WEEKS, habitHeatmap, heatmapStart, weeklyGoal, weeklyTotals, type WeekTotal } from './detail'
import { describeSchedule } from './form'

const BUTTON = SECONDARY

/** How far back the history reaches; the API allows up to a year. */
const HISTORY_DAYS = 90

const NOT_FOUND = "This habit doesn't exist, or it isn't yours."

function percent(rate: number | null): string {
  return rate === null ? '–' : `${Math.round(rate * 100)}%`
}

/** The API's page cap; a half-year heatmap needs two pages at most. */
const LOGS_PAGE = 100

/** Every log from `from` to today, following the pages. */
async function allLogs(habitId: number, from: string): Promise<HabitLog[]> {
  const logs: HabitLog[] = []
  for (let page = 0; ; page++) {
    const result = await listLogs(habitId, { from, page, size: LOGS_PAGE })
    logs.push(...result.content)
    if (page + 1 >= result.totalPages) return logs
  }
}

function Window({ label, stats }: { label: string; stats: WindowStats }) {
  return (
    <div className={`${SURFACE} flex items-center gap-4 p-4`}>
      <Ring rate={stats.rate}>
        <span className="font-display text-xl font-semibold text-link">{percent(stats.rate)}</span>
      </Ring>
      <div>
        <dt className="text-sm text-ink-soft">{label}</dt>
        <dd className="mt-1 font-medium">
          {stats.rate === null ? 'Nothing was due yet' : doneOf(stats.done, stats.expected)}
        </dd>
      </div>
    </div>
  )
}

/** The current run against the best one, as a bar: how close this streak is to a new record. */
function StreakBar({ streak, plural }: { streak: Streak; plural: (n: number) => string }) {
  const record = streak.current > 0 && streak.current >= streak.longest
  const share = streak.longest > 0 ? Math.min(streak.current / streak.longest, 1) : 0
  return (
    <div className="rounded-2xl bg-ember/15 p-4 sm:col-span-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <div>
          <dt className="text-sm text-ink-soft">Current streak</dt>
          <dd className="mt-1 font-display text-3xl font-semibold text-ember-deep">{plural(streak.current)}</dd>
        </div>
        <div className="text-right">
          <dt className="text-sm text-ink-soft">Longest streak</dt>
          <dd className="mt-1 font-display text-3xl font-semibold">{plural(streak.longest)}</dd>
        </div>
      </div>
      <div aria-hidden="true" className="mt-4 h-2.5 overflow-hidden rounded-full bg-ember/20">
        <div
          className="h-full rounded-full bg-ember transition-[width] duration-500 ease-out motion-reduce:transition-none"
          style={{ width: `${share * 100}%` }}
        />
      </div>
      <dd className="mt-2 text-sm text-ink-soft">
        {record
          ? 'This is your best run yet.'
          : streak.longest === 0
            ? 'Finish it once to start a streak.'
            : `${plural(streak.longest - streak.current)} to beat your best.`}
      </dd>
    </div>
  )
}

const shortDate = (date: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(new Date(`${date}T00:00:00Z`))

/** Days done per week as bars, with the weekly goal as a dashed line. */
function WeeklyBars({ totals, goal }: { totals: WeekTotal[]; goal: number }) {
  const top = Math.max(goal, ...totals.map((week) => week.done), 1)
  const met = totals.slice(0, -1).filter((week) => goal > 0 && week.done >= goal).length
  return (
    <div>
      <div
        role="img"
        aria-label={`Days done per week, oldest first: ${totals.map((week) => week.done).join(', ')}. Goal ${goal} a week.`}
        className="relative flex h-32 items-end gap-1.5 sm:gap-2"
      >
        {goal > 0 && (
          <div
            aria-hidden="true"
            className="absolute inset-x-0 border-t border-dashed border-ink-soft/60"
            style={{ bottom: `${(goal / top) * 100}%` }}
          />
        )}
        {totals.map((week, index) => (
          <div
            key={week.start}
            title={`Week of ${shortDate(week.start)}: ${week.done} done`}
            className={`flex-1 rounded-t-md transition-[height] duration-500 ease-out motion-reduce:transition-none ${
              index === totals.length - 1 ? 'bg-lapis/45' : goal > 0 && week.done >= goal ? 'bg-lapis' : 'bg-lapis/70'
            }`}
            style={{ height: week.done === 0 ? '3px' : `${(week.done / top) * 100}%` }}
          />
        ))}
      </div>
      <div aria-hidden="true" className="mt-2 flex justify-between text-xs text-ink-soft">
        <span>{shortDate(totals[0].start)}</span>
        <span>This week</span>
      </div>
      <p className="mt-3 text-sm text-ink-soft">
        {goal > 0
          ? `Goal met in ${met} of the last ${totals.length - 1} full weeks. The dashed line is the goal: ${goal} a week.`
          : 'Days done each week.'}
      </p>
    </div>
  )
}

/** The goal this habit is linked to, and how far its done days have got toward the target. */
function GoalLink({ habitId, goalId }: { habitId: number; goalId: number }) {
  const goal = useQuery({ queryKey: ['goal', goalId], queryFn: () => getGoal(goalId) })
  const progress = useQuery({ queryKey: ['goal-progress', goalId], queryFn: () => getGoalProgress(goalId) })
  const mine = progress.data?.habits.find((habit) => habit.habitId === habitId)
  if (!goal.data) return null
  return (
    <Link
      to={`/goals/${goalId}`}
      className={`${SURFACE} mt-6 flex items-center gap-4 p-4 transition-transform duration-150 ease-out active:scale-[0.99] sm:p-5`}
    >
      <Target size={28} weight="duotone" className="shrink-0 text-link" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink-soft">Toward the goal</p>
        <p className="truncate font-medium">{goal.data.title}</p>
        {mine && (
          <div className="mt-2 flex items-center gap-3">
            <div className="flex-1">
              <ProgressBar percent={mine.percent} muted={mine.archived} />
            </div>
            <span className="shrink-0 text-sm text-ink-soft">
              {mine.doneDays} of {mine.goalTargetDays} done days
            </span>
          </div>
        )}
      </div>
    </Link>
  )
}

function Charts({ habit, logs, today }: { habit: Habit; logs: HabitLog[]; today: string }) {
  const weeks = habitHeatmap(habit, logs, today)
  const days = weeks.flat().filter((day) => !day.blank)
  const done = days.filter((day) => day.level === 4).length
  return (
    <div className="mt-3 grid gap-3 lg:grid-cols-[3fr_2fr]">
      <div className={`${SURFACE} p-4 sm:p-5`}>
        <h3 className="font-medium">Last {HEATMAP_WEEKS} weeks</h3>
        <div className="mt-3">
          <DayGrid weeks={weeks} label={`Done on ${done} of the last ${days.length} days`} />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-ink-soft">
            Done on {done} of {days.length} days
          </p>
          <DayGridLegend />
        </div>
      </div>
      <div className={`${SURFACE} p-4 sm:p-5`}>
        <h3 className="font-medium">Week by week</h3>
        <div className="mt-3">
          <WeeklyBars totals={weeklyTotals(logs, today)} goal={weeklyGoal(habit)} />
        </div>
      </div>
    </div>
  )
}

/** One history row in words: a rest day, a slip, a count, or done. */
function logLabel(log: HabitLog, habit: Habit): string {
  if (log.rest) return log.restCostXp ? `Rest day, ${log.restCostXp} XP` : 'Rest day'
  if (habit.kind === 'QUIT') return log.completedCount > 0 ? 'Slipped' : 'Clean'
  if (habit.targetCount > 1) return `${log.completedCount} of ${habit.targetCount}`
  return log.done ? 'Done' : 'Not done'
}

/** Gone for good, after a second tap. Archive is the gentler way out, so the confirm says what goes. */
function DeleteHabit({ habit }: { habit: Habit }) {
  const [confirming, setConfirming] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const remove = useMutation({
    mutationFn: () => deleteHabit(habit.id),
    onSuccess: async () => {
      // the cached lists still hold it: drop them so the list never flashes it; its XP and goal progress went too
      queryClient.removeQueries({ queryKey: ['habits'] })
      await Promise.all(['level', 'dashboard', 'goals'].map((key) => queryClient.invalidateQueries({ queryKey: [key] })))
      navigate('/habits')
    },
  })
  return (
    <section aria-label="Delete" className="mt-10 border-t border-mist/70 pt-6">
      {confirming ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="w-full text-sm sm:w-auto">
            Delete {habit.name} and every check-in? The XP and goal progress they earned go too.
          </p>
          <button type="button" disabled={remove.isPending} onClick={() => remove.mutate()} className={`${BUTTON} text-alert`}>
            Yes, delete
          </button>
          <button type="button" onClick={() => setConfirming(false)} className={BUTTON}>
            Keep it
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className={`${BUTTON} text-alert`}>
          Delete for good
        </button>
      )}
      {remove.isError && (
        <p role="alert" className="mt-2 text-sm text-alert">
          {habitErrorMessage(remove.error)}
        </p>
      )}
    </section>
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
  const heatmapFrom = heatmapStart(today)
  const heatmap = useQuery({
    queryKey: ['logs', id, 'heatmap', heatmapFrom],
    queryFn: () => allLogs(id, heatmapFrom),
    enabled: habit.isSuccess,
  })
  const since = shiftDays(today, -HISTORY_DAYS)
  const logs = useQuery({
    queryKey: ['logs', id, 'history', since, page],
    queryFn: () => listLogs(id, { from: since, page }),
    enabled: habit.isSuccess,
    placeholderData: keepPreviousData,
  })

  if (habit.isPending && habit.fetchStatus !== 'idle') {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <p role="status" className="text-ink-soft">
          Loading habit…
        </p>
      </main>
    )
  }
  if (!habit.data) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <p role="alert" className="text-alert">
          {habit.error ? habitErrorMessage(habit.error) : NOT_FOUND}
        </p>
        <Link to="/habits" className="mt-3 inline-block font-medium text-link underline underline-offset-2">
          Back to habits
        </Link>
      </main>
    )
  }

  const { name, category, targetCount, reminderTime, archived } = habit.data
  const quit = habit.data.kind === 'QUIT'
  const counted = habit.data.unit ? ` ${habit.data.unit}` : ' times'
  const unit = streak.data?.unit === 'WEEKS' ? 'week' : 'day'
  const plural = (n: number) => `${n} ${unit}${n === 1 ? '' : 's'}`

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <Link to="/habits" className="text-sm font-medium text-link underline underline-offset-2">
        All habits
      </Link>
      <div className="mt-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-4xl font-semibold tracking-tight">{name}</h1>
          <p className="mt-1 flex flex-wrap gap-x-4 text-ink-soft">
            {category && <span>{category}</span>}
            <span>{quit ? 'Quitting: a check-in is a slip' : describeSchedule(habit.data)}</span>
            {targetCount > 1 && (
              <span>
                {targetCount}
                {counted} a day
              </span>
            )}
            {reminderTime && <span>Reminder at {reminderTime}</span>}
            {archived && <span>Archived</span>}
          </p>
        </div>
        <Link to={`/habits/${id}/edit`} aria-label={`Edit ${name}`} className={`${BUTTON} shrink-0`}>
          Edit
        </Link>
      </div>

      {habit.data.goalId != null && <GoalLink habitId={id} goalId={habit.data.goalId} />}

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
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <StreakBar streak={streak.data} plural={plural} />
            <Window label="Last 7 days" stats={stats.data.last7Days} />
            <Window label="Last 30 days" stats={stats.data.last30Days} />
          </dl>
        )}
        {heatmap.isError ? (
          <div className="mt-3">
            <p role="alert" className="text-alert">
              {habitErrorMessage(heatmap.error)}
            </p>
            <button type="button" onClick={() => heatmap.refetch()} className={`${BUTTON} mt-3`}>
              Try again
            </button>
          </div>
        ) : !heatmap.data ? (
          <div role="status" aria-label="Loading charts" className="mt-3 h-56 animate-pulse rounded-2xl bg-mist/45" />
        ) : (
          <Charts habit={habit.data} logs={heatmap.data} today={today} />
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
            <ul className={`${SURFACE} mt-3 divide-y divide-mist/70 px-4`}>
              {logs.data.content.map((log) => (
                <li key={log.date} className="flex items-baseline justify-between gap-4 py-3">
                  <span className="font-medium">{formatDay(log.date)}</span>
                  <span className={log.done && !quit ? 'font-medium text-link' : 'text-ink-soft'}>
                    {logLabel(log, habit.data)}
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

      <DeleteHabit habit={habit.data} />
    </main>
  )
}
