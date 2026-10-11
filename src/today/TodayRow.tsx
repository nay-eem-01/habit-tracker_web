import { Check, Fire } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { getStreak } from '../api/checkins'
import type { Habit } from '../api/habits'
import type { TodayStatus } from './today'

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
      <span className="check-ring absolute inset-0 rounded-xl border-2 border-ember" />
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
  if (!streak.data) return <div className="w-28" />
  const { current, unit } = streak.data
  if (current === 0) return <p className="w-28 text-right text-sm text-ink-soft">No streak yet</p>
  const noun = unit === 'WEEKS' ? 'week' : 'day'
  // the flame grows with the run and stops growing at a month; from a week on it flickers
  const flame = 16 + Math.min(current, 30) / 2
  return (
    <p className="w-28 text-right" aria-label={`${current} ${noun} streak`}>
      <Fire
        size={flame}
        weight="fill"
        className={`mr-1 inline -translate-y-1 text-ember ${current >= 7 ? 'flame-live' : ''}`}
        aria-hidden="true"
      />
      <span className="font-display text-3xl font-semibold text-ember-deep">{current}</span>
      <span className="ml-1 text-sm text-ink-soft">
        {noun}
        {current === 1 ? '' : 's'}
      </span>
    </p>
  )
}

interface TodayRowProps {
  habit: Habit
  status: TodayStatus
  /** Sets today's total for the habit (0 undoes). */
  onSetCount: (count: number) => void
  /** This row was just finished by a tap: play the burst as it lands in Done. */
  burst?: boolean
}

export function TodayRow({ habit, status, onSetCount, burst }: TodayRowProps) {
  const { count, target, done, week } = status
  const single = target === 1

  const progress = single
    ? week
      ? `${week.done} of ${week.goal} this week`
      : null
    : `${count} of ${target} today${week ? `, ${week.done} of ${week.goal} days this week` : ''}`

  return (
    <li className="flex items-center gap-4 rounded-2xl bg-surface p-4 shadow-[0_1px_2px_rgb(9_38_52/0.06),0_8px_20px_-14px_rgb(9_38_52/0.25)]">
      {single || done ? (
        <button
          type="button"
          aria-pressed={done}
          aria-label={done ? `Undo ${habit.name}` : `Mark ${habit.name} done`}
          onClick={() => onSetCount(done ? (single ? 0 : target - 1) : 1)}
          className={`${PRESS} relative grid size-12 shrink-0 place-items-center rounded-xl border-2 ${
            done
              ? 'border-ember bg-ember text-navy'
              : 'border-mist bg-surface text-transparent [@media(hover:hover)]:hover:border-ember'
          }`}
        >
          <Check
            size={22}
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
          className={`${PRESS} size-12 shrink-0 rounded-xl border-2 border-mist bg-surface text-sm font-semibold text-link [@media(hover:hover)]:hover:border-lapis`}
        >
          +1
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h3 className={`font-display text-xl font-semibold tracking-tight transition-colors duration-200 ${done ? 'text-ink-soft' : ''}`}>
          <Link to={`/habits/${habit.id}`} className="hover:text-link hover:underline underline-offset-2">
            {habit.name}
          </Link>
        </h3>
        {progress && <p className="mt-0.5 text-sm text-ink-soft">{progress}</p>}
        {!single && count > 0 && !done && (
          <button
            type="button"
            aria-label={`Take one away from ${habit.name}`}
            onClick={() => onSetCount(count - 1)}
            className="mt-1 text-sm font-medium text-link underline underline-offset-2"
          >
            Undo
          </button>
        )}
      </div>
      <StreakBadge habitId={habit.id} />
    </li>
  )
}
