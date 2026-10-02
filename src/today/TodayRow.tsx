import { useQuery } from '@tanstack/react-query'
import { getStreak } from '../api/checkins'
import type { Habit } from '../api/habits'
import type { TodayStatus } from './today'

const BUTTON = 'rounded-md border border-mist bg-white font-medium hover:border-ink-soft disabled:opacity-60'

function Check() {
  return (
    <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d="M4 10.5l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function StreakBadge({ habitId }: { habitId: number }) {
  const streak = useQuery({ queryKey: ['streak', habitId], queryFn: () => getStreak(habitId) })
  if (!streak.data) return <div className="w-24" />
  const { current, unit } = streak.data
  if (current === 0) return <p className="w-24 text-right text-sm text-ink-soft">No streak yet</p>
  const noun = unit === 'WEEKS' ? 'week' : 'day'
  return (
    <p className="w-24 text-right" aria-label={`${current} ${noun} streak`}>
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
    <li className="flex items-center gap-4 border-b border-mist py-4">
      {single || done ? (
        <button
          type="button"
          aria-pressed={done}
          aria-label={done ? `Undo ${habit.name}` : `Mark ${habit.name} done`}
          onClick={() => onSetCount(done ? (single ? 0 : target - 1) : 1)}
          className={`grid size-11 shrink-0 place-items-center rounded-md border-2 ${
            done ? 'border-lapis bg-lapis text-white' : 'border-mist bg-white text-transparent hover:border-ink-soft'
          }`}
        >
          <Check />
        </button>
      ) : (
        <button
          type="button"
          aria-label={`Add one for ${habit.name}`}
          onClick={() => onSetCount(count + 1)}
          className={`${BUTTON} h-11 w-11 shrink-0 text-sm`}
        >
          +1
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-xl font-semibold tracking-tight">{habit.name}</h3>
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
