import type { Level, Tier } from '../api/level'

/** Each tier's name and colour; the colours read on both the light and the dark page. */
export const TIERS: Record<Tier, { name: string; color: string; from: number }> = {
  BRONZE: { name: 'Bronze', color: '#c27a3e', from: 1 },
  SILVER: { name: 'Silver', color: '#8f9bab', from: 5 },
  GOLD: { name: 'Gold', color: '#d4a017', from: 10 },
  PLATINUM: { name: 'Platinum', color: '#3fa7a0', from: 20 },
  DIAMOND: { name: 'Diamond', color: '#5b8cff', from: 35 },
}

/** XP still needed for the next level. */
export function xpToNext(level: Level): number {
  return Math.max(level.xpForNextLevel - level.xp, 0)
}

/** "1,250 XP": XP grows into the thousands. */
export function formatXp(xp: number): string {
  return `${new Intl.NumberFormat('en-GB').format(xp)} XP`
}

/** Where the last seen level is kept, per user, to tell a level-up from a first visit. */
const seenKey = (userId: number) => `devhabit.level.${userId}`

export function readSeenLevel(userId: number): number | null {
  try {
    const value = localStorage.getItem(seenKey(userId))
    return value === null ? null : Number(value)
  } catch {
    return null
  }
}

export function writeSeenLevel(userId: number, level: number): void {
  try {
    localStorage.setItem(seenKey(userId), String(level))
  } catch {
    // private mode or blocked storage: the level-up just won't be announced
  }
}

/**
 * What to celebrate when `current` arrives: nothing on a first visit (only remembered), nothing
 * when it hasn't gone up, otherwise the new level and whether it opened a new tier.
 */
export function levelUp(seen: number | null, current: Level): { level: number; newTier: boolean } | null {
  if (seen === null || current.level <= seen) return null
  return { level: current.level, newTier: TIERS[current.tier].from > seen }
}
