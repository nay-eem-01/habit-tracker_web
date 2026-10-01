import { useMutation, useQueries, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
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

/** The row of squares is a quiet echo of the sign-in chain: one per habit due today, filled as they get done. */
function TodayChain({ done, total }: { done: number; total: number }) {
  return (
    <div aria-hidden="true" className="mt-3 flex flex-wrap gap-1">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`size-3 rounded-[3px] ${i < done ? 'bg-lapis' : 'bg-mist'}`} />
      ))}
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
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Today</h1>
      <p className="mt-1 text-ink-soft">{formatToday(timezone)}</p>

      {save.isError && (
        <p role="alert" className="mt-4 text-sm text-alert">
          Couldn’t save that check-in. {habitErrorMessage(save.error)}
        </p>
      )}

      {loading && !failed ? (
        <p role="status" className="mt-8 text-ink-soft">
          Loading today…
        </p>
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
            className="mt-3 rounded-md border border-mist px-3 py-1.5 text-sm font-medium hover:border-ink-soft"
          >
            Try again
          </button>
        </div>
      ) : list.length === 0 ? (
        <p className="mt-8 text-ink-soft">
          No habits yet.{' '}
          <Link to="/habits/new" className="font-medium text-lapis underline underline-offset-2">
            Add the first one you want to keep.
          </Link>
        </p>
      ) : items.length === 0 ? (
        <p className="mt-8 text-ink-soft">
          Nothing is scheduled for today.{' '}
          <Link to="/habits" className="font-medium text-lapis underline underline-offset-2">
            See all habits
          </Link>
        </p>
      ) : (
        <>
          <p className="mt-6 font-medium">
            {finished.length} of {items.length} done
          </p>
          <TodayChain done={finished.length} total={items.length} />
          {todo.length > 0 && (
            <section aria-labelledby="todo" className="mt-8">
              <h2 id="todo" className="font-display text-2xl font-semibold tracking-tight">
                To do
              </h2>
              <ul className="mt-2">{todo.map(row)}</ul>
            </section>
          )}
          {finished.length > 0 && (
            <section aria-labelledby="done" className="mt-8">
              <h2 id="done" className="font-display text-2xl font-semibold tracking-tight">
                {todo.length === 0 ? 'All done for today' : 'Done'}
              </h2>
              <ul className="mt-2">{finished.map(row)}</ul>
            </section>
          )}
        </>
      )}
    </main>
  )
}
