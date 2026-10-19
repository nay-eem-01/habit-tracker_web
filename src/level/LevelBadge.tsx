import { useRef } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { REST_COST } from '../today/today'
import { LevelBar, LevelHeader, XpRules } from './LevelCard'
import { TIERS, formatXp, nextTier, tierLadder, xpToNext } from './level'
import { useLevel } from './useLevel'

const restCosts = REST_COST.map((cost) => (cost === 0 ? 'free' : formatXp(cost))).join(', then ')

/**
 * The level in the header: a tier-coloured square and the number. A tap opens the level up close:
 * progress, the tiers, the XP there is to spend on rest days, and how XP is earned. Nothing until it loads.
 */
export function LevelBadge() {
  const level = useLevel()
  const panel = useRef<HTMLDivElement>(null)
  if (!level.data) return null
  const data = level.data
  const { level: n, tier } = data
  const { name, color } = TIERS[tier]
  const next = nextTier(tier)

  return (
    <Popover>
      <PopoverTrigger
        aria-label={`Level ${n}, ${name}. ${formatXp(xpToNext(data))} to level ${n + 1}.`}
        title={`${name} · ${formatXp(data.xp)}`}
        // on a phone only the number, ringed in the tier's colour, so the header keeps to one row at 320px
        className="inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-full border-2 bg-surface px-2.5 text-sm font-semibold transition-[transform,border-color] duration-150 ease-out active:scale-95 data-[popup-open]:border-lapis! sm:border sm:border-mist! sm:px-3"
        style={{ borderColor: color }}
      >
        <span aria-hidden="true" className="hidden size-2.5 rotate-45 rounded-[2px] sm:block" style={{ background: color }} />
        <span>
          <span className="hidden sm:inline">Lv </span>
          {n}
        </span>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        // the page's own gutter, so the panel never sits closer to the screen edge than the content does
        collisionPadding={16}
        // focus the panel itself, not its first control: on a short phone that one is at the bottom and would scroll the level out of view
        ref={panel}
        initialFocus={panel}
        aria-label="Your level"
        className="max-h-[calc(100dvh-10.5rem-env(safe-area-inset-bottom))] w-[min(22rem,calc(100vw-2rem))] md:max-h-[calc(100dvh-6rem)] gap-0 overflow-y-auto rounded-2xl border border-mist bg-surface p-5 text-base outline-none text-ink shadow-[0_18px_40px_-12px_rgb(15_42_51/0.3)] ring-0"
      >
        <LevelHeader level={data} />
        <div className="mt-4">
          <LevelBar level={data} />
        </div>

        <section aria-labelledby="tiers" className="mt-5 border-t border-mist pt-4">
          <div className="flex items-baseline justify-between gap-3">
            <h3 id="tiers" className="font-medium">
              Tiers
            </h3>
            <p className="text-[0.9375rem] text-ink-soft">{next ? `${next.name} at level ${next.from}` : 'The top tier'}</p>
          </div>
          <ol className="mt-2 grid gap-1">
            {tierLadder().map((step) => {
              const current = step.tier === tier
              return (
                <li
                  key={step.tier}
                  aria-current={current ? 'step' : undefined}
                  className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[0.9375rem] ${current ? 'bg-wash font-medium' : 'text-ink-soft'}`}
                >
                  <span aria-hidden="true" className="size-2.5 shrink-0 rotate-45 rounded-[2px]" style={{ background: step.color }} />
                  <span className={current ? 'text-ink' : ''}>{step.name}</span>
                  <span className="ml-auto tabular-nums">{step.levels}</span>
                </li>
              )
            })}
          </ol>
        </section>

        <section aria-labelledby="spend" className="mt-4 border-t border-mist pt-4">
          <h3 id="spend" className="font-medium">
            To spend on rest days
          </h3>
          <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{formatXp(data.xpBalance)}</p>
          <p className="mt-1 text-[0.9375rem] text-ink-soft">
            {data.spentXp > 0 ? `${formatXp(data.spentXp)} spent so far. ` : ''}A habit’s rests each week cost {restCosts}. Spending
            never lowers your level.
          </p>
        </section>

        <div className="mt-3 border-t border-mist pt-2">
          <XpRules />
        </div>
      </PopoverContent>
    </Popover>
  )
}
