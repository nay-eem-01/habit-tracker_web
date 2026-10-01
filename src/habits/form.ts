import type { DayOfWeek, FrequencyType, Habit, HabitRequest } from '../api/habits'

/** Monday first, like the backend's weeks. */
export const WEEK: { day: DayOfWeek; short: string; long: string }[] = [
  { day: 'MONDAY', short: 'Mon', long: 'Monday' },
  { day: 'TUESDAY', short: 'Tue', long: 'Tuesday' },
  { day: 'WEDNESDAY', short: 'Wed', long: 'Wednesday' },
  { day: 'THURSDAY', short: 'Thu', long: 'Thursday' },
  { day: 'FRIDAY', short: 'Fri', long: 'Friday' },
  { day: 'SATURDAY', short: 'Sat', long: 'Saturday' },
  { day: 'SUNDAY', short: 'Sun', long: 'Sunday' },
]

/** Everything the habit form edits. Numbers stay text while typing, so a field can be cleared. */
export interface HabitFormValues {
  name: string
  category: string
  frequencyType: FrequencyType
  days: DayOfWeek[]
  timesPerWeek: string
  targetCount: string
  remind: boolean
  reminderTime: string
}

export const EMPTY_HABIT: HabitFormValues = {
  name: '',
  category: '',
  frequencyType: 'DAILY',
  days: [],
  timesPerWeek: '3',
  targetCount: '1',
  remind: false,
  reminderTime: '08:00',
}

export function valuesFromHabit(habit: Habit): HabitFormValues {
  return {
    name: habit.name,
    category: habit.category ?? '',
    frequencyType: habit.frequencyType,
    days: habit.frequencyConfig?.days ?? [],
    timesPerWeek: String(habit.frequencyConfig?.timesPerWeek ?? 3),
    targetCount: String(habit.targetCount),
    remind: Boolean(habit.reminderTime),
    reminderTime: habit.reminderTime ?? EMPTY_HABIT.reminderTime,
  }
}

/**
 * The body for create and for the full-replace PUT. Only what applies to the chosen schedule is
 * sent; an empty category or an off reminder is left out, which clears it on the server.
 */
export function toRequest(values: HabitFormValues): HabitRequest {
  const request: HabitRequest = {
    name: values.name.trim(),
    frequencyType: values.frequencyType,
    targetCount: Number(values.targetCount) || 1,
  }
  const category = values.category.trim()
  if (category) request.category = category
  if (values.frequencyType === 'SPECIFIC_DAYS') {
    request.frequencyConfig = { days: WEEK.map((entry) => entry.day).filter((day) => values.days.includes(day)) }
  } else if (values.frequencyType === 'X_TIMES_PER_WEEK') {
    request.frequencyConfig = { timesPerWeek: Number(values.timesPerWeek) }
  }
  if (values.remind && values.reminderTime) request.reminderTime = values.reminderTime
  return request
}

/** A schedule in words: "Every day", "Mon, Wed, Fri", "3 times a week". */
export function describeSchedule(habit: Pick<Habit, 'frequencyType' | 'frequencyConfig'>): string {
  switch (habit.frequencyType) {
    case 'DAILY':
      return 'Every day'
    case 'SPECIFIC_DAYS': {
      const days = habit.frequencyConfig?.days ?? []
      if (days.length === WEEK.length) return 'Every day'
      return WEEK.filter((entry) => days.includes(entry.day))
        .map((entry) => entry.short)
        .join(', ')
    }
    case 'X_TIMES_PER_WEEK': {
      const times = habit.frequencyConfig?.timesPerWeek ?? 0
      return times === 1 ? 'Once a week' : `${times} times a week`
    }
  }
}
