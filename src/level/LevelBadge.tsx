import { Link } from 'react-router-dom'
import { TIERS, formatXp, xpToNext } from './level'
import { useLevel } from './useLevel'

/** The level in the header: a tier-coloured square and the number. Nothing until it loads. */
export function LevelBadge() {
  const level = useLevel()
  if (!level.data) return null
  const { level: n, tier } = level.data
  const { name, color } = TIERS[tier]
  return (
    <Link
      to="/"
      aria-label={`Level ${n}, ${name}. ${formatXp(xpToNext(level.data))} to level ${n + 1}.`}
      title={`${name} · ${formatXp(level.data.xp)}`}
      // on a phone only the number, ringed in the tier's colour, so the header keeps to one row at 320px
      className="inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-full border-2 bg-surface px-2.5 text-sm font-semibold transition-transform duration-150 ease-out active:scale-95 sm:border sm:border-mist! sm:px-3"
      style={{ borderColor: color }}
    >
      <span aria-hidden="true" className="hidden size-2.5 rotate-45 rounded-[2px] sm:block" style={{ background: color }} />
      <span>
        <span className="hidden sm:inline">Lv </span>
        {n}
      </span>
    </Link>
  )
}
