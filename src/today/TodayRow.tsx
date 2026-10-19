import { Check, Fire, Leaf, Moon, X } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { getStreak } from '../api/checkins'
import type { Habit } from '../api/habits'
import { TEXT_BUTTON } from '../components/styles'
import { WeekStrip } from '../components/WeekStrip'
import type { TodayStatus, WeekDay } from './today'

const PRESS = 'transition-[transform,background-color,border-color,color] duration-150 ease-out active:scale-90'

/** Six squares thrown out of the check box, one per 60°. */
const BURST = Array.from({ length: 6 }, (_, i) => {
  const angle = (i / 6) * Math.PI * 2 + 0.4
  return { dx: Math.round(Math.cos(angle) * 34), dy: Math.round(Math.sin(angle) * 34) }
})

/** A ring and a handful of squares, once, from the middle of the check box. */
function CheckBurst() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0">
      <span className="check-ring absolute inset-0 rounded-xl border-2 border-sage-deep" />
      {BURST.map((piece, i) => (
        <span
          key={i}
          className="level-burst absolute top-1/2 left-1/2 size-2 rounded-[2px] bg-ember"
          style={{ '--dx': `${piece.dx}px`, '--dy': `${piece.dy}px`, animationDelay: '0ms' } as CSSProperties}
        />
      ))}
    </span>
  )
}

function StreakBadge({ habitId }: { habitId: number }) {
  const streak = useQuery({ queryKey: ['streak', habitId], queryFn: () => getStreak(habitId) })
  if (!streak.data) return <div className="w-14 shrink-0" />
  const { current, unit } = streak.data
  if (current === 0) return <p className="shrink-0 text-right text-sm text-ink-soft">No streak yet</p>
  const noun = unit === 'WEEKS' ? 'week' : 'day'
  // a week or more of days (or a month of weeks) earns the filled flame; before that it is only outlined
  const lit = current >= (unit === 'WEEKS' ? 4 : 7)
  return (
    <p className="flex shrink-0 flex-col items-end leading-none" aria-label={`${current} ${noun} streak`}>
      <span className="flex items-center gap-1">
        <Fire size={18} weight={lit ? 'fill' : 'regular'} className={lit ? 'text-ember' : 'text-ember-deep'} aria-hidden="true" />
        <span className="font-display text-2xl font-semibold tabular-nums text-ink">{current}</span>
      </span>
      <span className="mt-1 text-[0.8125rem] text-ink-soft">
        {noun}
        {current === 1 ? '' : 's'}
      </span>
    </p>
  )
}

/** A row of the day's list: no card, a hairline between rows (drawn by the list) does the separating. */
const ROW = 'flex items-start gap-3.5 py-4 sm:gap-4'
const MARK = 'grid size-12 shrink-0 place-items-center rounded-xl'

function HabitName({ habit, muted }: { habit: Habit; muted?: boolean }) {
  return (
    <h3 className={`font-display text-lg leading-snug font-semibold tracking-tight transition-colors duration-200 sm:text-xl ${muted ? 'text-ink-soft' : ''}`}>
      <Link to={`/habits/${habit.id}`} className="underline-offset-[3px] hover:text-link hover:underline">
        {habit.name}
      </Link>
    </h3>
  )
}

/** "Rest today · free", then a confirm when it costs XP. */
function RestControl({ name, cost, balance, busy, onRest }: { name: string; cost: number; balance?: number; busy?: boolean; onRest: () => void }) {
  const [asking, setAsking] = useState(false)
  if (!asking) {
    return (
      <button
        type="button"
        disabled={busy}
        aria-label={`Rest ${name} today`}
        onClick={() => (cost === 0 ? onRest() : setAsking(true))}
        className={TEXT_BUTTON}
      >
        Rest today · {cost === 0 ? 'free' : `${cost} XP`}
      </button>
    )
  }
  const short = balance != null && balance < cost
  return (
    <span className="flex flex-wrap items-center gap-x-3 text-[0.9375rem]">
      <span>
        {short ? `A rest costs ${cost} XP; you have ${balance}.` : `Rest for ${cost} XP?${balance != null ? ` You have ${balance}.` : ''}`}
      </span>
      {!short && (
        <button type="button" disabled={busy} onClick={onRest} className={TEXT_BUTTON}>
          Yes, rest
        </button>
      )}
      <button type="button" onClick={() => setAsking(false)} className={TEXT_BUTTON}>
        {short ? 'OK' : 'Not now'}
      </button>
    </span>
  )
}

interface TodayRowProps {
  habit: Habit
  status: TodayStatus
  /** Monday to Sunday for this habit, from the week's logs. */
  week?: WeekDay[]
  /** Sets today's total for the habit (0 undoes). */
  onSetCount: (count: number) => void
  /** This row was just finished by a tap: play the burst as it lands in Done. */
  burst?: boolean
  onRest?: () => void
  onCancelRest?: () => void
  /** Spendable XP, for pricing a rest day. */
  xpBalance?: number
  restBusy?: boolean
}

/** The name, one line of what today means for it, then the week; actions trail underneath. */
function Body({ habit, muted, meta, week, children }: { habit: Habit; muted?: boolean; meta?: string | null; week?: WeekDay[]; children?: React.ReactNode }) {
  return (
    <div className="min-w-0 flex-1 pt-0.5">
      <HabitName habit={habit} muted={muted} />
      {meta && <p className="mt-0.5 text-[0.9375rem] text-ink-soft">{meta}</p>}
      {week && (
        <div className="mt-2">
          <WeekStrip days={week} small />
        </div>
      )}
      {children}
    </div>
  )
}

export function TodayRow({ habit, status, week: days, onSetCount, burst, onRest, onCancelRest, xpBalance, restBusy }: TodayRowProps) {
  const { count, target, done, week, resting, restCost } = status
  const single = target === 1
  const unit = habit.unit ? ` ${habit.unit}` : ''

  if (resting) {
    return (
      <li className={ROW}>
        <span aria-hidden="true" className={`${MARK} bg-lapis/10 text-link`}>
          <Moon size={22} weight="fill" />
        </span>
        <Body habit={habit} muted meta="Resting today. The streak holds." week={days}>
          {onCancelRest && (
            <button type="button" disabled={restBusy} onClick={onCancelRest} aria-label={`Take back the rest for ${habit.name}`} className={TEXT_BUTTON}>
              Take it back
            </button>
          )}
        </Body>
        <StreakBadge habitId={habit.id} />
      </li>
    )
  }

  const progress = single
    ? week
      ? `${week.done} of ${week.goal} this week`
      : habit.category
    : `${count} of ${target}${unit} today${week ? `, ${week.done} of ${week.goal} days this week` : ''}`

  return (
    <li className={ROW}>
      {single || done ? (
        <button
          type="button"
          aria-pressed={done}
          aria-label={done ? `Undo ${habit.name}` : `Mark ${habit.name} done`}
          onClick={() => onSetCount(done ? (single ? 0 : target - 1) : 1)}
          className={`${PRESS} ${MARK} relative border-2 ${
            done
              ? `border-sage-deep bg-sage-deep text-chalk ${burst ? 'check-pop' : ''}`
              : 'border-line bg-surface text-transparent [@media(hover:hover)]:hover:border-lapis [@media(hover:hover)]:hover:bg-lapis/5'
          }`}
        >
          <Check
            size={24}
            weight="bold"
            aria-hidden="true"
            className={`transition-[transform,opacity] duration-200 ease-out ${done ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}
          />
          {done && burst && <CheckBurst />}
        </button>
      ) : (
        <button
          type="button"
          aria-label={`Add one for ${habit.name}`}
          onClick={() => onSetCount(count + 1)}
          className={`${PRESS} ${MARK} relative overflow-hidden border-2 border-line bg-surface font-display text-base font-semibold text-link [@media(hover:hover)]:hover:border-lapis`}
        >
          {/* the box fills from the bottom as the count climbs, so a half-done habit looks half done */}
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 bg-lapis/12 transition-[height] duration-300 ease-out motion-reduce:transition-none"
            style={{ height: `${Math.min(count / target, 1) * 100}%` }}
          />
          <span className="relative">+1</span>
        </button>
      )}
      <Body habit={habit} muted={done} meta={progress} week={days}>
        {((!single && count > 0 && !done) || (onRest && restCost != null && count === 0)) && (
          <div className="mt-1 flex flex-wrap gap-x-4">
            {!single && count > 0 && !done && (
              <button
                type="button"
                aria-label={`Take one away from ${habit.name}`}
                onClick={() => onSetCount(count - 1)}
                className={TEXT_BUTTON}
              >
                Undo
              </button>
            )}
            {onRest && restCost != null && count === 0 && (
              <RestControl name={habit.name} cost={restCost} balance={xpBalance} busy={restBusy} onRest={onRest} />
            )}
          </div>
        )}
      </Body>
      <StreakBadge habitId={habit.id} />
    </li>
  )
}

/** A habit being quit: clean unless a slip is logged today. A check-in is the slip. */
export function QuitRow({ habit, slipped, onSetCount }: { habit: Habit; slipped: boolean; onSetCount: (count: number) => void }) {
  return (
    <li className={ROW}>
      <span aria-hidden="true" className={`${MARK} ${slipped ? 'bg-alert/10 text-alert' : 'bg-sage text-sage-deep'}`}>
        {slipped ? <X size={22} weight="bold" /> : <Leaf size={22} weight="fill" />}
      </span>
      <Body habit={habit} meta={slipped ? 'Slipped today. Tomorrow starts clean.' : 'Clean today'}>
        <button
          type="button"
          aria-label={slipped ? `Undo the slip for ${habit.name}` : `I slipped on ${habit.name}`}
          onClick={() => onSetCount(slipped ? 0 : 1)}
          className={TEXT_BUTTON}
        >
          {slipped ? 'Undo' : 'I slipped'}
        </button>
      </Body>
      <StreakBadge habitId={habit.id} />
    </li>
  )
}
