import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createGoal, getGoal, updateGoal } from '../api/goals'
import { fieldError, goalErrorMessage } from '../api/messages'
import { Button } from '../components/Button'
import { Field, TextAreaField } from '../components/Field'
import { SURFACE } from '../components/styles'
import { EMPTY_GOAL, toGoalRequest, valuesFromGoal, type GoalFormValues } from './goals'

interface GoalFormProps {
  initial: GoalFormValues
  submitLabel: string
  pendingLabel: string
  pending: boolean
  error: unknown
  cancelTo: string
  onSubmit: (values: GoalFormValues) => void
}

function GoalForm({ initial, submitLabel, pendingLabel, pending, error, cancelTo, onSubmit }: GoalFormProps) {
  const [values, setValues] = useState(initial)
  const set = <K extends keyof GoalFormValues>(key: K, value: GoalFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }))

  function submit(event: FormEvent) {
    event.preventDefault()
    onSubmit(values)
  }

  return (
    <form onSubmit={submit} className="flex max-w-xl flex-col gap-6">
      <Field
        label="Goal"
        required
        maxLength={120}
        placeholder="Run a half marathon"
        value={values.title}
        onChange={(event) => set('title', event.target.value)}
        error={fieldError(error, 'title', 'Goal')}
      />
      <TextAreaField
        label="Why it matters (optional)"
        maxLength={2000}
        hint="What reaching it looks like, in your own words."
        value={values.description}
        onChange={(event) => set('description', event.target.value)}
        error={fieldError(error, 'description', 'Description')}
      />
      <Field
        narrow
        label="Target date (optional)"
        type="date"
        hint="Leave it empty for no deadline."
        value={values.targetDate}
        onChange={(event) => set('targetDate', event.target.value)}
        error={fieldError(error, 'targetDate', 'Target date')}
      />

      {error != null && (
        <p role="alert" className="text-sm text-alert">
          {goalErrorMessage(error)}
        </p>
      )}
      <div className="flex items-center gap-4">
        <Button type="submit" busy={pending}>
          {pending ? pendingLabel : submitLabel}
        </Button>
        <Link to={cancelTo} className="font-medium text-link underline underline-offset-2">
          Cancel
        </Link>
      </div>
    </form>
  )
}

/** One page for both: `/goals/new` creates, `/goals/:id/edit` replaces. */
export default function GoalFormPage() {
  const { id } = useParams()
  const goalId = id === undefined ? null : Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const existing = useQuery({
    queryKey: ['goal', goalId],
    queryFn: () => getGoal(goalId!),
    enabled: goalId !== null,
  })

  const save = useMutation({
    mutationFn: (values: GoalFormValues) =>
      goalId === null ? createGoal(toGoalRequest(values)) : updateGoal(goalId, toGoalRequest(values)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['goals'] })
      await queryClient.invalidateQueries({ queryKey: ['goal'] })
      navigate('/goals')
    },
  })

  const editing = goalId !== null

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="font-display text-4xl font-semibold tracking-tight">{editing ? 'Edit goal' : 'New goal'}</h1>
      <div className={`${SURFACE} mt-6 p-5 sm:p-8`}>
        {editing && existing.isPending ? (
          <p role="status" className="text-ink-soft">
            Loading goal…
          </p>
        ) : editing && existing.isError ? (
          <div>
            <p role="alert" className="text-alert">
              {goalErrorMessage(existing.error)}
            </p>
            <Link to="/goals" className="mt-3 inline-block font-medium text-link underline underline-offset-2">
              Back to goals
            </Link>
          </div>
        ) : (
          <GoalForm
            key={existing.data?.id ?? 'new'}
            initial={existing.data ? valuesFromGoal(existing.data) : EMPTY_GOAL}
            submitLabel={editing ? 'Save changes' : 'Add goal'}
            pendingLabel={editing ? 'Saving…' : 'Adding…'}
            pending={save.isPending}
            error={save.error}
            cancelTo="/goals"
            onSubmit={(values) => save.mutate(values)}
          />
        )}
      </div>
    </main>
  )
}
