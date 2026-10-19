import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Archive, CalendarBlank, PencilSimple, Plus, Target, Trophy, WarningCircle } from '@phosphor-icons/react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getGoalProgress, listGoals, type Goal, type GoalStatus } from '../api/goals'
import { goalErrorMessage } from '../api/messages'
import { useAuth } from '../auth/context'
import { Ring } from '../components/Ring'
import { RowMenu } from '../components/RowMenu'
import { PAGE, PAGE_TITLE, PRIMARY, SECONDARY, TABS as TAB_TRACK, tab } from '../components/styles'
import { useToday } from '../today/useToday'
import { deadline, formatInstant } from './goals'

const BUTTON = SECONDARY

const TABS: { label: string; status: GoalStatus }[] = [
  { label: 'Active', status: 'ACTIVE' },
  { label: 'Achieved', status: 'ACHIEVED' },
  { label: 'Abandoned', status: 'ABANDONED' },
]

const EMPTY: Record<GoalStatus, { icon: typeof Target; text: string }> = {
  ACTIVE: { icon: Target, text: 'No goals yet. Name something you want to reach, then link the habits that get you there.' },
  ACHIEVED: { icon: Trophy, text: 'Nothing achieved yet. Mark a goal achieved when you get there.' },
  ABANDONED: { icon: Archive, text: 'No abandoned goals.' },
}

/** The goal's ring: its percent inside, how many habits feed it beside; nothing while it loads or if it fails. */
function useProgress(goalId: number) {
  return useQuery({ queryKey: ['goal-progress', goalId], queryFn: () => getGoalProgress(goalId) })
}

function GoalCard({ goal, today, timezone }: { goal: Goal; today: string; timezone: string }) {
  const due = deadline(goal, today)
  const progress = useProgress(goal.id)
  const counted = progress.data?.habits.filter((habit) => !habit.archived).length ?? 0
  const closed = goal.status !== 'ACTIVE'
  return (
    <li className="flex items-start gap-4 py-5">
      <Ring rate={progress.data ? progress.data.percent / 100 : null} small muted={goal.status === 'ABANDONED'}>
        <span className="font-display text-base font-semibold tabular-nums text-ink">{progress.data ? `${progress.data.percent}%` : ''}</span>
      </Ring>
      <div className="min-w-0 flex-1">
        <h2 className={`font-display text-lg leading-snug font-semibold tracking-tight sm:text-xl ${goal.status === 'ABANDONED' ? 'text-ink-soft' : ''}`}>
          <Link to={`/goals/${goal.id}`} className="underline-offset-[3px] hover:text-link hover:underline">
            {goal.title}
          </Link>
        </h2>
        {goal.description && <p className="mt-1 line-clamp-2 text-ink-soft">{goal.description}</p>}
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[0.9375rem] text-ink-soft">
          {goal.status === 'ACHIEVED' && goal.achievedAt && (
            <span className="inline-flex items-center gap-1.5 font-medium text-sage-deep">
              <Trophy size={16} weight="fill" aria-hidden="true" />
              <span>Achieved {formatInstant(goal.achievedAt, timezone)}</span>
            </span>
          )}
          {due && (
            <span className={`inline-flex items-center gap-1.5 ${due.overdue ? 'font-medium text-alert' : ''}`}>
              {due.overdue ? <WarningCircle size={16} weight="bold" aria-hidden="true" /> : <CalendarBlank size={16} weight="bold" aria-hidden="true" />}
              <span>{due.text}</span>
            </span>
          )}
          {!due && goal.status === 'ACTIVE' && <span>No deadline</span>}
          {progress.data && !closed && <span>{counted === 0 ? 'No habits linked yet' : `${counted} habit${counted === 1 ? '' : 's'}`}</span>}
        </p>
      </div>
      <RowMenu
        label={`More for ${goal.title}`}
        items={[{ label: 'Edit', icon: <PencilSimple size={18} />, render: <Link to={`/goals/${goal.id}/edit`} /> }]}
      />
    </li>
  )
}

export default function GoalsPage() {
  const { state } = useAuth()
  const timezone = state.status === 'authenticated' ? state.user.timezone : 'UTC'
  const today = useToday(timezone)
  const [status, setStatus] = useState<GoalStatus>('ACTIVE')
  const [page, setPage] = useState(0)

  const goals = useQuery({
    queryKey: ['goals', { status, page }],
    queryFn: () => listGoals({ status, page }),
    placeholderData: keepPreviousData,
  })

  const showTab = (next: GoalStatus) => {
    setStatus(next)
    setPage(0)
  }

  const empty = EMPTY[status]

  return (
    <main className={PAGE}>
      <div className="flex items-end justify-between gap-4">
        <h1 className={PAGE_TITLE}>Goals</h1>
        <Link to="/goals/new" className={`${PRIMARY} h-11 px-4 sm:px-5`}>
          <Plus size={18} weight="bold" aria-hidden="true" />
          New goal
        </Link>
      </div>

      <div className={`mt-6 ${TAB_TRACK}`}>
        {TABS.map((item) => (
          <button
            key={item.status}
            type="button"
            onClick={() => showTab(item.status)}
            aria-current={status === item.status ? 'true' : undefined}
            className={`${tab(status === item.status)} px-3 sm:px-4`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {goals.isPending ? (
        <div role="status" aria-label="Loading goals" className="mt-6 flex animate-pulse flex-col gap-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="size-16 rounded-full bg-mist/60" />
              <div className="h-5 flex-1 rounded-md bg-mist/60" />
            </div>
          ))}
        </div>
      ) : goals.isError ? (
        <div className="mt-8">
          <p role="alert" className="text-alert">
            {goalErrorMessage(goals.error)}
          </p>
          <button type="button" onClick={() => goals.refetch()} className={`${BUTTON} mt-3`}>
            Try again
          </button>
        </div>
      ) : goals.data.content.length === 0 ? (
        <div className="mt-6 flex flex-col items-start rounded-2xl bg-wash px-6 py-10 sm:items-center sm:py-14 sm:text-center">
          <span aria-hidden="true" className="grid size-12 place-items-center rounded-xl bg-surface text-link ring-1 ring-mist">
            <empty.icon size={26} weight="duotone" />
          </span>
          <p className="mt-4 max-w-sm text-ink-soft">{empty.text}</p>
        </div>
      ) : (
        <>
          <ul className="mt-4 divide-y divide-mist border-t border-mist">
            {goals.data.content.map((goal) => (
              <GoalCard key={goal.id} goal={goal} today={today} timezone={timezone} />
            ))}
          </ul>
          {goals.data.totalPages > 1 && (
            <nav aria-label="Pages" className="mt-6 flex items-center gap-4 text-[0.9375rem]">
              <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className={BUTTON}>
                Previous
              </button>
              <span className="text-ink-soft">
                Page {goals.data.number + 1} of {goals.data.totalPages}
              </span>
              <button
                type="button"
                disabled={page + 1 >= goals.data.totalPages}
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
