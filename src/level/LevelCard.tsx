import type { Level } from '../api/level'
import { SURFACE } from '../components/styles'
import { TIERS, formatXp, xpToNext } from './level'

const EARNING = [
  ['+10', 'each done day that counts for a streak'],
  ['+5', 'more per day while a streak is a week or longer'],
  ['+50 · +200 · +500 · +1,500', 'when a streak reaches 7, 30, 100 and 365 days (1, 4, 14, 52 weeks)'],
  ['+500', 'for each goal you mark achieved'],
] as const

/** Level, tier and the way to the next level, for the dashboard. */
export function LevelCard({ level }: { level: Level }) {
  const tier = TIERS[level.tier]
  const percent = Math.round(level.progressToNextLevel * 100)
  return (
    <section className={`${SURFACE} p-5 sm:p-6`} aria-labelledby="level">
      <div className="flex items-center gap-4">
        <div
          aria-hidden="true"
          className="grid size-14 shrink-0 rotate-45 place-items-center rounded-xl"
          style={{ background: `color-mix(in srgb, ${tier.color} 22%, transparent)`, border: `2px solid ${tier.color}` }}
        >
          <span className="-rotate-45 font-display text-xl font-semibold">{level.level}</span>
        </div>
        <div className="min-w-0">
          <h2 id="level" className="font-display text-xl font-semibold tracking-tight">
            Level {level.level} · <span style={{ color: tier.color }}>{tier.name}</span>
          </h2>
          <p className="text-sm text-ink-soft">{formatXp(level.xp)} earned, never lost</p>
        </div>
      </div>
      <div className="mt-4">
        <div
          role="progressbar"
          aria-label={`Progress to level ${level.level + 1}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="h-3 overflow-hidden rounded-full bg-mist/50"
        >
          <div
            className="h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none"
            style={{ width: `${percent}%`, background: tier.color }}
          />
        </div>
        <p className="mt-2 text-sm text-ink-soft">
          {formatXp(xpToNext(level))} to level {level.level + 1}
        </p>
      </div>
      <details className="group mt-3 text-sm">
        <summary className="cursor-pointer font-medium text-link">How XP works</summary>
        <dl className="mt-2 grid gap-1.5">
          {EARNING.map(([xp, what]) => (
            <div key={what} className="flex gap-3">
              <dt className="w-28 shrink-0 font-semibold">{xp}</dt>
              <dd className="text-ink-soft">{what}</dd>
            </div>
          ))}
        </dl>
      </details>
    </section>
  )
}
