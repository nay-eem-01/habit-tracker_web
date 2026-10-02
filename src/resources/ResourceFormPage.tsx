import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LinkSimple, NotePencil } from '@phosphor-icons/react'
import { useId, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { listGoals, type Goal } from '../api/goals'
import { fieldError, resourceErrorMessage } from '../api/messages'
import { createResource, getResource, updateResource, type ResourceType } from '../api/resources'
import { Button } from '../components/Button'
import { Field, INPUT, TextAreaField } from '../components/Field'
import { SURFACE } from '../components/styles'
import { backPath, emptyResource, toResourceRequest, valuesFromResource, type ResourceFormValues } from './resources'

const MAX_GOALS = 100

const TYPES: { type: ResourceType; label: string; icon: typeof NotePencil }[] = [
  { type: 'NOTE', label: 'Note', icon: NotePencil },
  { type: 'LINK', label: 'Link', icon: LinkSimple },
]

interface ResourceFormProps {
  initial: ResourceFormValues
  /** Goals to file it under: the active ones, plus the one it is already on whatever its status. */
  goals: Goal[]
  submitLabel: string
  pendingLabel: string
  pending: boolean
  error: unknown
  cancelTo: string
  onSubmit: (values: ResourceFormValues) => void
}

function ResourceForm({ initial, goals, submitLabel, pendingLabel, pending, error, cancelTo, onSubmit }: ResourceFormProps) {
  const goalSelect = useId()
  const [values, setValues] = useState(initial)
  const set = <K extends keyof ResourceFormValues>(key: K, value: ResourceFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }))
  const note = values.type === 'NOTE'

  function submit(event: FormEvent) {
    event.preventDefault()
    onSubmit(values)
  }

  return (
    <form onSubmit={submit} className="flex max-w-xl flex-col gap-6">
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Kind</legend>
        <div className="inline-flex gap-1 rounded-full bg-mist/45 p-1">
          {TYPES.map(({ type, label, icon: Icon }) => (
            <label
              key={type}
              className={`flex cursor-pointer items-center gap-2 rounded-full px-4 py-1.5 font-medium transition-[background-color,color,box-shadow] duration-200 ease-out has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-lapis ${
                values.type === type ? 'bg-pill text-ink shadow-[0_1px_3px_rgb(29_36_51/0.14)]' : 'text-ink-soft hover:text-ink'
              }`}
            >
              <input
                type="radio"
                name="type"
                value={type}
                checked={values.type === type}
                onChange={() => set('type', type)}
                className="sr-only"
              />
              <Icon size={18} weight={values.type === type ? 'fill' : 'regular'} aria-hidden="true" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <Field
        label="Title"
        required
        maxLength={200}
        placeholder={note ? 'Race-day checklist' : 'Couch to 5K plan'}
        value={values.title}
        onChange={(event) => set('title', event.target.value)}
        error={fieldError(error, 'title', 'Title')}
      />
      {!note && (
        <Field
          label="Address"
          type="url"
          required
          maxLength={2048}
          placeholder="https://"
          hint="An http or https address."
          value={values.url}
          onChange={(event) => set('url', event.target.value)}
          error={fieldError(error, 'url', 'Address')}
        />
      )}
      <TextAreaField
        label={note ? 'Note' : 'Comment (optional)'}
        required={note}
        rows={note ? 8 : 3}
        maxLength={20_000}
        hint="Markdown works: **bold**, *italic*, lists, [links](https://example.com)."
        value={values.body}
        onChange={(event) => set('body', event.target.value)}
        error={fieldError(error, 'body', note ? 'Note' : 'Comment')}
      />

      <div className="max-w-sm">
        <label htmlFor={goalSelect} className="mb-1.5 block text-sm font-medium">
          Goal (optional)
        </label>
        <select
          id={goalSelect}
          value={values.goalId}
          onChange={(event) => set('goalId', event.target.value)}
          className={`${INPUT} h-12 border-mist`}
        >
          <option value="">No goal</option>
          {goals.map((goal) => (
            <option key={goal.id} value={goal.id}>
              {goal.title}
              {goal.status === 'ACTIVE' ? '' : ` (${goal.status === 'ACHIEVED' ? 'achieved' : 'abandoned'})`}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-sm text-ink-soft">It shows on the goal’s page too.</p>
      </div>

      <label className="flex cursor-pointer items-center gap-3 text-sm font-medium">
        <input
          type="checkbox"
          checked={values.pinned}
          onChange={(event) => set('pinned', event.target.checked)}
          className="size-4 accent-lapis"
        />
        Pin it to the top
      </label>

      {error != null && (
        <p role="alert" className="text-sm text-alert">
          {resourceErrorMessage(error)}
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

/**
 * `/resources/new` creates (`?goalId=` files it under a goal, `?type=LINK` starts as a link);
 * `/resources/:id/edit` replaces. `?back=` is where both return to.
 */
export default function ResourceFormPage() {
  const { id } = useParams()
  const resourceId = id === undefined ? null : Number(id)
  const [params] = useSearchParams()
  const back = backPath(params.get('back'), '/resources')
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const existing = useQuery({
    queryKey: ['resource', resourceId],
    queryFn: () => getResource(resourceId!),
    enabled: resourceId !== null,
  })
  const goals = useQuery({
    queryKey: ['goals', { all: true }],
    queryFn: () => listGoals({ page: 0, size: MAX_GOALS }),
  })

  const save = useMutation({
    mutationFn: (values: ResourceFormValues) =>
      resourceId === null ? createResource(toResourceRequest(values)) : updateResource(resourceId, toResourceRequest(values)),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['resources'] }),
        queryClient.invalidateQueries({ queryKey: ['goal-resources'] }),
        queryClient.invalidateQueries({ queryKey: ['resource'] }),
      ])
      navigate(back)
    },
  })

  const editing = resourceId !== null
  const initial = existing.data
    ? valuesFromResource(existing.data)
    : emptyResource(params.get('type') === 'LINK' ? 'LINK' : 'NOTE', params.get('goalId') ?? '')
  const choices = (goals.data?.content ?? []).filter(
    (goal) => goal.status === 'ACTIVE' || String(goal.id) === initial.goalId,
  )

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="font-display text-4xl font-semibold tracking-tight">
        {editing ? 'Edit' : 'New note or link'}
      </h1>
      <div className={`${SURFACE} mt-6 p-5 sm:p-8`}>
        {(editing && existing.isPending) || goals.isPending ? (
          <p role="status" className="text-ink-soft">
            Loading…
          </p>
        ) : editing && existing.isError ? (
          <div>
            <p role="alert" className="text-alert">
              {resourceErrorMessage(existing.error)}
            </p>
            <Link to={back} className="mt-3 inline-block font-medium text-link underline underline-offset-2">
              Go back
            </Link>
          </div>
        ) : (
          <ResourceForm
            key={existing.data?.id ?? 'new'}
            initial={initial}
            goals={choices}
            submitLabel={editing ? 'Save changes' : 'Save'}
            pendingLabel="Saving…"
            pending={save.isPending}
            error={save.error}
            cancelTo={back}
            onSubmit={(values) => save.mutate(values)}
          />
        )}
      </div>
    </main>
  )
}
