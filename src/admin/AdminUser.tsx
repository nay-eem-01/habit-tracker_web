import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle, Crown, GoogleLogo, Prohibit, Trash, WarningCircle } from '@phosphor-icons/react'
import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { changePlan, deleteUser, getAdminUser, suspendUser, type AdminUser, type AdminUserDetail, type Plan } from '../api/admin'
import { ApiError } from '../api/errors'
import { habitErrorMessage } from '../api/messages'
import { Field } from '../components/Field'
import { PAGE_TITLE, SECONDARY, SECTION_TITLE, TABS, tab } from '../components/styles'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badges } from './Badges'
import { joined } from './format'

const DANGER = `${SECONDARY} border-alert/60 text-alert [@media(hover:hover)]:hover:border-alert`

function messageFor(error: unknown): string {
  if (error instanceof ApiError && error.errorCode === 'ADMIN_TARGET_IS_ADMIN') return 'Admins can’t be changed here.'
  return habitErrorMessage(error)
}

/** "3 days ago", or the date when it was longer than a month. */
function lastActive(instant?: string | null): string {
  if (!instant) return 'Never'
  const days = Math.floor((Date.now() - new Date(instant).getTime()) / 86_400_000)
  if (days < 1) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 31) return `${days} days ago`
  return joined(instant)
}

/** A confirm in a dialog; `typed` asks for that exact text first (delete asks for the email). */
function Confirm({
  trigger,
  title,
  description,
  action,
  danger,
  typed,
  busy,
  error,
  onConfirm,
}: {
  trigger: ReactNode
  title: string
  description: string
  action: string
  danger?: boolean
  typed?: string
  busy: boolean
  error: unknown
  onConfirm: () => Promise<unknown>
}) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const ready = !typed || text.trim() === typed
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`${danger ? DANGER : SECONDARY} gap-1.5`}>
        {trigger}
      </button>
      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setText('')
        }}
      >
        <AlertDialogContent className="max-w-[calc(100%-2rem)] gap-5 rounded-2xl p-6 sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl font-semibold tracking-tight">{title}</AlertDialogTitle>
            <AlertDialogDescription className="text-base text-ink-soft">{description}</AlertDialogDescription>
          </AlertDialogHeader>
          {typed && (
            <Field
              label={`Type ${typed} to confirm`}
              autoComplete="off"
              spellCheck={false}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          )}
          {error != null && (
            <p role="alert" className="text-[0.9375rem] text-alert">
              {messageFor(error)}
            </p>
          )}
          <AlertDialogFooter className="-mx-6 -mb-6 rounded-b-2xl bg-wash px-6">
            <AlertDialogCancel render={<button type="button" className={SECONDARY} />}>Cancel</AlertDialogCancel>
            <button
              type="button"
              disabled={!ready || busy}
              onClick={async () => {
                try {
                  await onConfirm()
                  setOpen(false)
                  setText('')
                } catch {
                  // the dialog stays open and shows what went wrong
                }
              }}
              className={danger ? `${DANGER} bg-alert/10` : SECONDARY}
            >
              {busy ? 'Working…' : action}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

/** One count about the account; the grid around it draws the hairlines. */
function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border-t border-mist py-4 pr-4">
      <dt className="text-[0.9375rem] text-ink-soft">{label}</dt>
      <dd className="mt-0.5 font-display text-2xl font-semibold tracking-tight tabular-nums">{value}</dd>
    </div>
  )
}

/** A group of actions, as in Settings: what it is on the left, the controls on the right. */
function Group({ title, danger, children }: { title: string; danger?: boolean; children: ReactNode }) {
  return (
    <section className="grid gap-x-10 gap-y-4 border-t border-mist py-7 md:grid-cols-[12rem_1fr]">
      <h2 className={`${SECTION_TITLE} ${danger ? 'text-alert' : ''}`}>{title}</h2>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

function Actions({ user }: { user: AdminUser }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  // every action answers with the updated user: put it into the page without asking again
  const replace = (next: AdminUser) => {
    queryClient.setQueryData<AdminUserDetail>(['admin', 'user', user.id], (current) => (current ? { ...current, user: next } : current))
    void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    void queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
  }
  const plan = useMutation({ mutationFn: (next: Plan) => changePlan(user.id, next), onSuccess: replace })
  const suspend = useMutation({ mutationFn: (on: boolean) => suspendUser(user.id, on), onSuccess: replace })
  const remove = useMutation({
    mutationFn: () => deleteUser(user.id),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['admin', 'user', user.id] })
      void queryClient.invalidateQueries({ queryKey: ['admin'] })
      navigate('/admin/users', { replace: true })
    },
  })
  const suspended = Boolean(user.suspendedAt)

  return (
    <>
      <Group title="Plan">
        <div role="radiogroup" aria-label="Plan" className={TABS}>
          {(['FREE', 'PRO'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={user.plan === value}
              disabled={plan.isPending}
              onClick={() => user.plan !== value && plan.mutate(value)}
              className={`${tab(user.plan === value)} flex items-center gap-1.5 px-5`}
            >
              {value === 'PRO' && <Crown size={16} weight={user.plan === 'PRO' ? 'fill' : 'regular'} className="text-ember-deep" aria-hidden="true" />}
              {value === 'FREE' ? 'Free' : 'Pro'}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[0.9375rem] text-ink-soft">Free keeps 7 active habits and 2 active goals. Pro has no limits.</p>
        {plan.isError && (
          <p role="alert" className="mt-1.5 text-[0.9375rem] text-alert">
            {messageFor(plan.error)}
          </p>
        )}
      </Group>

      <Group title="Account" danger>
        <div className="flex flex-wrap gap-3">
          {/* keys: the two confirms sit in one place, and must not share a dialog's open state */}
          {suspended ? (
            <Confirm
              key="lift"
              trigger="Lift suspension"
              title="Lift the suspension?"
              description={`${user.email} will be able to sign in again.`}
              action="Lift suspension"
              busy={suspend.isPending}
              error={suspend.error}
              onConfirm={() => suspend.mutateAsync(false)}
            />
          ) : (
            <Confirm
              key="suspend"
              trigger={
                <>
                  <Prohibit size={18} weight="bold" aria-hidden="true" /> Suspend
                </>
              }
              title={`Suspend ${user.name}?`}
              description="They’ll be signed out everywhere and can’t sign in until the suspension is lifted. Nothing is deleted."
              action="Suspend"
              danger
              busy={suspend.isPending}
              error={suspend.error}
              onConfirm={() => suspend.mutateAsync(true)}
            />
          )}
          <Confirm
            trigger={
              <>
                <Trash size={18} weight="bold" aria-hidden="true" /> Delete
              </>
            }
            title="Delete this account?"
            description="Everything goes: habits, check-ins, goals, notes and files. This can’t be undone."
            action="Delete for good"
            danger
            typed={user.email}
            busy={remove.isPending}
            error={remove.error}
            onConfirm={() => remove.mutateAsync()}
          />
        </div>
        <p className="mt-2 text-[0.9375rem] text-ink-soft">Suspending keeps everything; deleting can’t be undone.</p>
      </Group>
    </>
  )
}

export default function AdminUserPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const detail = useQuery({ queryKey: ['admin', 'user', id], queryFn: () => getAdminUser(id), enabled: Number.isInteger(id), retry: false })

  if (detail.isPending) return <div role="status" aria-label="Loading the user" className="h-64 animate-pulse rounded-2xl bg-wash" />
  if (detail.isError) {
    const gone = detail.error instanceof ApiError && detail.error.errorCode === 'USER_NOT_FOUND'
    return (
      <div>
        <p role="alert" className="text-alert">
          {gone ? 'This user doesn’t exist any more.' : habitErrorMessage(detail.error)}
        </p>
        <button type="button" onClick={() => navigate('/admin/users')} className={`${SECONDARY} mt-3`}>
          Back to users
        </button>
      </div>
    )
  }

  const { user } = detail.data
  return (
    <div>
      <Link to="/admin/users" className="inline-flex min-h-9 items-center gap-1.5 text-[0.9375rem] font-medium text-ink-soft hover:text-ink">
        <ArrowLeft size={16} weight="bold" aria-hidden="true" />
        All users
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <h1 className={`min-w-0 break-words ${PAGE_TITLE}`}>{user.email}</h1>
        <Badges user={user} />
      </div>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-ink-soft">
        <span>{user.name}</span>
        <span className="flex items-center gap-1">
          {user.authProvider === 'GOOGLE' ? <GoogleLogo size={16} weight="bold" aria-hidden="true" /> : null}
          {user.authProvider === 'GOOGLE' ? 'Google' : 'Password'}
        </span>
        <span className={`flex items-center gap-1 ${user.emailVerified ? 'text-sage-deep' : ''}`}>
          {user.emailVerified ? <CheckCircle size={16} weight="fill" aria-hidden="true" /> : null}
          {user.emailVerified ? 'Verified' : 'Unverified'}
        </span>
        <span>Joined {joined(user.createdAt)}</span>
      </p>
      {user.suspendedAt && (
        <p className="mt-4 flex items-center gap-2 rounded-xl bg-alert/10 px-4 py-3 font-medium text-alert">
          <WarningCircle size={20} weight="fill" aria-hidden="true" />
          Suspended since {joined(user.suspendedAt)}. They can’t sign in.
        </p>
      )}

      <dl className="mt-8 grid grid-cols-2 sm:grid-cols-3">
        <Stat label="Active habits" value={detail.data.activeHabits} />
        <Stat label="Archived habits" value={detail.data.archivedHabits} />
        <Stat label="Days checked in" value={detail.data.checkIns} />
        <Stat label="Goals" value={detail.data.goals} />
        <Stat label="Push browsers" value={detail.data.pushSubscriptions} />
        <Stat label="Last active" value={lastActive(detail.data.lastActiveAt)} />
      </dl>
      <p className="mt-1 text-[0.8125rem] text-ink-soft">Counts only. What people track and write stays private.</p>

      <div className="mt-10">
        {user.role === 'ADMIN' ? (
          <p className="border-t border-mist pt-7 text-ink-soft">This is an admin. Admins can’t be changed from here.</p>
        ) : (
          <Actions user={user} />
        )}
      </div>
    </div>
  )
}
