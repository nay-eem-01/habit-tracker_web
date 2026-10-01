const WEEKS = 15
const DAYS = 7
/** Today sits on the fourth row of the last column, so the grid ends mid-week like a real one. */
const TODAY_ROW = 3
const TODAY_INDEX = (WEEKS - 1) * DAYS + TODAY_ROW
const CURRENT_RUN = 11

type Cell = 'done' | 'missed' | 'today' | 'future'

function cellAt(index: number): Cell {
  if (index > TODAY_INDEX) return 'future'
  if (index === TODAY_INDEX) return 'today'
  if (TODAY_INDEX - index <= CURRENT_RUN) return 'done'
  return (index * 5 + 3) % 9 > 1 ? 'done' : 'missed'
}

const STYLES: Record<Cell, string> = {
  done: 'bg-white/90',
  missed: 'bg-white/15',
  today: 'bg-ember ring-2 ring-ember/40 ring-offset-2 ring-offset-lapis-deep',
  future: 'invisible',
}

/**
 * The streak chain: one square per day, weeks as columns, the current run unbroken up to today.
 * Decorative only — it says nothing a screen reader needs.
 */
export function ChainGrid() {
  return (
    <div
      aria-hidden="true"
      className="grid w-full max-w-md grid-flow-col gap-[3px] sm:gap-1"
      style={{ gridTemplateRows: `repeat(${DAYS}, auto)`, gridTemplateColumns: `repeat(${WEEKS}, 1fr)` }}
    >
      {Array.from({ length: WEEKS * DAYS }, (_, index) => (
        <span
          key={index}
          className={`chain-cell aspect-square rounded-[3px] ${STYLES[cellAt(index)]}`}
          style={{ animationDelay: `${Math.floor(index / DAYS) * 45}ms` }}
        />
      ))}
    </div>
  )
}
