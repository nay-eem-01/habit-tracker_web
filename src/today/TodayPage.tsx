import { useState, type ReactNode } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { CalendarBlank, Check, Plant } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { cancelRest, checkIn, listLogs, restDay, type HabitLog } from '../api/checkins'
import { listHabits, type Habit, type Page } from '../api/habits'
import { habitErrorMessage } from '../api/messages'
import { useAuth } from '../auth/context'
import { PAGE, PAGE_TITLE, SECONDARY, SECTION_TITLE, TEXT_BUTTON } from '../components/styles'
import { useLevel } from '../level/useLevel'
import { QuitRow, TodayRow } from './TodayRow'
import { formatToday, todayStatus, weekDays, weekStart, withTodayCount, type WeekDay } from './today'
import { useToday } from './useToday'

/** One request covers every active habit; a user with more than this many sees the first of them. */
const MAX_HABITS = 100

const logsKey = (habitId: number, since: string): QueryKey => ['logs', habitId, since]

/** One segment per habit due today; each fills as it gets done, the way a day fills the chain. */
function Segments({ done, total, complete }: { done: number; total: number; complete: boolean }) {
  return (
    <div aria-hidden="true" className="mt-5 flex gap-1">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-2 min-w-1 flex-1 rounded-full transition-colors duration-300 ease-out motion-reduce:transition-none ${
            i < done ? (complete ? 'bg-sage-deep' : 'bg-lapis') : 'bg-mist'
          }`}
        />
      ))}
    </div>
  )
}

function message(done: number, total: number): string {
  if (done === 0) return total === 1 ? 'One thing today. Start whenever you’re ready.' : 'Start with the easiest one.'
  if (done === total) return 'Everything due today is done. See you tomorrow.'
  const left = total - done
  return left === 1 ? 'One to go.' : `${left} to go. You’re moving.`
}

/** The day at a glance: how many are done, one line about it, a segmented bar; sage once it is all done. */
function Progress({ done, total }: { done: number; total: number }) {
  const complete = done >= total
  return (
    <section
      aria-label="Today’s progress"
      className={`settle mt-6 rounded-2xl border p-5 sm:p-6 ${complete ? 'border-sage bg-sage' : 'border-mist bg-wash'}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-display text-4xl leading-none font-semibold tracking-tight tabular-nums sm:text-5xl">
            {done} of {total} done
          </p>
          <p className={`mt-2.5 ${complete ? 'text-sage-deep' : 'text-ink-soft'}`}>{message(done, total)}</p>
        </div>
        {complete && (
          <span aria-hidden="true" className="check-pop grid size-11 shrink-0 place-items-center rounded-full bg-sage-deep text-chalk">
            <Check size={22} weight="bold" />
          </span>
        )}
      </div>
      <Segments done={done} total={total} complete={complete} />
    </section>
  )
}

function Skeleton() {
  return (
    <div role="status" aria-label="Loading today" className="mt-6 animate-pulse">
      <div className="h-36 rounded-2xl bg-wash" />
      <div className="mt-9 h-6 w-20 rounded-md bg-mist/70" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="mt-5 flex items-center gap-4">
          <div className="size-12 rounded-xl bg-mist/60" />
          <div className="h-5 flex-1 rounded-md bg-mist/60" />
        </div>
      ))}
    </div>
  )
}

function Empty({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="mt-8 flex flex-col items-start rounded-2xl bg-wash px-6 py-10 sm:items-center sm:px-10 sm:py-14 sm:text-center">
      <span aria-hidden="true" className="grid size-12 place-items-center rounded-xl bg-surface text-link ring-1 ring-mist">
        {icon}
      </span>
      <p className="mt-4 font-display text-2xl font-semibold tracking-tight text-ink">{title}</p>
      <p className="mt-1.5 max-w-sm text-ink-soft">{children}</p>
    </div>
  )
}

/** A titled run of rows, a hairline between each. */
function Group({ id, title, count, children }: { id: string; title: string; count?: number; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-9">
      <div className="flex items-baseline gap-2 border-b border-mist pb-2">
        <h2 id={id} className={SECTION_TITLE}>
          {title}
        </h2>
        {count != null && <span className="text-ink-soft tabular-nums">{count}</span>}
      </div>
      <ul className="divide-y divide-mist">{children}</ul>
    </section>
  )
}

interface Item {
  habit: Habit
  status: ReturnType<typeof todayStatus>
  week: WeekDay[]
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

  // the habit a tap just finished; its row moves to Done (a fresh mount), which is where the burst plays
  const [justDone, setJustDone] = useState<number | null>(null)

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
        // a done day earns XP, and may be the one that levels up
        queryClient.invalidateQueries({ queryKey: ['level'] }),
      ]),
  })

  const level = useLevel()
  // a rest is set or taken back; the server prices it, so the log and the XP balance are read again after
  const rest = useMutation({
    mutationFn: async ({ habit, on }: { habit: Habit; on: boolean }) => {
      if (on) await restDay(habit.id)
      else await cancelRest(habit.id, today)
    },
    onSettled: (_data, _error, { habit }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: logsKey(habit.id, since) }),
        queryClient.invalidateQueries({ queryKey: ['streak', habit.id] }),
        queryClient.invalidateQueries({ queryKey: ['level'] }),
      ]),
  })

  const loading = habits.isPending || logs.some((result) => result.isPending)
  const failed = habits.error ?? logs.find((result) => result.error)?.error

  const all: Item[] = list.map((habit, index) => {
    const entries = logs[index]?.data?.content ?? []
    return { habit, status: todayStatus(habit, entries, today), week: weekDays(entries, today) }
  })
  // habits being quit are never "to do": they sit in their own list, clean until a slip
  const quitting = all.filter((item) => item.habit.kind === 'QUIT')
  const items = all.filter((item) => item.habit.kind !== 'QUIT' && item.status.due)
  // a rest day keeps the chain, so it counts with the done ones
  const todo = items.filter((item) => !item.status.done && !item.status.resting)
  const finished = items.filter((item) => item.status.done || item.status.resting)

  const row = ({ habit, status, week }: Item) => (
    <TodayRow
      key={habit.id}
      habit={habit}
      status={status}
      week={week}
      burst={habit.id === justDone}
      onSetCount={(count) => {
        if (!status.done && count >= status.target) setJustDone(habit.id)
        save.mutate({ habit, count })
      }}
      onRest={() => rest.mutate({ habit, on: true })}
      onCancelRest={() => rest.mutate({ habit, on: false })}
      xpBalance={level.data?.xpBalance}
      restBusy={rest.isPending}
    />
  )

  return (
    <main className={PAGE}>
      <p className="font-medium text-ink-soft">{formatToday(timezone)}</p>
      <h1 className={`mt-0.5 ${PAGE_TITLE}`}>Today</h1>

      {save.isError && (
        <p role="alert" className="mt-4 rounded-xl bg-alert/8 px-4 py-3 text-[0.9375rem] text-alert">
          Couldn’t save that check-in. {habitErrorMessage(save.error)}
        </p>
      )}
      {rest.isError && (
        <p role="alert" className="mt-4 rounded-xl bg-alert/8 px-4 py-3 text-[0.9375rem] text-alert">
          {habitErrorMessage(rest.error)}
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
            className={`${SECONDARY} mt-3`}
          >
            Try again
          </button>
        </div>
      ) : list.length === 0 ? (
        <Empty icon={<Plant size={26} weight="duotone" />} title="Nothing growing yet">
          No habits yet.{' '}
          <Link to="/habits/new" className={TEXT_BUTTON}>
            Add the first one you want to keep.
          </Link>
        </Empty>
      ) : items.length === 0 && quitting.length === 0 ? (
        <Empty icon={<CalendarBlank size={26} weight="duotone" />} title="A day off">
          Nothing is scheduled for today.{' '}
          <Link to="/habits" className={TEXT_BUTTON}>
            See all habits
          </Link>
        </Empty>
      ) : (
        <>
          {items.length > 0 && <Progress done={finished.length} total={items.length} />}
          {todo.length > 0 && (
            <Group id="todo" title="To do" count={todo.length}>
              {todo.map(row)}
            </Group>
          )}
          {finished.length > 0 && (
            <Group id="done" title={todo.length === 0 ? 'All done for today' : 'Done'} count={todo.length === 0 ? undefined : finished.length}>
              {finished.map(row)}
            </Group>
          )}
          {quitting.length > 0 && (
            <Group id="quitting" title="Staying clean">
              {quitting.map(({ habit, status }) => (
                <QuitRow
                  key={habit.id}
                  habit={habit}
                  slipped={status.count > 0}
                  onSetCount={(count) => save.mutate({ habit, count })}
                />
              ))}
            </Group>
          )}
        </>
      )}
    </main>
  )
}
