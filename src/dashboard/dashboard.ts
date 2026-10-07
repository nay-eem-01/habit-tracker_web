import type { HeatmapDay } from '../api/dashboard'
import type { DayOfWeek } from '../api/habits'
import type { GridDay } from '../components/DayGrid'
import { formatDay, shiftDays, weekStart } from '../today/today'

/** A day's share of habits done as a shade: nothing, some, half, most, all. */
export function levelOf(ratio: number | null): GridDay['level'] {
  if (ratio === null || ratio <= 0) return 0
  if (ratio <= 0.25) return 1
  if (ratio <= 0.5) return 2
  if (ratio < 1) return 3
  return 4
}

/**
 * The server's year of days as week columns, Monday at the top: the first week is padded back to its
 * Monday and the last forward to its Sunday with blank squares.
 */
export function yearWeeks(days: HeatmapDay[]): GridDay[][] {
  if (days.length === 0) return []
  const byDate = new Map(days.map((day) => [day.date, day]))
  const first = weekStart(days[0].date)
  const last = days[days.length - 1].date
  const weeks: GridDay[][] = []
  for (let monday = first; monday <= last; monday = shiftDays(monday, 7)) {
    weeks.push(
      Array.from({ length: 7 }, (_, offset) => {
        const date = shiftDays(monday, offset)
        const day = byDate.get(date)
        if (!day) return { date, level: 0, blank: true }
        return {
          date,
          level: levelOf(day.ratio),
          blank: false,
          title:
            day.expected === 0 ? `${formatDay(date)}: nothing due` : `${formatDay(date)}: ${day.done} of ${day.expected} done`,
        }
      }),
    )
  }
  return weeks
}

/** A rate change in percentage points: "+12 pts", "−5 pts", "no change"; null with nothing to compare. */
export function formatChange(change: number | null): string | null {
  if (change === null) return null
  const points = Math.round(change * 100)
  if (points === 0) return 'no change'
  return `${points > 0 ? '+' : '−'}${Math.abs(points)} pts`
}

export const percent = (rate: number | null) => (rate === null ? '–' : `${Math.round(rate * 100)}%`)

export const DAY_NAMES: Record<DayOfWeek, { short: string; long: string }> = {
  MONDAY: { short: 'Mon', long: 'Monday' },
  TUESDAY: { short: 'Tue', long: 'Tuesday' },
  WEDNESDAY: { short: 'Wed', long: 'Wednesday' },
  THURSDAY: { short: 'Thu', long: 'Thursday' },
  FRIDAY: { short: 'Fri', long: 'Friday' },
  SATURDAY: { short: 'Sat', long: 'Saturday' },
  SUNDAY: { short: 'Sun', long: 'Sunday' },
}

/** "7 am", "12 pm", "11 pm" for an hour 0–23; "midnight" for 0. */
export function hourLabel(hour: number): string {
  if (hour === 0) return 'midnight'
  if (hour === 12) return '12 pm'
  return hour < 12 ? `${hour} am` : `${hour - 12} pm`
}
