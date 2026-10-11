import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { File as FileIcon, LinkSimple, NotePencil, UploadSimple } from '@phosphor-icons/react'
import { useId, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { listGoals, type Goal } from '../api/goals'
import { fieldError, resourceErrorMessage } from '../api/messages'
import {
  createResource,
  FILE_EXTENSIONS,
  getResource,
  updateResource,
  uploadResourceFile,
  type FileInfo,
  type ResourceType,
} from '../api/resources'
import { Button } from '../components/Button'
import { Field, TextAreaField } from '../components/Field'
import { SelectField, SwitchField } from '../components/pickers'
import { SURFACE } from '../components/styles'
import {
  backPath,
  emptyResource,
  fileProblem,
  formatBytes,
  titleFromFileName,
  toResourceRequest,
  valuesFromResource,
  type ResourceFormValues,
} from './resources'

const MAX_GOALS = 100

/** The server keeps uploads off until it has lasting storage; set VITE_FILE_UPLOADS=false to match. */
const UPLOADS = import.meta.env?.VITE_FILE_UPLOADS !== 'false'

const TYPES: { type: ResourceType; label: string; icon: typeof NotePencil }[] = [
  { type: 'NOTE', label: 'Note', icon: NotePencil },
  { type: 'LINK', label: 'Link', icon: LinkSimple },
  ...(UPLOADS ? [{ type: 'FILE' as const, label: 'File', icon: FileIcon }] : []),
]

const ACCEPT = FILE_EXTENSIONS.map((extension) => `.${extension}`).join(',')

interface ResourceFormProps {
  initial: ResourceFormValues
  /** Editing: what it is can't change, and a file keeps its file. Absent when adding. */
  editing?: { type: ResourceType; file?: FileInfo | null }
  /** Goals to file it under: the active ones, plus the one it is already on whatever its status. */
  goals: Goal[]
  submitLabel: string
  pendingLabel: string
  pending: boolean
  error: unknown
  cancelTo: string
  onSubmit: (values: ResourceFormValues) => void
}

function ResourceForm({ initial, editing, goals, submitLabel, pendingLabel, pending, error, cancelTo, onSubmit }: ResourceFormProps) {
  const fileInput = useId()
  const [values, setValues] = useState(initial)
  const [fileError, setFileError] = useState<string | null>(null)
  const set = <K extends keyof ResourceFormValues>(key: K, value: ResourceFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }))
  const note = values.type === 'NOTE'
  const isFile = values.type === 'FILE'
  // a note or link can switch between the two when edited; a file stays a file
  const kinds = editing ? TYPES.filter(({ type }) => (editing.type === 'FILE') === (type === 'FILE')) : TYPES

  function pick(file: File | null) {
    setFileError(file ? fileProblem(file) : null)
    setValues((current) => ({
      ...current,
      file,
      title: current.title || !file ? current.title : titleFromFileName(file.name),
    }))
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (isFile && !editing) {
      const problem = values.file ? fileProblem(values.file) : 'Choose a file to upload.'
      setFileError(problem)
      if (problem) return
    }
    onSubmit(values)
  }

  return (
    <form onSubmit={submit} className="flex max-w-xl flex-col gap-6">
      {kinds.length > 1 && (
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Kind</legend>
          <div className="inline-flex gap-1 rounded-full bg-mist/45 p-1">
            {kinds.map(({ type, label, icon: Icon }) => (
              <label
                key={type}
                className={`flex cursor-pointer items-center gap-2 rounded-full px-4 py-1.5 font-medium transition-[background-color,color,box-shadow] duration-200 ease-out has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-lapis ${
                  values.type === type ? 'bg-pill text-ink shadow-[0_1px_3px_rgb(9_38_52/0.14)]' : 'text-ink-soft hover:text-ink'
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
      )}

      {isFile && editing?.file && (
        <div className="flex items-center gap-3 rounded-xl border border-mist px-4 py-3">
          <FileIcon size={22} weight="duotone" className="shrink-0 text-link" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-medium break-all">{editing.file.name}</p>
            <p className="text-sm text-ink-soft">
              {formatBytes(editing.file.sizeBytes)} · the file stays as it is; to change it, upload a new one
            </p>
          </div>
        </div>
      )}
      {isFile && !editing && (
        <div>
          <label
            htmlFor={fileInput}
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors duration-150 has-[:focus-visible]:border-lapis ${
              fileError ? 'border-alert' : 'border-mist hover:border-ink-soft'
            }`}
          >
            <UploadSimple size={28} weight="bold" className="text-link" aria-hidden="true" />
            {values.file ? (
              <span>
                <span className="block font-medium break-all">{values.file.name}</span>
                <span className="text-sm text-ink-soft">{formatBytes(values.file.size)} · choose another to replace it</span>
              </span>
            ) : (
              <span>
                <span className="block font-medium">Choose a file</span>
                <span className="text-sm text-ink-soft">PNG, JPEG, WebP, GIF, PDF, .txt or .md · up to 10 MB</span>
              </span>
            )}
            <input
              id={fileInput}
              type="file"
              accept={ACCEPT}
              aria-label="File to upload"
              aria-invalid={fileError ? true : undefined}
              aria-describedby={fileError ? `${fileInput}-error` : undefined}
              onChange={(event) => pick(event.target.files?.[0] ?? null)}
              className="sr-only"
            />
          </label>
          {fileError && (
            <p id={`${fileInput}-error`} className="mt-1.5 text-sm text-alert">
              {fileError}
            </p>
          )}
        </div>
      )}

      <Field
        label="Title"
        required
        maxLength={200}
        placeholder={note ? 'Race-day checklist' : isFile ? 'Week 1 plan' : 'Couch to 5K plan'}
        value={values.title}
        onChange={(event) => set('title', event.target.value)}
        error={fieldError(error, 'title', 'Title')}
      />
      {values.type === 'LINK' && (
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

      <SelectField
        className="max-w-sm"
        label="Goal (optional)"
        hint="It shows on the goal’s page too."
        value={values.goalId}
        onChange={(goalId) => set('goalId', goalId)}
        options={[
          { value: '', label: 'No goal' },
          ...goals.map((goal) => ({
            value: String(goal.id),
            label: goal.title + (goal.status === 'ACTIVE' ? '' : ` (${goal.status === 'ACHIEVED' ? 'achieved' : 'abandoned'})`),
          })),
        ]}
      />

      <SwitchField label="Pin it to the top" checked={values.pinned} onChange={(pinned) => set('pinned', pinned)} />

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

const startType = (type: string | null): ResourceType => (type === 'LINK' || type === 'FILE' ? type : 'NOTE')

/**
 * `/resources/new` creates (`?goalId=` files it under a goal, `?type=LINK` or `FILE` picks the kind);
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
    mutationFn: (values: ResourceFormValues) => {
      if (resourceId !== null) return updateResource(resourceId, toResourceRequest(values))
      if (values.type === 'FILE') {
        const request = toResourceRequest(values)
        return uploadResourceFile({
          file: values.file!,
          title: request.title,
          body: request.body,
          goalId: request.goalId,
          pinned: values.pinned,
        })
      }
      return createResource(toResourceRequest(values))
    },
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
    : emptyResource(startType(params.get('type')), params.get('goalId') ?? '')
  const choices = (goals.data?.content ?? []).filter(
    (goal) => goal.status === 'ACTIVE' || String(goal.id) === initial.goalId,
  )

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="font-display text-4xl font-semibold tracking-tight">
        {editing ? 'Edit' : 'Add to the library'}
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
            editing={existing.data ? { type: existing.data.type, file: existing.data.file } : undefined}
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
