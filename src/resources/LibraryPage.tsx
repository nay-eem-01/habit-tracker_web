import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Books, MagnifyingGlass, X } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listGoals } from '../api/goals'
import { resourceErrorMessage } from '../api/messages'
import { listResources, type ResourceType } from '../api/resources'
import { INPUT } from '../components/Field'
import { SECONDARY } from '../components/styles'
import { ResourceCard } from './ResourceCard'
import { useResourceActions } from './useResourceActions'

const BUTTON = SECONDARY

/** Wait for a pause in typing before searching, so each key doesn't send a request. */
const SEARCH_DELAY_MS = 300
/** Enough to name every goal on a card; resources point at goals of any status. */
const MAX_GOALS = 100

const TABS: { label: string; type: ResourceType | undefined }[] = [
  { label: 'All', type: undefined },
  { label: 'Notes', type: 'NOTE' },
  { label: 'Links', type: 'LINK' },
  { label: 'Files', type: 'FILE' },
]

function useDebounced(value: string, delay: number): string {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setSettled(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return settled
}

export default function LibraryPage() {
  const [params, setParams] = useSearchParams()
  const goalParam = params.get('goalId')
  const goalId = goalParam && Number.isInteger(Number(goalParam)) ? Number(goalParam) : undefined
  const [type, setType] = useState<ResourceType | undefined>(undefined)
  const [search, setSearch] = useState('')
  const q = useDebounced(search.trim(), SEARCH_DELAY_MS)
  // a page belongs to the filters it was picked under: a new search or filter starts at the first page
  const filters = JSON.stringify([type, q, goalId])
  const [paging, setPaging] = useState({ filters, page: 0 })
  const page = paging.filters === filters ? paging.page : 0
  const setPage = (next: number) => setPaging({ filters, page: next })
  const actions = useResourceActions()

  const resources = useQuery({
    queryKey: ['resources', { type, q, goalId, page }],
    queryFn: () => listResources({ type, q, goalId, page }),
    placeholderData: keepPreviousData,
  })
  const goals = useQuery({
    queryKey: ['goals', { all: true }],
    queryFn: () => listGoals({ page: 0, size: MAX_GOALS }),
  })
  const goalTitles = new Map((goals.data?.content ?? []).map((goal) => [goal.id, goal.title]))
  const filtered = Boolean(q || type || goalId)
  const back = `/resources${goalId ? `?goalId=${goalId}` : ''}`

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight">Library</h1>
          <p className="mt-1 text-ink-soft">Notes, links and files that help, on their own or next to a goal.</p>
        </div>
        <Link
          to={`/resources/new${goalId ? `?goalId=${goalId}&back=${encodeURIComponent(back)}` : ''}`}
          className="inline-flex h-11 shrink-0 items-center rounded-xl bg-lapis px-5 font-medium text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_8px_20px_-8px_rgb(34_50_143/0.7)] transition-[transform,background-color] duration-150 ease-out active:scale-[0.97] [@media(hover:hover)]:hover:bg-lapis-deep"
        >
          Add
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex gap-1 self-start rounded-full bg-mist/45 p-1">
          {TABS.map((tab) => (
            <button
              key={tab.label}
              type="button"
              onClick={() => setType(tab.type)}
              aria-current={type === tab.type ? 'true' : undefined}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-[background-color,color,box-shadow] duration-200 ease-out sm:px-5 sm:text-base ${
                type === tab.type ? 'bg-pill text-ink shadow-[0_1px_3px_rgb(29_36_51/0.14)]' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative sm:w-72">
          <MagnifyingGlass size={18} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-soft" />
          <input
            type="search"
            aria-label="Search titles"
            placeholder="Search titles"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className={`${INPUT} h-11 border-mist pl-10`}
          />
        </div>
      </div>

      {goalId && (
        <p className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-lapis/12 py-1 pr-1 pl-3 font-medium text-link">
            Goal: {goalTitles.get(goalId) ?? '…'}
            <button
              type="button"
              aria-label="Show every goal's resources"
              onClick={() => setParams({})}
              className="grid size-6 place-items-center rounded-full hover:bg-lapis/15"
            >
              <X size={14} weight="bold" aria-hidden="true" />
            </button>
          </span>
        </p>
      )}

      {actions.error && (
        <p role="alert" className="mt-4 text-sm text-alert">
          {resourceErrorMessage(actions.error)}
        </p>
      )}

      {resources.isPending ? (
        <div role="status" aria-label="Loading library" className="mt-6 flex animate-pulse flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-mist/45" />
          ))}
        </div>
      ) : resources.isError ? (
        <div className="mt-8">
          <p role="alert" className="text-alert">
            {resourceErrorMessage(resources.error)}
          </p>
          <button type="button" onClick={() => resources.refetch()} className={`${BUTTON} mt-3`}>
            Try again
          </button>
        </div>
      ) : resources.data.content.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-3xl border border-dashed border-mist px-6 py-14 text-center text-ink-soft">
          <Books size={40} weight="duotone" className="text-link" aria-hidden="true" />
          <p className="mt-3 max-w-sm">
            {filtered
              ? 'Nothing matches. Try another word or filter.'
              : 'Nothing saved yet. Keep a plan, a note to self, a link worth coming back to, or a file.'}
          </p>
        </div>
      ) : (
        <>
          <ul className="mt-4 flex flex-col gap-3">
            {resources.data.content.map((resource) => {
              const title = resource.goalId == null ? undefined : goalTitles.get(resource.goalId)
              return (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  goal={title && !goalId ? { id: resource.goalId!, title } : undefined}
                  back={back}
                  busy={actions.busy}
                  onPin={(pinned) => actions.pin.mutate({ id: resource.id, pinned })}
                  onDelete={() => actions.remove.mutate(resource.id)}
                />
              )
            })}
          </ul>
          {resources.data.totalPages > 1 && (
            <nav aria-label="Pages" className="mt-6 flex items-center gap-4 text-sm">
              <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className={BUTTON}>
                Previous
              </button>
              <span className="text-ink-soft">
                Page {resources.data.number + 1} of {resources.data.totalPages}
              </span>
              <button
                type="button"
                disabled={page + 1 >= resources.data.totalPages}
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
