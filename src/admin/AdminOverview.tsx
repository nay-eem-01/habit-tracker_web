import { useQuery } from '@tanstack/react-query'
import { Bell, CheckCircle, Crown, GoogleLogo, Prohibit, Target, TrendUp, Users } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { getAdminStats, type AdminStats, type DayCount } from '../api/admin'
import { habitErrorMessage } from '../api/messages'
import { Card } from '../components/Card'
import { LEAD, PAGE_TITLE, SECONDARY, SURFACE } from '../components/styles'

const number = new Intl.NumberFormat('en-GB')

function share(part: number, total: number): string {
  return total === 0 ? '–' : `${Math.round((part / total) * 100)}%`
}

/** "12 Oct", for a chart's ends. The dates are UTC days. */
function shortDay(date: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(new Date(`${date}T00:00:00Z`))
}

/** Who uses the app: the total big, who is active beside it, the breakdown under a hairline. */
function Hero({ stats }: { stats: AdminStats }) {
  const { users, active } = stats
  const facts: { icon: ReactNode; label: string; value: string }[] = [
    { icon: <CheckCircle size={16} weight="fill" />, label: 'Verified', value: `${number.format(users.verified)} (${share(users.verified, users.total)})` },
    { icon: <GoogleLogo size={16} weight="bold" />, label: 'With Google', value: number.format(users.withGoogle) },
    { icon: <Crown size={16} weight="fill" />, label: 'Pro', value: number.format(users.pro) },
    { icon: <Prohibit size={16} weight="bold" />, label: 'Suspended', value: number.format(users.suspended) },
  ]
  return (
    <section aria-label="Users" className="rounded-2xl border border-mist bg-wash p-5 sm:col-span-2 sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-ink-soft">Users</p>
          <p className="font-display text-6xl leading-none font-semibold tracking-tight tabular-nums">{number.format(users.total)}</p>
        </div>
        <div>
          <p className="text-ink-soft">Active users</p>
          <dl className="mt-1 flex gap-6">
            {(
              [
                ['Today', active.day],
                ['7 days', active.week],
                ['30 days', active.month],
              ] as const
            ).map(([label, count]) => (
              <div key={label} className="flex flex-col-reverse">
                <dt className="text-[0.9375rem] text-ink-soft">{label}</dt>
                <dd className="font-display text-3xl font-semibold tabular-nums text-link">{number.format(count)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-mist pt-5 sm:grid-cols-4">
        {facts.map((fact) => (
          <div key={fact.label}>
            <dt className="flex items-center gap-1.5 text-[0.9375rem] text-ink-soft">
              <span aria-hidden="true">{fact.icon}</span>
              {fact.label}
            </dt>
            <dd className="mt-0.5 font-medium tabular-nums">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function Tile({ icon, label, value, note, accent }: { icon: ReactNode; label: string; value: number; note?: string; accent?: boolean }) {
  return (
    <div className={`${SURFACE} p-4 ${accent ? 'border-ember/70' : ''}`}>
      <p className={`flex items-center gap-1.5 text-[0.9375rem] font-medium ${accent ? 'text-ember-deep' : 'text-ink-soft'}`}>
        <span aria-hidden="true">{icon}</span>
        {label}
      </p>
      <p className="mt-1 font-display text-3xl font-semibold tracking-tight tabular-nums">{number.format(value)}</p>
      {note && <p className="text-[0.9375rem] text-ink-soft">{note}</p>}
    </div>
  )
}

/** Thirty days of bars, today highlighted, in the dashboard's bar style. */
function DailyBars({ title, days, noun }: { title: string; days: DayCount[]; noun: string }) {
  const top = Math.max(...days.map((day) => day.count), 1)
  const total = days.reduce((sum, day) => sum + day.count, 0)
  return (
    <Card title={title} action={<span className="text-[0.9375rem] text-ink-soft tabular-nums">{number.format(total)} in 30 days</span>}>
      {days.length === 0 ? (
        <p className="mt-4 text-ink-soft">Nothing yet.</p>
      ) : (
        <>
          <div role="img" aria-label={`${title}: ${total} ${noun} in the last 30 days`} className="mt-4 flex h-32 items-end gap-[3px]">
            {days.map((day, index) => (
              <div
                key={day.date}
                title={`${shortDay(day.date)}: ${day.count} ${noun}`}
                className={`flex-1 rounded-t-sm ${index === days.length - 1 ? 'bg-lapis' : 'bg-lapis/45'}`}
                style={{ height: day.count === 0 ? '2px' : `${(day.count / top) * 100}%` }}
              />
            ))}
          </div>
          <div aria-hidden="true" className="mt-1.5 flex justify-between text-[0.8125rem] text-ink-soft">
            <span>{shortDay(days[0].date)}</span>
            <span>today</span>
          </div>
        </>
      )}
    </Card>
  )
}

/** Emails and pushes since the server started; failures in the alert colour. */
function Delivery({ delivery }: { delivery: AdminStats['delivery'] }) {
  const rows: { label: string; value: number; bad?: boolean }[] = [
    { label: 'Emails sent', value: delivery.emailsSent },
    { label: 'Emails failed', value: delivery.emailsFailed, bad: true },
    { label: 'Pushes sent', value: delivery.pushesSent },
    { label: 'Pushes to a dropped browser', value: delivery.pushesGone },
    { label: 'Pushes failed', value: delivery.pushesFailed, bad: true },
  ]
  return (
    <Card title="Delivery">
      <dl className="mt-3 divide-y divide-mist">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-4 py-2.5">
            <dt className="text-ink-soft">{row.label}</dt>
            <dd className={`font-display text-xl font-semibold tabular-nums ${row.bad && row.value > 0 ? 'text-alert' : ''}`}>{number.format(row.value)}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-[0.8125rem] text-ink-soft">Since {new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(delivery.since))}. These counts start again from zero when the server restarts.</p>
    </Card>
  )
}

function Numbers() {
  const stats = useQuery({ queryKey: ['admin', 'stats'], queryFn: getAdminStats })

  if (stats.isPending) {
    return (
      <div role="status" aria-label="Loading the numbers" className="mt-6 grid animate-pulse gap-3 sm:grid-cols-2">
        <div className="h-56 rounded-2xl bg-wash sm:col-span-2" />
        <div className="h-48 rounded-2xl bg-wash" />
        <div className="h-48 rounded-2xl bg-wash" />
      </div>
    )
  }
  if (stats.isError) {
    return (
      <div className="mt-6">
        <p role="alert" className="text-alert">
          {habitErrorMessage(stats.error)}
        </p>
        <button type="button" onClick={() => stats.refetch()} className={`${SECONDARY} mt-3`}>
          Try again
        </button>
      </div>
    )
  }

  const { usage, users } = stats.data
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2">
      <Hero stats={stats.data} />
      <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-4">
        <Tile icon={<TrendUp size={16} weight="bold" />} label="Active habits" value={usage.activeHabits} />
        <Tile icon={<Target size={16} weight="bold" />} label="Active goals" value={usage.activeGoals} />
        <Tile icon={<Bell size={16} weight="bold" />} label="Push users" value={usage.pushUsers} note={`${share(usage.pushUsers, users.total)} of users`} />
        <Tile
          icon={<Users size={16} weight="bold" />}
          label="Might upgrade"
          value={usage.freeUsersAtLimit}
          note="Free, at 7 habits or 2 goals"
          accent={usage.freeUsersAtLimit > 0}
        />
      </div>
      <DailyBars title="Sign-ups" days={users.signUps} noun="sign-ups" />
      <DailyBars title="Check-ins" days={usage.checkIns} noun="check-ins" />
      <div className="sm:col-span-2">
        <Delivery delivery={stats.data.delivery} />
      </div>
    </div>
  )
}

export default function AdminOverview() {
  return (
    <>
      <h1 className={PAGE_TITLE}>Overview</h1>
      <p className={LEAD}>How AveryDay is doing, across everyone.</p>
      <Numbers />
    </>
  )
}
