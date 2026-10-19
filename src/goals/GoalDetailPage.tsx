import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CalendarBlank, CheckCircle, Flag, LinkSimple, PencilSimple, Plus, Trophy, WarningCircle } from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
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
import { Field } from '../components/Field'
import { SelectField } from '../components/pickers'
import { ProgressBar } from '../components/ProgressBar'
import { Ring } from '../components/Ring'
import { PAGE, PAGE_TITLE, SECONDARY, SECTION_TITLE, TEXT_BUTTON } from '../components/styles'
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
    <section aria-labelledby="resources" className="mt-12 border-t border-mist pt-8">
      <div className="flex items-center justify-between gap-4">
        <h2 id="resources" className={SECTION_TITLE}>
          Notes, links and files
        </h2>
        <Link to={`/resources/new?goalId=${goalId}&back=${encodeURIComponent(back)}`} className={`${BUTTON} h-10 shrink-0`}>
          <Plus size={16} weight="bold" aria-hidden="true" />
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
        <div role="status" aria-label="Loading notes, links and files" className="mt-3 h-24 animate-pulse rounded-2xl bg-wash" />
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
              className={`mt-3 ${TEXT_BUTTON}`}
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
      <span className="inline-flex items-center gap-1.5 rounded-full bg-sage px-3 py-1 text-[0.9375rem] font-medium text-sage-deep">
        <Trophy size={16} weight="fill" aria-hidden="true" />
        Achieved{goal.achievedAt ? ` ${formatInstant(goal.achievedAt, timezone)}` : ''}
      </span>
    )
  }
  if (goal.status === 'ABANDONED') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-wash px-3 py-1 text-[0.9375rem] font-medium text-ink-soft ring-1 ring-mist ring-inset">
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
        <Link to={`/habits/${habit.habitId}`} className="font-display text-lg font-semibold tracking-tight underline-offset-[3px] hover:text-link hover:underline">
          {habit.name}
        </Link>
        <span className={`text-[0.9375rem] tabular-nums ${reached ? 'font-medium text-sage-deep' : 'text-ink-soft'}`}>
          {reached && <CheckCircle size={16} weight="fill" aria-hidden="true" className="mr-1 inline align-[-3px]" />}
          {habit.doneDays} of {plural(habit.goalTargetDays, 'done day')} · {habit.percent}%
        </span>
      </div>
      <div className="mt-2">
        <ProgressBar percent={habit.percent} muted={habit.archived} />
      </div>
      <p className="mt-1.5 text-[0.9375rem] text-ink-soft">
        Counting since {formatDate(habit.linkedOn)}
        {habit.archived && ' · Archived, so it no longer counts toward the goal'}
      </p>

      {open && !editing && (
        <div className="mt-1 flex gap-5">
          {!habit.archived && (
            <button type="button" onClick={() => setEditing(true)} className={TEXT_BUTTON} aria-label={`Change target for ${habit.name}`}>
              Change target
            </button>
          )}
          <button type="button" disabled={busy} onClick={onUnlink} className={TEXT_BUTTON} aria-label={`Unlink ${habit.name}`}>
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
  const choices = habits.filter((habit) => habit.goalId !== goalId)
  const [habitId, setHabitId] = useState('')
  const [missing, setMissing] = useState(false)
  const [target, setTarget] = useState(DEFAULT_TARGET)
  const picked = choices.find((habit) => String(habit.id) === habitId)

  if (habits.length === 0) {
    return (
      <p className="text-ink-soft">
        No habits yet.{' '}
        <Link to={`/habits/new?goal=${goalId}`} className={TEXT_BUTTON}>
          Add one for this goal
        </Link>
        .
      </p>
    )
  }
  if (choices.length === 0) return <p className="text-ink-soft">Every active habit is already linked to this goal. Add a new one with New habit.</p>

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!habitId) {
      setMissing(true)
      return
    }
    try {
      await onLink(Number(habitId), Number(target))
      setHabitId('')
      setTarget(DEFAULT_TARGET)
    } catch {
      // the page shows what went wrong; the choice stays to try again
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start">
      <SelectField
        className="sm:min-w-64 sm:flex-1"
        label="Habit"
        placeholder="Choose a habit"
        value={habitId}
        onChange={(id) => {
          setHabitId(id)
          setMissing(false)
        }}
        options={choices.map((habit) => ({ value: String(habit.id), label: habit.name + (habit.goalId ? ' (on another goal)' : '') }))}
        error={missing ? 'Choose a habit to link.' : undefined}
        hint={picked?.goalId ? 'Linking it here takes it off its other goal and starts its count again.' : undefined}
      />
      <TargetField value={target} onChange={setTarget} />
      <div className="sm:w-full">
        <button type="submit" disabled={busy} aria-busy={busy || undefined} className={`${BUTTON} border-lapis text-link`}>
          <LinkSimple size={18} weight="bold" aria-hidden="true" />
          Link habit
        </button>
      </div>
    </form>
  )
}

/** Achieving and abandoning can't be undone, so each asks once more before it happens. */
function CloseGoal({ busy, onClose }: { busy: boolean; onClose: (outcome: GoalStatus) => void }) {
  const [asking, setAsking] = useState<GoalStatus | null>(null)

  if (asking) {
    return (
      <div role="group" aria-label="Confirm" className="rounded-2xl bg-wash p-4 sm:p-5">
        <p className="font-medium">
          {asking === 'ACHIEVED' ? 'Mark this goal achieved?' : 'Abandon this goal?'}
        </p>
        <p className="mt-1 text-ink-soft">
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
      <main className={PAGE}>
        <p role="status" className="text-ink-soft">
          Loading goal…
        </p>
      </main>
    )
  }
  if (!goal.data) {
    return (
      <main className={PAGE}>
        <p role="alert" className="text-alert">
          {goal.error ? goalErrorMessage(goal.error) : "This goal doesn't exist, or it isn't yours."}
        </p>
        <Link to="/goals" className={`mt-3 ${TEXT_BUTTON}`}>
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
    <main className={PAGE}>
      <Link to="/goals" className="inline-flex min-h-9 items-center gap-1.5 text-[0.9375rem] font-medium text-ink-soft hover:text-ink">
        <ArrowLeft size={16} weight="bold" aria-hidden="true" />
        All goals
      </Link>
      <div className="mt-2 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className={`${PAGE_TITLE} break-words`}>{title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-ink-soft">
            <StatusBadge goal={goal.data} timezone={timezone} />
            {due ? (
              <span className={`inline-flex items-center gap-1.5 ${due.overdue ? 'font-medium text-alert' : ''}`}>
                {due.overdue ? <WarningCircle size={16} weight="bold" aria-hidden="true" /> : <CalendarBlank size={16} weight="bold" aria-hidden="true" />}
                <span>{due.text}</span>
              </span>
            ) : (
              active && <span>No deadline</span>
            )}
          </div>
          {description && <p className="mt-4 max-w-2xl text-[1.0625rem] leading-relaxed whitespace-pre-line">{description}</p>}
        </div>
        <Link to={`/goals/${id}/edit`} aria-label={`Edit ${title}`} className={`${BUTTON} shrink-0`}>
          <PencilSimple size={18} aria-hidden="true" />
          <span className="hidden sm:inline">Edit</span>
        </Link>
      </div>

      {failure && (
        <p role="alert" className="mt-4 rounded-xl bg-alert/8 px-4 py-3 text-[0.9375rem] text-alert">
          {goalErrorMessage(failure)}
        </p>
      )}

      <section aria-labelledby="progress" className="mt-10">
        <h2 id="progress" className="sr-only">
          Progress
        </h2>
        {progress.isError ? (
          <div>
            <p role="alert" className="text-alert">
              {goalErrorMessage(progress.error)}
            </p>
            <button type="button" onClick={() => progress.refetch()} className={`${BUTTON} mt-3`}>
              Try again
            </button>
          </div>
        ) : !progress.data ? (
          <div role="status" aria-label="Loading progress" className="h-40 animate-pulse rounded-2xl bg-wash" />
        ) : (
          <>
            <div className="flex items-center gap-5 rounded-2xl bg-wash p-5 sm:p-6">
              <Ring rate={progress.data.percent / 100}>
                <span className="font-display text-2xl font-semibold tabular-nums text-ink">{progress.data.percent}%</span>
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
              <>
                <h3 className={`mt-10 ${SECTION_TITLE}`}>Habits that get you there</h3>
                <ul aria-label="Linked habits" className="mt-2 divide-y divide-mist border-t border-mist">
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
              </>
            )}
          </>
        )}
      </section>

      {active && (
        <section aria-labelledby="link" className="mt-8 rounded-2xl border border-mist p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <h2 id="link" className="font-display text-lg font-semibold tracking-tight">
              Link a habit
            </h2>
            {/* a habit made from here comes back already linked, with its target */}
            <Link to={`/habits/new?goal=${id}`} className={`${BUTTON} h-10`}>
              <Plus size={16} weight="bold" aria-hidden="true" />
              New habit
            </Link>
          </div>
          <div className="mt-4">
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
        <section aria-labelledby="finish" className="mt-12 border-t border-mist pt-8">
          <h2 id="finish" className={SECTION_TITLE}>
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
