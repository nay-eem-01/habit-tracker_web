import { useEffect, useState, type CSSProperties } from 'react'
import { TIERS, levelUp, readSeenLevel, writeSeenLevel } from './level'
import { PRIMARY } from '../components/styles'
import { useLevel } from './useLevel'

/**
 * Squares that burst up from behind the card's top edge, like the chain on the sign-in page
 * breaking into confetti. Upward only, so none land on the text.
 */
const BURST = Array.from({ length: 14 }, (_, i) => {
  const angle = Math.PI + (i / 13) * Math.PI
  const reach = 60 + (i % 3) * 26
  return { dx: Math.round(Math.cos(angle) * reach), dy: Math.round(Math.sin(angle) * reach), delay: (i % 4) * 30 }
})

/**
 * Celebrates a new level once: the last level seen is remembered per user, so a first visit only
 * remembers it, and a level reached since (by a check-in, or on another device) is announced.
 */
export function LevelUp({ userId }: { userId: number }) {
  const level = useLevel()
  const [seen, setSeen] = useState(() => readSeenLevel(userId))

  // a first visit: what they have now is the starting point, nothing to celebrate
  if (seen === null && level.data) setSeen(level.data.level)

  useEffect(() => {
    if (seen !== null) writeSeenLevel(userId, seen)
  }, [userId, seen])

  const up = level.data ? levelUp(seen, level.data) : null
  if (!up || !level.data) return null
  const tier = TIERS[level.data.tier]

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
      <div
        role="status"
        className="level-up pointer-events-auto relative w-full max-w-sm rounded-3xl bg-surface p-5 text-center shadow-[0_24px_48px_-16px_rgb(9_38_52/0.45)]"
        style={{ border: `2px solid ${tier.color}` }}
      >
        {/* behind the card: the pieces show only once they clear its edge */}
        <div aria-hidden="true" className="absolute top-2 left-1/2 -z-10">
          {BURST.map((piece, i) => (
            <span
              key={i}
              className="level-burst absolute size-2.5 rounded-[2px]"
              style={
                {
                  background: i % 3 === 0 ? 'var(--color-ember)' : tier.color,
                  '--dx': `${piece.dx}px`,
                  '--dy': `${piece.dy}px`,
                  animationDelay: `${piece.delay}ms`,
                } as CSSProperties
              }
            />
          ))}
        </div>
        <p className="text-sm font-medium text-ink-soft">Level up</p>
        <p className="font-display text-4xl font-semibold tracking-tight">Level {up.level}</p>
        <p className="mt-1 text-ink-soft">
          {up.newTier ? (
            <>
              You reached <span className="font-semibold" style={{ color: tier.color }}>{tier.name}</span>.
            </>
          ) : (
            'Every done day adds up. Keep the chain going.'
          )}
        </p>
        <button
          type="button"
          onClick={() => setSeen(up.level)}
          className={`${PRIMARY} mt-4 h-10 px-5 text-sm`}
        >
          Nice
        </button>
      </div>
    </div>
  )
}
