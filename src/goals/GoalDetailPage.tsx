import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, Flag, LinkSimple, Trophy } from '@phosphor-icons/react'
import { useId, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  abandonGoal,
  achieveGoal,
  getGoal,
  getGoalProgress,
  type Goal,
  type GoalStatus,
  type HabitGoalProgress,
} from '../api/goals'
import { linkGoal, listHabits, unlinkGoal, type Habit } from '../api/habits'
import { goalErrorMessage, resourceErrorMessage } from '../api/messages'
import { listGoalResources } from '../api/resources'
import { useAuth } from '../auth/context'
import { Button } from '../components/Button'
import { Field, INPUT } from '../components/Field'
import { ProgressBar } from '../components/ProgressBar'
import { Ring } from '../components/Ring'
import { SECONDARY, SURFACE } from '../components/styles'
import { ResourceCard } from '../resources/ResourceCard'
import { useResourceActions } from '../resources/useResourceActions'
import { useToday } from '../today/useToday'
import { deadline, formatDate, formatInstant } from './goals'

const BUTTON = SECONDARY

/** The goal page shows the first few; the library has the rest. */
const GOAL_RESOURCES_SHOWN = 5

/** The goal's notes, links and files, pinned first, with a way to add one and to see them all. */
function GoalResources({ goalId }: { goalId: number }) {
  const resources = useQuery({
    queryKey: ['goal-resources', goalId],
    queryFn: () => listGoalResources(goalId, { page: 0, size: GOAL_RESOURCES_SHOWN }),
  })
  const actions = useResourceActions()
  const back = `/goals/${goalId}`

  return (
    <section aria-labelledby="resources" className="mt-10">
      <div className="flex items-end justify-between gap-4">
        <h2 id="resources" className="font-display text-2xl font-semibold tracking-tight">
          Notes, links and files
        </h2>
        <Link to={`/resources/new?goalId=${goalId}&back=${encodeURIComponent(back)}`} className={`${BUTTON} shrink-0`}>
          Add
        </Link>
      </div>
      {actions.error && (
        <p role="alert" className="mt-3 text-sm text-alert">
          {resourceErrorMessage(actions.error)}
        </p>
      )}
      {resources.isError ? (
        <div className="mt-3">
          <p role="alert" className="text-alert">
            {resourceErrorMessage(resources.error)}
          </p>
          <button type="button" onClick={() => resources.refetch()} className={`${BUTTON} mt-3`}>
            Try again
          </button>
        </div>
      ) : !resources.data ? (
        <div role="status" aria-label="Loading notes, links and files" className="mt-3 h-24 animate-pulse rounded-2xl bg-mist/45" />
      ) : resources.data.content.length === 0 ? (
        <p className="mt-3 text-ink-soft">Keep the plan, a note to self, or a useful link here, next to the goal.</p>
      ) : (
        <>
          <ul className="mt-3 flex flex-col gap-3">
            {resources.data.content.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                back={back}
                busy={actions.busy}
                onPin={(pinned) => actions.pin.mutate({ id: resource.id, pinned })}
                onDelete={() => actions.remove.mutate(resource.id)}
              />
            ))}
          </ul>
          {resources.data.totalElements > resources.data.content.length && (
            <Link
              to={`/resources?goalId=${goalId}`}
              className="mt-3 inline-block font-medium text-link underline underline-offset-2"
            >
              See all {resources.data.totalElements} in the library
            </Link>
          )}
        </>
      )}
    </section>
  )
}

/** A sensible first target: about two months of done days. */
const DEFAULT_TARGET = '60'
/** One request covers every active habit, as on the dashboard. */
const MAX_HABITS = 100

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

function StatusBadge({ goal, timezone }: { goal: Goal; timezone: string }) {
  if (goal.status === 'ACHIEVED') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-lapis/15 px-3 py-1 text-sm font-medium text-link">
        <Trophy size={16} weight="fill" aria-hidden="true" />
        Achieved{goal.achievedAt ? ` ${formatInstant(goal.achievedAt, timezone)}` : ''}
      </span>
    )
  }
  if (goal.status === 'ABANDONED') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-mist/60 px-3 py-1 text-sm font-medium text-ink-soft">
        <Flag size={16} weight="fill" aria-hidden="true" />
        Abandoned
      </span>
    )
  }
  return null
}

/** The done-days target, as a small inline form: used to link a habit and to change a link's target. */
function TargetField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <Field
      narrow
      label="Target, in done days"
      type="number"
      min={1}
      max={3650}
      required
      hint="How many done days make the habit part of you, like 60."
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

interface RowProps {
  habit: HabitGoalProgress
  /** The goal is active: links can still be changed. */
  open: boolean
  busy: boolean
  onRetarget: (days: number) => Promise<unknown>
  onUnlink: () => void
}

function LinkedHabit({ habit, open, busy, onRetarget, onUnlink }: RowProps) {
  const [editing, setEditing] = useState(false)
  const [target, setTarget] = useState(String(habit.goalTargetDays))
  const reached = habit.doneDays >= habit.goalTargetDays

  async function save(event: FormEvent) {
    event.preventDefault()
    try {
      await onRetarget(Number(target))
      setEditing(false)
    } catch {
      // the page shows what went wrong; the form stays open to try again
    }
  }

  return (
    <li className="py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <Link to={`/habits/${habit.habitId}`} className="font-medium hover:text-link hover:underline underline-offset-2">
          {habit.name}
        </Link>
        <span className={`text-sm ${reached ? 'font-medium text-link' : 'text-ink-soft'}`}>
          {reached && <CheckCircle size={16} weight="fill" aria-hidden="true" className="mr-1 inline align-[-3px]" />}
          {habit.doneDays} of {plural(habit.goalTargetDays, 'done day')} · {habit.percent}%
        </span>
      </div>
      <div className="mt-2">
        <ProgressBar percent={habit.percent} muted={habit.archived} />
      </div>
      <p className="mt-1.5 text-sm text-ink-soft">
        Counting since {formatDate(habit.linkedOn)}
        {habit.archived && ' · Archived, so it no longer counts toward the goal'}
      </p>

      {open && !editing && (
        <div className="mt-3 flex gap-2">
          {!habit.archived && (
            <button type="button" onClick={() => setEditing(true)} className={BUTTON} aria-label={`Change target for ${habit.name}`}>
              Change target
            </button>
          )}
          <button type="button" disabled={busy} onClick={onUnlink} className={BUTTON} aria-label={`Unlink ${habit.name}`}>
            Unlink
          </button>
        </div>
      )}
      {open && editing && (
        <form onSubmit={save} className="mt-3 flex flex-wrap items-start gap-3">
          <TargetField value={target} onChange={setTarget} />
          <div className="flex gap-2 sm:mt-7">
            <Button type="submit" busy={busy} size="small">
              Save
            </Button>
            <button type="button" onClick={() => setEditing(false)} className={BUTTON}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </li>
  )
}

/** Pick one of the active habits not on this goal yet, and its target. */
function LinkHabitForm({
  habits,
  goalId,
  busy,
  onLink,
}: {
  habits: Habit[]
  goalId: number
  busy: boolean
  onLink: (habitId: number, days: number) => Promise<unknown>
}) {
  const selectId = useId()
  const choices = habits.filter((habit) => habit.goalId !== goalId)
  const [habitId, setHabitId] = useState('')
  const [target, setTarget] = useState(DEFAULT_TARGET)
  const picked = choices.find((habit) => String(habit.id) === habitId)

  if (habits.length === 0) {
    return (
      <p className="text-ink-soft">
        <Link to="/habits/new" className="font-medium text-link underline underline-offset-2">
          Add a habit
        </Link>{' '}
        first, then link it here.
      </p>
    )
  }
  if (choices.length === 0) return <p className="text-ink-soft">Every active habit is already linked to this goal.</p>

  async function submit(event: FormEvent) {
    event.preventDefault()
    try {
      await onLink(Number(habitId), Number(target))
      setHabitId('')
      setTarget(DEFAULT_TARGET)
    } catch {
      // the page shows what went wrong; the choice stays to try again
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="max-w-sm">
        <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium">
          Habit
        </label>
        <select
          id={selectId}
          required
          value={habitId}
          onChange={(event) => setHabitId(event.target.value)}
          className={`${INPUT} h-12 border-mist`}
        >
          <option value="" disabled>
            Choose a habit
          </option>
          {choices.map((habit) => (
            <option key={habit.id} value={habit.id}>
              {habit.name}
              {habit.goalId ? ' (on another goal)' : ''}
            </option>
          ))}
        </select>
        {picked?.goalId && (
          <p className="mt-1.5 text-sm text-ink-soft">Linking it here takes it off its other goal and starts its count again.</p>
        )}
      </div>
      <TargetField value={target} onChange={setTarget} />
      <div>
        <Button type="submit" busy={busy}>
          <LinkSimple size={18} weight="bold" aria-hidden="true" />
          Link habit
        </Button>
      </div>
    </form>
  )
}

/** Achieving and abandoning can't be undone, so each asks once more before it happens. */
function CloseGoal({ busy, onClose }: { busy: boolean; onClose: (outcome: GoalStatus) => void }) {
  const [asking, setAsking] = useState<GoalStatus | null>(null)

  if (asking) {
    return (
      <div role="group" aria-label="Confirm" className="rounded-2xl border border-mist p-4">
        <p className="font-medium">
          {asking === 'ACHIEVED' ? 'Mark this goal achieved?' : 'Abandon this goal?'}
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          {asking === 'ACHIEVED'
            ? "Well done. It moves to Achieved and can't be reopened."
            : "It moves to Abandoned and can't be reopened. Its habits stay linked."}
        </p>
        <div className="mt-3 flex gap-2">
          {asking === 'ACHIEVED' ? (
            <Button type="button" busy={busy} size="small" onClick={() => onClose('ACHIEVED')}>
              Yes, achieved
            </Button>
          ) : (
            <button type="button" disabled={busy} className={BUTTON} onClick={() => onClose('ABANDONED')}>
              Yes, abandon
            </button>
          )}
          <button type="button" className={BUTTON} onClick={() => setAsking(null)}>
            Not yet
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="small" onClick={() => setAsking('ACHIEVED')}>
        <Trophy size={18} weight="fill" aria-hidden="true" />
        Mark achieved
      </Button>
      <button type="button" className={BUTTON} onClick={() => setAsking('ABANDONED')}>
        Abandon
      </button>
    </div>
  )
}

export default function GoalDetailPage() {
  const id = Number(useParams().id)
  const { state } = useAuth()
  const timezone = state.status === 'authenticated' ? state.user.timezone : 'UTC'
  const today = useToday(timezone)
  const queryClient = useQueryClient()

  const goal = useQuery({ queryKey: ['goal', id], queryFn: () => getGoal(id), enabled: Number.isInteger(id) })
  const progress = useQuery({
    queryKey: ['goal-progress', id],
    queryFn: () => getGoalProgress(id),
    enabled: goal.isSuccess,
  })
  const active = goal.data?.status === 'ACTIVE'
  const habits = useQuery({
    queryKey: ['habits', { archived: false, all: true }],
    queryFn: () => listHabits({ archived: false, page: 0, size: MAX_HABITS }),
    enabled: active,
  })

  // a link changes the goal's progress, the habit, and (when it moved) another goal's progress
  const refreshLinks = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['goal-progress'] }),
      queryClient.invalidateQueries({ queryKey: ['habits'] }),
      queryClient.invalidateQueries({ queryKey: ['habit'] }),
    ])
  const link = useMutation({
    mutationFn: ({ habitId, days }: { habitId: number; days: number }) => linkGoal(habitId, { goalId: id, goalTargetDays: days }),
    onSuccess: refreshLinks,
  })
  const unlink = useMutation({ mutationFn: unlinkGoal, onSuccess: refreshLinks })
  const close = useMutation({
    mutationFn: (outcome: GoalStatus) => (outcome === 'ACHIEVED' ? achieveGoal(id) : abandonGoal(id)),
    onSuccess: (updated) => {
      queryClient.setQueryData(['goal', id], updated)
      // an achieved goal is worth XP
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ['goals'] }),
        queryClient.invalidateQueries({ queryKey: ['level'] }),
      ])
    },
  })

  if (goal.isPending && goal.fetchStatus !== 'idle') {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <p role="status" className="text-ink-soft">
          Loading goal…
        </p>
      </main>
    )
  }
  if (!goal.data) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <p role="alert" className="text-alert">
          {goal.error ? goalErrorMessage(goal.error) : "This goal doesn't exist, or it isn't yours."}
        </p>
        <Link to="/goals" className="mt-3 inline-block font-medium text-link underline underline-offset-2">
          Back to goals
        </Link>
      </main>
    )
  }

  const { title, description } = goal.data
  const due = deadline(goal.data, today)
  const linked = progress.data?.habits ?? []
  const counted = linked.filter((habit) => !habit.archived).length
  const failure = link.error ?? unlink.error ?? close.error

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <Link to="/goals" className="text-sm font-medium text-link underline underline-offset-2">
        All goals
      </Link>
      <div className="mt-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-4xl font-semibold tracking-tight">{title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-ink-soft">
            <StatusBadge goal={goal.data} timezone={timezone} />
            {due ? (
              <span className={due.overdue ? 'font-medium text-alert' : undefined}>{due.text}</span>
            ) : (
              active && <span>No deadline</span>
            )}
          </div>
          {description && <p className="mt-3 max-w-2xl whitespace-pre-line">{description}</p>}
        </div>
        <Link to={`/goals/${id}/edit`} aria-label={`Edit ${title}`} className={`${BUTTON} shrink-0`}>
          Edit
        </Link>
      </div>

      {failure && (
        <p role="alert" className="mt-4 text-sm text-alert">
          {goalErrorMessage(failure)}
        </p>
      )}

      <section aria-labelledby="progress" className="mt-8">
        <h2 id="progress" className="font-display text-2xl font-semibold tracking-tight">
          Progress
        </h2>
        {progress.isError ? (
          <div className="mt-3">
            <p role="alert" className="text-alert">
              {goalErrorMessage(progress.error)}
            </p>
            <button type="button" onClick={() => progress.refetch()} className={`${BUTTON} mt-3`}>
              Try again
            </button>
          </div>
        ) : !progress.data ? (
          <div role="status" aria-label="Loading progress" className="mt-3 h-40 animate-pulse rounded-2xl bg-mist/45" />
        ) : (
          <div className={`${SURFACE} mt-3 p-4 sm:p-6`}>
            <div className="flex items-center gap-5">
              <Ring rate={progress.data.percent / 100}>
                <span className="font-display text-xl font-semibold text-link">{progress.data.percent}%</span>
              </Ring>
              <p className="text-ink-soft">
                {counted === 0
                  ? 'Link the habits that get you there. Their done days fill this up.'
                  : progress.data.percent >= 100 && active
                    ? 'Every linked habit has reached its target. Mark the goal achieved when it feels done.'
                    : `The average of ${plural(counted, 'linked habit')}, each counting its done days toward its target.`}
              </p>
            </div>
            {linked.length > 0 && (
              <ul aria-label="Linked habits" className="mt-4 divide-y divide-mist/70 border-t border-mist/70">
                {linked.map((habit) => (
                  <LinkedHabit
                    key={`${habit.habitId}-${habit.goalTargetDays}`}
                    habit={habit}
                    open={active}
                    busy={link.isPending || unlink.isPending}
                    onRetarget={(days) => link.mutateAsync({ habitId: habit.habitId, days })}
                    onUnlink={() => unlink.mutate(habit.habitId)}
                  />
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {active && (
        <section aria-labelledby="link" className="mt-10">
          <h2 id="link" className="font-display text-2xl font-semibold tracking-tight">
            Link a habit
          </h2>
          <div className={`${SURFACE} mt-3 p-4 sm:p-6`}>
            {habits.isError ? (
              <p role="alert" className="text-alert">
                {goalErrorMessage(habits.error)}
              </p>
            ) : !habits.data ? (
              <p role="status" className="text-ink-soft">
                Loading habits…
              </p>
            ) : (
              <LinkHabitForm
                habits={habits.data.content}
                goalId={id}
                busy={link.isPending}
                onLink={(habitId, days) => link.mutateAsync({ habitId, days })}
              />
            )}
          </div>
        </section>
      )}

      <GoalResources goalId={id} />

      {active && (
        <section aria-labelledby="finish" className="mt-10">
          <h2 id="finish" className="font-display text-2xl font-semibold tracking-tight">
            Finish
          </h2>
          <p className="mt-1 text-ink-soft">You decide when it’s done. Reaching 100% doesn’t close it for you.</p>
          <div className="mt-3">
            <CloseGoal busy={close.isPending} onClose={(outcome) => close.mutate(outcome)} />
          </div>
        </section>
      )}
    </main>
  )
}
