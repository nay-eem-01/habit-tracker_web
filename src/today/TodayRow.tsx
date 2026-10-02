import { Check, Fire } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getStreak } from '../api/checkins'
import type { Habit } from '../api/habits'
import type { TodayStatus } from './today'

const PRESS = 'transition-[transform,background-color,border-color,color] duration-150 ease-out active:scale-90'

function StreakBadge({ habitId }: { habitId: number }) {
  const streak = useQuery({ queryKey: ['streak', habitId], queryFn: () => getStreak(habitId) })
  if (!streak.data) return <div className="w-28" />
  const { current, unit } = streak.data
  if (current === 0) return <p className="w-28 text-right text-sm text-ink-soft">No streak yet</p>
  const noun = unit === 'WEEKS' ? 'week' : 'day'
  return (
    <p className="w-28 text-right" aria-label={`${current} ${noun} streak`}>
      <Fire size={20} weight="fill" className="mr-1 inline -translate-y-1 text-ember" aria-hidden="true" />
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
}

export function TodayRow({ habit, status, onSetCount }: TodayRowProps) {
  const { count, target, done, week } = status
  const single = target === 1

  const progress = single
    ? week
      ? `${week.done} of ${week.goal} this week`
      : null
    : `${count} of ${target} today${week ? `, ${week.done} of ${week.goal} days this week` : ''}`

  return (
    <li className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgb(29_36_51/0.06),0_8px_20px_-14px_rgb(29_36_51/0.25)]">
      {single || done ? (
        <button
          type="button"
          aria-pressed={done}
          aria-label={done ? `Undo ${habit.name}` : `Mark ${habit.name} done`}
          onClick={() => onSetCount(done ? (single ? 0 : target - 1) : 1)}
          className={`${PRESS} grid size-12 shrink-0 place-items-center rounded-xl border-2 ${
            done
              ? 'border-lapis bg-lapis text-white'
              : 'border-mist bg-white text-transparent [@media(hover:hover)]:hover:border-lapis'
          }`}
        >
          <Check
            size={22}
            weight="bold"
            aria-hidden="true"
            className={`transition-[transform,opacity] duration-200 ease-out ${done ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}
          />
        </button>
      ) : (
        <button
          type="button"
          aria-label={`Add one for ${habit.name}`}
          onClick={() => onSetCount(count + 1)}
          className={`${PRESS} size-12 shrink-0 rounded-xl border-2 border-mist bg-white text-sm font-semibold text-lapis [@media(hover:hover)]:hover:border-lapis`}
        >
          +1
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h3 className={`font-display text-xl font-semibold tracking-tight transition-colors duration-200 ${done ? 'text-ink-soft' : ''}`}>
          <Link to={`/habits/${habit.id}`} className="hover:text-lapis hover:underline underline-offset-2">
            {habit.name}
          </Link>
        </h3>
        {progress && <p className="mt-0.5 text-sm text-ink-soft">{progress}</p>}
        {!single && count > 0 && !done && (
          <button
            type="button"
            aria-label={`Take one away from ${habit.name}`}
            onClick={() => onSetCount(count - 1)}
            className="mt-1 text-sm font-medium text-lapis underline underline-offset-2"
          >
            Undo
          </button>
        )}
      </div>
      <StreakBadge habitId={habit.id} />
    </li>
  )
}
