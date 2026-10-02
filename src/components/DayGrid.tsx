export interface GridDay {
  date: string
  /** 0 (nothing) to 4 (everything), for shading. */
  level: 0 | 1 | 2 | 3 | 4
  /** After today, or before the habit existed: no square to fill. */
  blank: boolean
  /** Shown on hover. */
  title?: string
}

const SHADES: Record<GridDay['level'], string> = {
  0: 'bg-mist/45',
  1: 'bg-lapis/25',
  2: 'bg-lapis/50',
  3: 'bg-lapis/75',
  4: 'bg-lapis',
}

/** A calendar heatmap: weeks as columns, Monday at the top, darker for more done. Described by `label`. */
export function DayGrid({ weeks, label }: { weeks: GridDay[][]; label: string }) {
  return (
    <div
      role="img"
      aria-label={label}
      className="grid grid-flow-col gap-[3px] sm:gap-1"
      // squares stop growing at about 1.5rem, so a short span doesn't turn into big tiles on a wide card
      style={{
        gridTemplateRows: 'repeat(7, auto)',
        gridTemplateColumns: `repeat(${weeks.length}, 1fr)`,
        maxWidth: `${weeks.length * 1.75}rem`,
      }}
    >
      {weeks.flat().map((day) => (
        <span
          key={day.date}
          title={day.blank ? undefined : day.title}
          className={`aspect-square rounded-[3px] sm:rounded-[4px] ${day.blank ? 'invisible' : SHADES[day.level]}`}
        />
      ))}
    </div>
  )
}

/** The key under a grid: "Less ▢▢▢▢▢ More". */
export function DayGridLegend() {
  return (
    <div aria-hidden="true" className="flex items-center gap-1 text-xs text-ink-soft">
      Less
      {([0, 1, 2, 3, 4] as const).map((level) => (
        <span key={level} className={`size-3 rounded-[3px] ${SHADES[level]}`} />
      ))}
      More
    </div>
  )
}
