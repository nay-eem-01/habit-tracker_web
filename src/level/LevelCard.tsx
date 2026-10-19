import type { Level } from '../api/level'
import { SURFACE } from '../components/styles'
import { EARNING, TIERS, formatXp, xpToNext } from './level'

/** The tier's diamond with the level in it, the level and tier as a heading, and the XP earned. */
export function LevelHeader({ level, id }: { level: Level; id?: string }) {
  const tier = TIERS[level.tier]
  return (
    <div className="flex items-center gap-4">
      <div
        aria-hidden="true"
        className="grid size-14 shrink-0 rotate-45 place-items-center rounded-xl"
        style={{ background: `color-mix(in srgb, ${tier.color} 22%, transparent)`, border: `2px solid ${tier.color}` }}
      >
        <span className="-rotate-45 font-display text-xl font-semibold">{level.level}</span>
      </div>
      <div className="min-w-0">
        <h2 id={id} className="font-display text-xl font-semibold tracking-tight">
          Level {level.level} · <span style={{ color: tier.color }}>{tier.name}</span>
        </h2>
        <p className="text-ink-soft">{formatXp(level.xp)} earned, never lost</p>
      </div>
    </div>
  )
}

/** How far through this level, in the tier's colour, and the XP still to go. */
export function LevelBar({ level }: { level: Level }) {
  const percent = Math.round(level.progressToNextLevel * 100)
  return (
    <div>
      <div
        role="progressbar"
        aria-label={`Progress to level ${level.level + 1}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-2.5 overflow-hidden rounded-full bg-mist"
      >
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none"
          style={{ width: `${percent}%`, background: TIERS[level.tier].color }}
        />
      </div>
      <p className="mt-2 text-[0.9375rem] text-ink-soft">
        {formatXp(xpToNext(level))} to level {level.level + 1}
      </p>
    </div>
  )
}

/** What earns XP, folded away until asked for. */
export function XpRules({ open = false }: { open?: boolean }) {
  return (
    <details open={open} className="group text-[0.9375rem]">
      <summary className="min-h-9 cursor-pointer content-center font-medium text-link">How XP works</summary>
      <dl className="mt-2 grid gap-1.5">
        {EARNING.map(([xp, what]) => (
          <div key={what} className="flex gap-3">
            <dt className="w-28 shrink-0 font-semibold">{xp}</dt>
            <dd className="text-ink-soft">{what}</dd>
          </div>
        ))}
      </dl>
    </details>
  )
}

/** Level, tier and the way to the next level, for the dashboard. */
export function LevelCard({ level }: { level: Level }) {
  return (
    <section className={`${SURFACE} p-5 sm:p-6`} aria-labelledby="level">
      <LevelHeader level={level} id="level" />
      <div className="mt-4">
        <LevelBar level={level} />
      </div>
      <div className="mt-3">
        <XpRules />
      </div>
    </section>
  )
}
