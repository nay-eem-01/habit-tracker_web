import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Archive, Target, Trophy } from '@phosphor-icons/react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getGoalProgress, listGoals, type Goal, type GoalStatus } from '../api/goals'
import { goalErrorMessage } from '../api/messages'
import { useAuth } from '../auth/context'
import { ProgressBar } from '../components/ProgressBar'
import { SECONDARY, SURFACE } from '../components/styles'
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

/** The card's bar and number; nothing while it loads or if it fails, the goal page has the detail. */
function CardProgress({ goalId }: { goalId: number }) {
  const progress = useQuery({ queryKey: ['goal-progress', goalId], queryFn: () => getGoalProgress(goalId) })
  if (!progress.data) return null
  const { percent, habits } = progress.data
  const counted = habits.filter((habit) => !habit.archived).length
  return (
    <div className="mt-3 max-w-md">
      <div className="mb-1.5 flex justify-between gap-4 text-sm">
        <span className="text-ink-soft">{counted === 0 ? 'No habits linked yet' : `${counted} habit${counted === 1 ? '' : 's'}`}</span>
        <span className="font-medium text-link">{percent}%</span>
      </div>
      <ProgressBar percent={percent} />
    </div>
  )
}

function GoalCard({ goal, today, timezone }: { goal: Goal; today: string; timezone: string }) {
  const due = deadline(goal, today)
  return (
    <li className={`${SURFACE} flex items-start justify-between gap-4 p-4 sm:p-5`}>
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-xl font-semibold tracking-tight">
          <Link to={`/goals/${goal.id}`} className="hover:text-link hover:underline underline-offset-2">
            {goal.title}
          </Link>
        </h2>
        {goal.description && <p className="mt-1 line-clamp-2 text-ink-soft">{goal.description}</p>}
        <p className="mt-1 flex flex-wrap gap-x-4 text-sm text-ink-soft">
          {goal.status === 'ACHIEVED' && goal.achievedAt && (
            <span className="font-medium text-link">Achieved {formatInstant(goal.achievedAt, timezone)}</span>
          )}
          {due && <span className={due.overdue ? 'font-medium text-alert' : undefined}>{due.text}</span>}
          {!due && goal.status === 'ACTIVE' && <span>No deadline</span>}
        </p>
        <CardProgress goalId={goal.id} />
      </div>
      <Link to={`/goals/${goal.id}/edit`} aria-label={`Edit ${goal.title}`} className={`${BUTTON} shrink-0`}>
        Edit
      </Link>
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
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex items-end justify-between gap-4">
        <h1 className="font-display text-4xl font-semibold tracking-tight">Goals</h1>
        <Link
          to="/goals/new"
          className="inline-flex h-11 items-center rounded-xl bg-lapis px-5 font-medium text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_8px_20px_-8px_rgb(34_50_143/0.7)] transition-[transform,background-color] duration-150 ease-out active:scale-[0.97] [@media(hover:hover)]:hover:bg-lapis-deep"
        >
          New goal
        </Link>
      </div>

      <div className="mt-6 inline-flex gap-1 rounded-full bg-mist/45 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.status}
            type="button"
            onClick={() => showTab(tab.status)}
            aria-current={status === tab.status ? 'true' : undefined}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-[background-color,color,box-shadow] duration-200 ease-out sm:px-5 sm:text-base ${
              status === tab.status ? 'bg-pill text-ink shadow-[0_1px_3px_rgb(29_36_51/0.14)]' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {goals.isPending ? (
        <div role="status" aria-label="Loading goals" className="mt-6 flex animate-pulse flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-mist/45" />
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
        <div className="mt-6 flex flex-col items-center rounded-3xl border border-dashed border-mist px-6 py-14 text-center text-ink-soft">
          <empty.icon size={40} weight="duotone" className="text-link" aria-hidden="true" />
          <p className="mt-3 max-w-sm">{empty.text}</p>
        </div>
      ) : (
        <>
          <ul className="mt-4 flex flex-col gap-3">
            {goals.data.content.map((goal) => (
              <GoalCard key={goal.id} goal={goal} today={today} timezone={timezone} />
            ))}
          </ul>
          {goals.data.totalPages > 1 && (
            <nav aria-label="Pages" className="mt-6 flex items-center gap-4 text-sm">
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
