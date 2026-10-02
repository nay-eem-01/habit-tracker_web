const RADIUS = 34
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/** A progress ring for a 0–1 rate; an empty track when there is no rate yet. The text inside is the caller's. */
export function Ring({ rate, children }: { rate: number | null; children: React.ReactNode }) {
  const filled = CIRCUMFERENCE * Math.min(Math.max(rate ?? 0, 0), 1)
  return (
    <div className="relative grid size-24 shrink-0 place-items-center">
      <svg viewBox="0 0 80 80" aria-hidden="true" className="absolute inset-0 -rotate-90">
        <circle cx="40" cy="40" r={RADIUS} fill="none" strokeWidth="8" className="stroke-mist/50" />
        <circle
          cx="40"
          cy="40"
          r={RADIUS}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${CIRCUMFERENCE}`}
          className={`stroke-lapis transition-[stroke-dasharray] duration-500 ease-out motion-reduce:transition-none ${filled === 0 ? 'invisible' : ''}`}
        />
      </svg>
      {children}
    </div>
  )
}
