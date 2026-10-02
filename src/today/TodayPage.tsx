import type { ReactNode } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { CalendarBlank, Plant } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { checkIn, listLogs, type HabitLog } from '../api/checkins'
import { listHabits, type Habit, type Page } from '../api/habits'
import { habitErrorMessage } from '../api/messages'
import { useAuth } from '../auth/context'
import { TodayRow } from './TodayRow'
import { formatToday, todayStatus, weekStart, withTodayCount } from './today'
import { useToday } from './useToday'

/** One request covers every active habit; a user with more than this many sees the first of them. */
const MAX_HABITS = 100

const logsKey = (habitId: number, since: string): QueryKey => ['logs', habitId, since]

/** One square per habit due today; each fills as it gets done, the way a day fills the sign-in chain. */
function TodayChain({ done, total }: { done: number; total: number }) {
  return (
    <div aria-hidden="true" className="mt-5 flex flex-wrap gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`size-4 rounded-[5px] transition-[background-color,transform] duration-300 ease-out ${
            i < done ? 'scale-100 bg-ember' : 'scale-90 bg-white/20'
          }`}
        />
      ))}
    </div>
  )
}

function message(done: number, total: number): string {
  if (done === 0) return 'Pick the easiest one and start the chain.'
  if (done === total) return 'Chain extended. See you tomorrow.'
  const left = total - done
  return `${left} to go. You’re moving.`
}

/** The day at a glance: how many are done, and one line of encouragement. */
function Progress({ done, total }: { done: number; total: number }) {
  return (
    <div className="grain relative isolate mt-6 overflow-hidden rounded-3xl bg-lapis-deep p-6 text-white shadow-[0_24px_40px_-24px_rgb(34_50_143/0.9)] sm:p-8">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(80%_90%_at_0%_0%,rgb(70_100_240/0.5),transparent),radial-gradient(60%_70%_at_100%_100%,rgb(232_137_43/0.22),transparent)]"
      />
      <p className="font-display text-5xl font-semibold tracking-tight">
        {done} of {total} done
      </p>
      <p className="mt-1 text-white/75">{message(done, total)}</p>
      <TodayChain done={done} total={total} />
    </div>
  )
}

function Skeleton() {
  return (
    <div role="status" aria-label="Loading today" className="mt-6 animate-pulse">
      <div className="h-40 rounded-3xl bg-mist/60" />
      <div className="mt-8 h-7 w-24 rounded-lg bg-mist/60" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="mt-3 h-20 rounded-2xl bg-mist/45" />
      ))}
    </div>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="mt-8 flex flex-col items-center rounded-3xl border border-dashed border-mist px-6 py-14 text-center text-ink-soft">
      {children}
    </div>
  )
}

interface Item {
  habit: Habit
  status: ReturnType<typeof todayStatus>
}

export default function TodayPage() {
  const { state } = useAuth()
  const timezone = state.status === 'authenticated' ? state.user.timezone : 'UTC'
  const today = useToday(timezone)
  const since = weekStart(today)
  const queryClient = useQueryClient()

  const habits = useQuery({
    queryKey: ['habits', { archived: false, all: true }],
    queryFn: () => listHabits({ archived: false, page: 0, size: MAX_HABITS }),
  })
  const list = habits.data?.content ?? []

  const logs = useQueries({
    queries: list.map((habit) => ({
      queryKey: logsKey(habit.id, since),
      queryFn: () => listLogs(habit.id, { from: since }),
    })),
  })

  const save = useMutation({
    mutationFn: ({ habit, count }: { habit: Habit; count: number }) => checkIn(habit.id, { completedCount: count }),
    // show the tap at once; the server's answer replaces it, and a failure puts things back
    onMutate: async ({ habit, count }) => {
      const key = logsKey(habit.id, since)
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Page<HabitLog>>(key)
      if (previous) {
        queryClient.setQueryData<Page<HabitLog>>(key, {
          ...previous,
          content: withTodayCount(previous.content, today, count, habit.targetCount),
        })
      }
      return { key, previous }
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(context.key, context.previous)
    },
    onSettled: (_data, _error, { habit }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: logsKey(habit.id, since) }),
        queryClient.invalidateQueries({ queryKey: ['streak', habit.id] }),
      ]),
  })

  const loading = habits.isPending || logs.some((result) => result.isPending)
  const failed = habits.error ?? logs.find((result) => result.error)?.error

  const items: Item[] = list
    .map((habit, index) => ({ habit, status: todayStatus(habit, logs[index]?.data?.content ?? [], today) }))
    .filter((item) => item.status.due)
  const todo = items.filter((item) => !item.status.done)
  const finished = items.filter((item) => item.status.done)

  const row = ({ habit, status }: Item) => (
    <TodayRow key={habit.id} habit={habit} status={status} onSetCount={(count) => save.mutate({ habit, count })} />
  )

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Today</h1>
      <p className="mt-1 text-ink-soft">{formatToday(timezone)}</p>

      {save.isError && (
        <p role="alert" className="mt-4 text-sm text-alert">
          Couldn’t save that check-in. {habitErrorMessage(save.error)}
        </p>
      )}

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
              logs.forEach((result) => void result.refetch())
            }}
            className="mt-3 h-10 rounded-xl border border-mist bg-white px-4 text-sm font-medium transition-transform duration-150 ease-out active:scale-[0.97]"
          >
            Try again
          </button>
        </div>
      ) : list.length === 0 ? (
        <Empty>
          <Plant size={40} weight="duotone" className="text-lapis" aria-hidden="true" />
          <p className="mt-3 font-display text-2xl font-semibold tracking-tight text-ink">Nothing growing yet</p>
          <p className="mt-1">
            No habits yet.{' '}
            <Link to="/habits/new" className="font-medium text-lapis underline underline-offset-2">
              Add the first one you want to keep.
            </Link>
          </p>
        </Empty>
      ) : items.length === 0 ? (
        <Empty>
          <CalendarBlank size={40} weight="duotone" className="text-lapis" aria-hidden="true" />
          <p className="mt-3 font-display text-2xl font-semibold tracking-tight text-ink">A day off</p>
          <p className="mt-1">
            Nothing is scheduled for today.{' '}
            <Link to="/habits" className="font-medium text-lapis underline underline-offset-2">
              See all habits
            </Link>
          </p>
        </Empty>
      ) : (
        <>
          <Progress done={finished.length} total={items.length} />
          {todo.length > 0 && (
            <section aria-labelledby="todo" className="mt-8">
              <h2 id="todo" className="font-display text-2xl font-semibold tracking-tight">
                To do
              </h2>
              <ul className="mt-3 flex flex-col gap-3">{todo.map(row)}</ul>
            </section>
          )}
          {finished.length > 0 && (
            <section aria-labelledby="done" className="mt-8">
              <h2 id="done" className="font-display text-2xl font-semibold tracking-tight">
                {todo.length === 0 ? 'All done for today' : 'Done'}
              </h2>
              <ul className="mt-3 flex flex-col gap-3">{finished.map(row)}</ul>
            </section>
          )}
        </>
      )}
    </main>
  )
}
