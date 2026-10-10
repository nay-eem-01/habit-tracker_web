import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle } from '@phosphor-icons/react'
import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { deleteAccount, exportData, updateProfile } from '../api/account'
import type { AuthUser } from '../api/client'
import { ApiError } from '../api/errors'
import { authErrorMessage, fieldError } from '../api/messages'
import { useAuth } from '../auth/context'
import { Button } from '../components/Button'
import { Field, INPUT } from '../components/Field'
import { SECONDARY, SURFACE } from '../components/styles'
import { disablePush, enablePush, pushState } from '../push/push'
import { saveBlob } from '../resources/resources'

/** The browser's region name, the same kind the server accepts. */
function browserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/** Region names the browser knows, plus the saved one if it isn't among them. */
function timezones(current: string): string[] {
  const all = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []
  return all.includes(current) ? all : [current, ...all]
}

function Section({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <section className={`${SURFACE} mt-6 p-5 sm:p-8`}>
      <h2 className="font-display text-2xl font-semibold tracking-tight">{title}</h2>
      {intro && <p className="mt-1 text-ink-soft">{intro}</p>}
      <div className="mt-5">{children}</div>
    </section>
  )
}

function Profile({ user }: { user: AuthUser }) {
  const { updateUser } = useAuth()
  const select = useId()
  const [name, setName] = useState(user.name)
  const [timezone, setTimezone] = useState(user.timezone)
  const [marketing, setMarketing] = useState(Boolean(user.marketingEmails))
  const save = useMutation({
    mutationFn: () => updateProfile({ name: name.trim(), timezone, marketingEmails: marketing }),
    onSuccess: updateUser,
  })
  const browser = browserTimezone()

  function submit(event: FormEvent) {
    event.preventDefault()
    save.mutate()
  }

  return (
    <form onSubmit={submit} className="flex max-w-sm flex-col gap-5">
      {save.isSuccess && (
        <p role="status" className="flex items-center gap-2 rounded-xl bg-lapis/10 px-4 py-3 font-medium text-link">
          <CheckCircle size={20} weight="fill" aria-hidden="true" />
          Saved.
        </p>
      )}
      <Field
        label="Name"
        required
        maxLength={100}
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={fieldError(save.error, 'name', 'Name')}
      />
      <div>
        <label htmlFor={select} className="mb-1.5 block text-sm font-medium">
          Timezone
        </label>
        <select id={select} value={timezone} onChange={(event) => setTimezone(event.target.value)} className={`${INPUT} h-12 border-mist`}>
          {timezones(timezone).map((zone) => (
            <option key={zone} value={zone}>
              {zone.replaceAll('_', ' ')}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-sm text-ink-soft">Your day, streaks and reminders follow it.</p>
        {browser && browser !== timezone && (
          <p className="mt-1.5 text-sm">
            This device is on {browser.replaceAll('_', ' ')}.{' '}
            <button type="button" onClick={() => setTimezone(browser)} className="font-medium text-link underline underline-offset-2">
              Use it
            </button>
          </p>
        )}
      </div>
      <label className="flex cursor-pointer items-start gap-3 text-sm">
        <input type="checkbox" checked={marketing} onChange={(event) => setMarketing(event.target.checked)} className="mt-0.5 size-4 accent-lapis" />
        <span>
          <span className="font-medium">News and tips by email</span>
          <span className="block text-ink-soft">Now and then, never more than once a month. Off unless you turn it on.</span>
        </span>
      </label>
      {save.isError && (
        <p role="alert" className="text-sm text-alert">
          {save.error instanceof ApiError && save.error.errorCode === 'USER_INVALID_TIMEZONE'
            ? 'Pick a timezone from the list.'
            : authErrorMessage(save.error)}
        </p>
      )}
      <div>
        <Button type="submit" busy={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  )
}

/** Reminders as notifications on this device, through web push. */
function Reminders() {
  const queryClient = useQueryClient()
  const state = useQuery({ queryKey: ['push-state'], queryFn: pushState })
  const toggle = useMutation({
    mutationFn: async (on: boolean) => {
      if (!on) return disablePush()
      if (!(await enablePush(state.data!.publicKey))) throw new Error('blocked')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['push-state'] }),
  })

  if (state.isPending) return <p className="text-ink-soft">Checking this device…</p>
  if (state.isError) return <p className="text-ink-soft">Couldn’t check notifications right now.</p>
  const push = state.data
  if (!push.supported) {
    return <p className="text-ink-soft">This browser can’t show reminders. On iPhone, add DevHabit to your Home Screen first, then open it from there.</p>
  }
  if (!push.enabled) return <p className="text-ink-soft">Reminder notifications aren’t switched on yet. They’ll appear here when they are.</p>
  if (push.permission === 'denied') {
    return <p className="text-ink-soft">Notifications are blocked for DevHabit. Allow them in your browser’s site settings, then come back.</p>
  }

  return (
    <>
      <label className="flex cursor-pointer items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={push.subscribed}
          disabled={toggle.isPending}
          onChange={(event) => toggle.mutate(event.target.checked)}
          className="mt-0.5 size-4 accent-lapis"
        />
        <span>
          <span className="font-medium">Notify me on this device</span>
          <span className="block text-ink-soft">At each habit’s reminder time, unless it’s done or resting.</span>
        </span>
      </label>
      {toggle.isError && (
        <p role="alert" className="mt-2 text-sm text-alert">
          {toggle.error.message === 'blocked' ? 'Notifications weren’t allowed, so nothing changed.' : authErrorMessage(toggle.error)}
        </p>
      )}
    </>
  )
}

function ExportData() {
  const download = useMutation({ mutationFn: exportData, onSuccess: (blob) => saveBlob(blob, 'devhabit-export.json') })
  return (
    <>
      <button type="button" disabled={download.isPending} aria-busy={download.isPending || undefined} onClick={() => download.mutate()} className={SECONDARY}>
        {download.isPending ? 'Preparing…' : 'Download my data'}
      </button>
      {download.isError && (
        <p role="alert" className="mt-2 text-sm text-alert">
          {authErrorMessage(download.error)}
        </p>
      )}
    </>
  )
}

function DeleteAccount({ user }: { user: AuthUser }) {
  const { signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const remove = useMutation({
    mutationFn: () => deleteAccount(password),
    // the tokens stopped working with the account; this clears what the app still holds
    onSuccess: () => signOut(),
  })
  const wrong = remove.error instanceof ApiError && remove.error.errorCode === 'AUTH_WRONG_PASSWORD'

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`${SECONDARY} text-alert`}>
        Delete my account
      </button>
    )
  }
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        remove.mutate()
      }}
      className="flex max-w-sm flex-col gap-4"
    >
      <p className="font-medium">
        This deletes {user.email} with every habit, check-in, goal and note. It can’t be undone.
      </p>
      <Field
        label="Password"
        type="password"
        autoComplete="current-password"
        maxLength={100}
        hint={user.authProvider === 'GOOGLE' ? 'Leave it empty if you only sign in with Google.' : undefined}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={wrong ? authErrorMessage(remove.error) : undefined}
      />
      {remove.isError && !wrong && (
        <p role="alert" className="text-sm text-alert">
          {authErrorMessage(remove.error)}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={remove.isPending} className={`${SECONDARY} border-alert text-alert`}>
          {remove.isPending ? 'Deleting…' : 'Delete everything'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={SECONDARY}>
          Keep my account
        </button>
      </div>
    </form>
  )
}

/** Profile, password, data and the way out. */
export default function SettingsPage() {
  const { state } = useAuth()
  if (state.status !== 'authenticated') return null
  const { user } = state

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 text-ink-soft">{user.email}</p>

      <Section title="Profile">
        <Profile user={user} />
      </Section>
      <Section title="Reminders">
        <Reminders />
      </Section>
      <Section title="Password" intro="Changing it signs you out everywhere else.">
        <Link to="/account/password" className={SECONDARY}>
          Change password
        </Link>
      </Section>
      <Section title="Your data" intro="Everything in your account as one JSON file: habits, check-ins, goals and notes.">
        <ExportData />
      </Section>
      <Section title="Delete account">
        <DeleteAccount user={user} />
      </Section>
    </main>
  )
}
