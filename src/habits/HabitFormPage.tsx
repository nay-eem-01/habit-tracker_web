import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Target } from '@phosphor-icons/react'
import { getGoal } from '../api/goals'
import { createHabit, getHabit, linkGoal, updateHabit, type Habit } from '../api/habits'
import { goalErrorMessage, habitErrorMessage } from '../api/messages'
import { Field } from '../components/Field'
import { PAGE, PAGE_TITLE, TEXT_BUTTON } from '../components/styles'
import { HabitForm } from './HabitForm'
import { toRequest, valuesFromHabit, type HabitFormValues } from './form'

/** The goal page's first target, too: about two months of done days. */
const DEFAULT_TARGET = '60'

/** A new habit was made, but linking it to its goal didn't go through. */
interface LinkFailure {
  habit: Habit
  error: unknown
}

/**
 * One page for both: `/habits/new` creates, `/habits/:id/edit` replaces. `/habits/new?goal=<id>` makes
 * a habit for that goal: it asks for the target too, links the habit once it exists, and goes back to the goal.
 */
export default function HabitFormPage() {
  const { id } = useParams()
  const habitId = id === undefined ? null : Number(id)
  const [params] = useSearchParams()
  const goalParam = params.get('goal')
  const goalId = habitId === null && goalParam && /^\d+$/.test(goalParam) ? Number(goalParam) : null
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [target, setTarget] = useState(DEFAULT_TARGET)
  const [linkFailure, setLinkFailure] = useState<LinkFailure | null>(null)

  const existing = useQuery({
    queryKey: ['habit', habitId],
    queryFn: () => getHabit(habitId!),
    enabled: habitId !== null,
  })
  const goal = useQuery({ queryKey: ['goal', goalId], queryFn: () => getGoal(goalId!), enabled: goalId !== null })
  // only an active goal takes habits; a closed or missing one leaves this an ordinary new habit
  const linking = goal.data?.status === 'ACTIVE'

  const save = useMutation({
    mutationFn: async (values: HabitFormValues): Promise<{ habit: Habit; linkError?: unknown }> => {
      if (habitId !== null) return { habit: await updateHabit(habitId, toRequest(values)) }
      const habit = await createHabit(toRequest(values))
      if (!linking) return { habit }
      try {
        await linkGoal(habit.id, { goalId: goalId!, goalTargetDays: Number(target) })
        return { habit }
      } catch (linkError) {
        // the habit exists either way: say what didn't happen rather than offer to add it twice
        return { habit, linkError }
      }
    },
    onSuccess: async ({ habit, linkError }) => {
      await queryClient.invalidateQueries({ queryKey: ['habits'] })
      await queryClient.invalidateQueries({ queryKey: ['habit'] })
      if (linking) await queryClient.invalidateQueries({ queryKey: ['goal-progress'] })
      if (linkError !== undefined) {
        setLinkFailure({ habit, error: linkError })
        return
      }
      navigate(linking ? `/goals/${goalId}` : '/habits')
    },
  })

  const editing = habitId !== null
  const back = editing ? `/habits/${habitId}` : goalId !== null ? `/goals/${goalId}` : '/habits'

  return (
    <main className={PAGE}>
      <Link to={back} className="inline-flex min-h-9 items-center gap-1.5 text-[0.9375rem] font-medium text-ink-soft hover:text-ink">
        <ArrowLeft size={16} weight="bold" aria-hidden="true" />
        {editing ? 'Habit' : goalId !== null ? 'Goal' : 'Habits'}
      </Link>
      <h1 className={`mt-2 ${PAGE_TITLE}`}>{editing ? 'Edit habit' : 'New habit'}</h1>

      {goalId !== null && !linkFailure && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl bg-wash px-4 py-3.5">
          <Target size={22} weight="duotone" className="mt-0.5 shrink-0 text-link" aria-hidden="true" />
          {goal.isPending ? (
            <p role="status" className="text-ink-soft">
              Loading the goal…
            </p>
          ) : linking ? (
            <p>
              For the goal <span className="font-medium">{goal.data!.title}</span>. It’s linked as soon as it’s added.
            </p>
          ) : (
            <p className="text-ink-soft">That goal can’t take new habits now, so this one won’t be linked to it.</p>
          )}
        </div>
      )}

      <div className="mt-8">
        {linkFailure ? (
          <div>
            <p role="alert" className="text-alert">
              “{linkFailure.habit.name}” was added, but it couldn’t be linked to the goal. {goalErrorMessage(linkFailure.error)}
            </p>
            <Link to={`/goals/${goalId}`} className={`mt-3 ${TEXT_BUTTON}`}>
              Back to the goal to link it there
            </Link>
          </div>
        ) : editing && existing.isPending ? (
          <p role="status" className="text-ink-soft">
            Loading habit…
          </p>
        ) : editing && existing.isError ? (
          <div>
            <p role="alert" className="text-alert">
              {habitErrorMessage(existing.error)}
            </p>
            <Link to="/habits" className={`mt-3 ${TEXT_BUTTON}`}>
              Back to habits
            </Link>
          </div>
        ) : (
          <HabitForm
            key={existing.data?.id ?? 'new'}
            initial={existing.data ? valuesFromHabit(existing.data) : undefined}
            submitLabel={editing ? 'Save changes' : 'Add habit'}
            pendingLabel={editing ? 'Saving…' : 'Adding…'}
            pending={save.isPending}
            error={save.error}
            onSubmit={(values) => save.mutate(values)}
            editing={editing}
            buildOnly={linking}
            cancelTo={back}
          >
            {linking && (
              <div className="border-t border-mist pt-6">
                <Field
                  narrow
                  label="Target, in done days"
                  type="number"
                  min={1}
                  max={3650}
                  required
                  hint="How many done days make the habit part of you, like 60."
                  value={target}
                  onChange={(event) => setTarget(event.target.value)}
                />
              </div>
            )}
          </HabitForm>
        )}
      </div>
    </main>
  )
}
