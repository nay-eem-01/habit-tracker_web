import { describeWeek, type WeekDay } from '../today/today'

const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const STATE: Record<WeekDay['state'], string> = {
  done: 'bg-lapis',
  // a rest keeps the chain without filling it: an outline in the same teal
  rest: 'bg-transparent ring-[1.5px] ring-inset ring-lapis',
  open: 'bg-mist',
  future: 'bg-transparent ring-1 ring-inset ring-mist',
}

/**
 * The week, Monday to Sunday, one square a day: teal when done, outlined for a rest, coral-ringed for today.
 * `small` sits inside a habit row; the large one carries the day letters under it.
 */
export function WeekStrip({ days, small = false }: { days: WeekDay[]; small?: boolean }) {
  return (
    <div role="img" aria-label={describeWeek(days)} className={`flex ${small ? 'gap-[5px]' : 'gap-1.5 sm:gap-2'}`}>
      {days.map((day, i) => (
        <span key={day.date} className="flex flex-col items-center gap-1.5">
          <span
            className={`block transition-colors duration-300 ease-out ${small ? 'size-2.5 rounded-[3px]' : 'size-8 rounded-lg sm:size-9'} ${STATE[day.state]} ${
              day.today ? (small ? 'outline-[1.5px] outline-offset-1 outline-ember' : 'outline-2 outline-offset-2 outline-ember') : ''
            }`}
          />
          {!small && <span className={`text-[0.8125rem] ${day.today ? 'font-semibold text-ink' : 'text-ink-soft'}`}>{LETTERS[i]}</span>}
        </span>
      ))}
    </div>
  )
}
