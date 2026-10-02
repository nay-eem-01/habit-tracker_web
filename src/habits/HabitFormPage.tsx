import { SURFACE } from '../components/styles'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createHabit, getHabit, updateHabit } from '../api/habits'
import { habitErrorMessage } from '../api/messages'
import { HabitForm } from './HabitForm'
import { toRequest, valuesFromHabit, type HabitFormValues } from './form'

/** One page for both: `/habits/new` creates, `/habits/:id/edit` replaces. */
export default function HabitFormPage() {
  const { id } = useParams()
  const habitId = id === undefined ? null : Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const existing = useQuery({
    queryKey: ['habit', habitId],
    queryFn: () => getHabit(habitId!),
    enabled: habitId !== null,
  })

  const save = useMutation({
    mutationFn: (values: HabitFormValues) =>
      habitId === null ? createHabit(toRequest(values)) : updateHabit(habitId, toRequest(values)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['habits'] })
      await queryClient.invalidateQueries({ queryKey: ['habit'] })
      navigate('/habits')
    },
  })

  const editing = habitId !== null

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="font-display text-4xl font-semibold tracking-tight">{editing ? 'Edit habit' : 'New habit'}</h1>
      <div className={`${SURFACE} mt-6 p-5 sm:p-8`}>
        {editing && existing.isPending ? (
          <p role="status" className="text-ink-soft">
            Loading habit…
          </p>
        ) : editing && existing.isError ? (
          <div>
            <p role="alert" className="text-alert">
              {habitErrorMessage(existing.error)}
            </p>
            <Link to="/habits" className="mt-3 inline-block font-medium text-link underline underline-offset-2">
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
          />
        )}
      </div>
    </main>
  )
}
