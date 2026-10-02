import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { habitErrorMessage, fieldError } from '../api/messages'
import { useAuth } from '../auth/context'
import { Button } from '../components/Button'
import { Field } from '../components/Field'
import { EMPTY_HABIT, WEEK, type HabitFormValues } from './form'
import type { DayOfWeek, FrequencyType } from '../api/habits'

interface HabitFormProps {
  initial?: HabitFormValues
  submitLabel: string
  pendingLabel: string
  pending: boolean
  error: unknown
  onSubmit: (values: HabitFormValues) => void
}

function Choice({
  checked,
  onSelect,
  children,
}: {
  checked: boolean
  onSelect: () => void
  children: ReactNode
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 py-1.5">
      <input type="radio" name="frequencyType" checked={checked} onChange={onSelect} className="size-4 accent-lapis" />
      <span>{children}</span>
    </label>
  )
}

export function HabitForm({ initial = EMPTY_HABIT, submitLabel, pendingLabel, pending, error, onSubmit }: HabitFormProps) {
  const { state } = useAuth()
  const timezone = state.status === 'authenticated' ? state.user.timezone : undefined
  const [values, setValues] = useState<HabitFormValues>(initial)
  const [daysMissing, setDaysMissing] = useState(false)

  const set = <K extends keyof HabitFormValues>(key: K, value: HabitFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }))

  const pick = (type: FrequencyType) => {
    set('frequencyType', type)
    setDaysMissing(false)
  }

  const toggleDay = (day: DayOfWeek) => {
    setDaysMissing(false)
    set('days', values.days.includes(day) ? values.days.filter((d) => d !== day) : [...values.days, day])
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (values.frequencyType === 'SPECIFIC_DAYS' && values.days.length === 0) {
      setDaysMissing(true)
      return
    }
    onSubmit(values)
  }

  return (
    <form onSubmit={submit} className="flex max-w-xl flex-col gap-6">
      <Field
        label="Name"
        required
        maxLength={120}
        placeholder="Read 20 pages"
        value={values.name}
        onChange={(event) => set('name', event.target.value)}
        error={fieldError(error, 'name', 'Name')}
      />
      <Field
        label="Category (optional)"
        maxLength={50}
        hint="Group related habits, like Health or Learning."
        value={values.category}
        onChange={(event) => set('category', event.target.value)}
        error={fieldError(error, 'category', 'Category')}
      />

      <fieldset>
        <legend className="mb-1 text-sm font-medium">How often</legend>
        <Choice checked={values.frequencyType === 'DAILY'} onSelect={() => pick('DAILY')}>
          Every day
        </Choice>
        <Choice checked={values.frequencyType === 'SPECIFIC_DAYS'} onSelect={() => pick('SPECIFIC_DAYS')}>
          On specific days
        </Choice>
        {values.frequencyType === 'SPECIFIC_DAYS' && (
          <div className="mt-1 mb-2 ml-7">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Days">
              {WEEK.map(({ day, short, long }) => {
                const on = values.days.includes(day)
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={on}
                    aria-label={long}
                    onClick={() => toggleDay(day)}
                    className={`h-10 min-w-12 rounded-xl border px-3 transition-[transform,background-color,border-color] duration-150 ease-out active:scale-95 text-sm font-medium ${
                      on ? 'border-lapis bg-lapis text-white' : 'border-mist bg-white hover:border-ink-soft'
                    }`}
                  >
                    {short}
                  </button>
                )
              })}
            </div>
            {daysMissing && (
              <p role="alert" className="mt-1.5 text-sm text-alert">
                Pick at least one day.
              </p>
            )}
          </div>
        )}
        <Choice checked={values.frequencyType === 'X_TIMES_PER_WEEK'} onSelect={() => pick('X_TIMES_PER_WEEK')}>
          A number of times a week
        </Choice>
        {values.frequencyType === 'X_TIMES_PER_WEEK' && (
          <Field
            className="mt-1 mb-2 ml-7"
            narrow
            label="Times a week"
            type="number"
            min={1}
            max={6}
            required
            hint="1 to 6. Any days count."
            value={values.timesPerWeek}
            onChange={(event) => set('timesPerWeek', event.target.value)}
          />
        )}
      </fieldset>

      <Field
        narrow
        label="Times a day"
        type="number"
        min={1}
        max={100}
        required
        hint="How many check-ins make a day done, like 8 for glasses of water."
        value={values.targetCount}
        onChange={(event) => set('targetCount', event.target.value)}
        error={fieldError(error, 'targetCount', 'Times a day')}
      />

      <div>
        <label className="flex cursor-pointer items-center gap-3 text-sm font-medium">
          <input
            type="checkbox"
            checked={values.remind}
            onChange={(event) => set('remind', event.target.checked)}
            className="size-4 accent-lapis"
          />
          Remind me
        </label>
        {values.remind && (
          <Field
            className="mt-3 ml-7"
            narrow
            label="Reminder time"
            type="time"
            required
            hint={timezone ? `In your timezone, ${timezone}.` : undefined}
            value={values.reminderTime}
            onChange={(event) => set('reminderTime', event.target.value)}
            error={fieldError(error, 'reminderTime', 'Reminder time')}
          />
        )}
      </div>

      {error != null && (
        <p role="alert" className="text-sm text-alert">
          {habitErrorMessage(error)}
        </p>
      )}
      <div className="flex items-center gap-4">
        <Button type="submit" busy={pending}>
          {pending ? pendingLabel : submitLabel}
        </Button>
        <Link to="/habits" className="font-medium text-lapis underline underline-offset-2">
          Cancel
        </Link>
      </div>
    </form>
  )
}
