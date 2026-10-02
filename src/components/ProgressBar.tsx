/** A 0–100 bar. Decorative: the caller says the number in text next to it. */
export function ProgressBar({ percent, muted = false }: { percent: number; muted?: boolean }) {
  return (
    <div aria-hidden="true" className="h-2.5 overflow-hidden rounded-full bg-mist/50">
      <div
        className={`h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none ${muted ? 'bg-ink-soft/50' : 'bg-lapis'}`}
        style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }}
      />
    </div>
  )
}
