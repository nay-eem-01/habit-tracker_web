import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowSquareOut, DownloadSimple, FileImage, FilePdf, FileText, LinkSimple, NotePencil, PushPin } from '@phosphor-icons/react'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { resourceErrorMessage } from '../api/messages'
import { downloadResourceFile, type Resource } from '../api/resources'
import { SECONDARY, SURFACE } from '../components/styles'
import { formatBytes, hostOf, isImage, safeHref, saveBlob } from './resources'

const BUTTON = SECONDARY

/** Fetched the first time a card has text to show; until then the text shows as it was typed. */
const Markdown = lazy(() => import('../components/Markdown'))

/** Notes longer than this start folded, so one long note doesn't push the rest off the page. */
const FOLD_CHARS = 600
const FOLD_LINES = 10

function iconFor(resource: Resource) {
  if (resource.type === 'LINK') return { Icon: LinkSimple, label: 'Link' }
  if (resource.type === 'NOTE') return { Icon: NotePencil, label: 'Note' }
  const type = resource.file?.contentType ?? ''
  if (type === 'application/pdf') return { Icon: FilePdf, label: 'PDF file' }
  if (isImage(type)) return { Icon: FileImage, label: 'Image file' }
  return { Icon: FileText, label: 'Text file' }
}

/** An uploaded image, fetched with the token (a plain <img src> can't send it) and shown inline. */
function ImagePreview({ resource }: { resource: Resource }) {
  const blob = useQuery({
    queryKey: ['resource-file', resource.id],
    queryFn: () => downloadResourceFile(resource.id),
    staleTime: Infinity,
  })
  const image = useRef<HTMLImageElement>(null)
  // the address only lives as long as the image shows it
  useEffect(() => {
    if (!blob.data || !image.current) return
    const url = URL.createObjectURL(blob.data)
    image.current.src = url
    return () => URL.revokeObjectURL(url)
  }, [blob.data])

  if (blob.isError) return null
  return blob.data ? (
    <img ref={image} alt={resource.title} className="max-h-72 max-w-full rounded-xl border border-mist/70 object-contain" />
  ) : (
    <div role="status" aria-label="Loading image" className="h-40 w-full max-w-sm animate-pulse rounded-xl bg-mist/45" />
  )
}

interface ResourceCardProps {
  resource: Resource
  /** Shown as a link to the goal, in the library; left out on the goal's own page. */
  goal?: { id: number; title: string }
  /** Where the edit form returns to. */
  back: string
  busy: boolean
  onPin: (pinned: boolean) => void
  onDelete: () => void
}

export function ResourceCard({ resource, goal, back, busy, onPin, onDelete }: ResourceCardProps) {
  const [confirming, setConfirming] = useState(false)
  const body = resource.body ?? ''
  const long = body.length > FOLD_CHARS || body.split('\n').length > FOLD_LINES
  const [open, setOpen] = useState(!long)
  const href = resource.type === 'LINK' ? safeHref(resource.url) : null
  const { Icon, label } = iconFor(resource)
  const file = resource.type === 'FILE' ? resource.file : null
  const download = useMutation({
    mutationFn: () => downloadResourceFile(resource.id),
    onSuccess: (blob) => saveBlob(blob, file?.name ?? resource.title),
  })

  return (
    <li className={`${SURFACE} p-4 sm:p-5`}>
      <div className="flex items-start gap-3">
        <Icon size={22} weight="duotone" className="mt-0.5 shrink-0 text-link" aria-label={label} />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-semibold tracking-tight break-words">
            {href ? (
              <a href={href} target="_blank" rel="noopener noreferrer" className="hover:text-link hover:underline underline-offset-2">
                {resource.title}
                <ArrowSquareOut size={16} aria-label="(opens in a new tab)" className="ml-1 inline align-[-2px] text-ink-soft" />
              </a>
            ) : (
              resource.title
            )}
          </h2>
          {(resource.type !== 'NOTE' || goal || resource.pinned) && (
            <p className="mt-0.5 flex flex-wrap gap-x-3 text-sm text-ink-soft">
              {resource.type === 'LINK' && resource.url && <span className="truncate">{hostOf(resource.url)}</span>}
              {file && (
                <span className="min-w-0 break-all">
                  {file.name} · {formatBytes(file.sizeBytes)}
                </span>
              )}
              {goal && (
                <Link to={`/goals/${goal.id}`} className="hover:text-link hover:underline underline-offset-2">
                  Goal: {goal.title}
                </Link>
              )}
              {resource.pinned && <span className="font-medium text-ember-deep">Pinned</span>}
            </p>
          )}
        </div>
        <button
          type="button"
          disabled={busy}
          aria-pressed={resource.pinned}
          aria-label={`${resource.pinned ? 'Unpin' : 'Pin'} ${resource.title}`}
          title={resource.pinned ? 'Unpin' : 'Pin to the top'}
          onClick={() => onPin(!resource.pinned)}
          className={`grid size-10 shrink-0 place-items-center rounded-xl transition-[transform,background-color,color] duration-150 ease-out active:scale-95 ${
            resource.pinned ? 'bg-ember/15 text-ember-deep' : 'text-ink-soft hover:bg-mist/50 hover:text-ink'
          }`}
        >
          <PushPin size={20} weight={resource.pinned ? 'fill' : 'regular'} aria-hidden="true" />
        </button>
      </div>

      {file && isImage(file.contentType) && (
        <div className="mt-3 sm:pl-[34px]">
          <ImagePreview resource={resource} />
        </div>
      )}

      {body && (
        <div className="mt-3 sm:pl-[34px]">
          <div className={`relative break-words ${open ? '' : 'max-h-40 overflow-hidden'}`}>
            <Suspense fallback={<p className="whitespace-pre-line">{body}</p>}>
              <Markdown text={body} />
            </Suspense>
            {!open && <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-12 bg-linear-to-t from-surface" />}
          </div>
          {long && (
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
              className="mt-1 text-sm font-medium text-link underline underline-offset-2"
            >
              {open ? 'Show less' : 'Show all'}
            </button>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 sm:pl-[34px]">
        {confirming ? (
          <>
            <span className="text-sm">Delete for good?</span>
            <button type="button" disabled={busy} onClick={onDelete} className={`${BUTTON} text-alert`}>
              Yes, delete
            </button>
            <button type="button" onClick={() => setConfirming(false)} className={BUTTON}>
              Keep it
            </button>
          </>
        ) : (
          <>
            {file && (
              <button
                type="button"
                disabled={download.isPending}
                aria-busy={download.isPending || undefined}
                onClick={() => download.mutate()}
                aria-label={`Download ${file.name}`}
                className={`${BUTTON} gap-1.5`}
              >
                <DownloadSimple size={16} weight="bold" aria-hidden="true" />
                {download.isPending ? 'Downloading…' : 'Download'}
              </button>
            )}
            <Link
              to={`/resources/${resource.id}/edit?back=${encodeURIComponent(back)}`}
              aria-label={`Edit ${resource.title}`}
              className={BUTTON}
            >
              Edit
            </Link>
            <button type="button" onClick={() => setConfirming(true)} aria-label={`Delete ${resource.title}`} className={BUTTON}>
              Delete
            </button>
          </>
        )}
      </div>
      {download.error && (
        <p role="alert" className="mt-2 text-sm text-alert sm:pl-[34px]">
          {resourceErrorMessage(download.error)}
        </p>
      )}
    </li>
  )
}
