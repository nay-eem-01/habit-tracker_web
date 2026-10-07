import { api } from './client'

/** Groups of levels: BRONZE 1–4, SILVER 5–9, GOLD 10–19, PLATINUM 20–34, DIAMOND 35+. */
export type Tier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND'

/** XP is earned from done days, streak milestones and achieved goals, and never lost. */
export interface Level {
  xp: number
  /** Starts at 1. */
  level: number
  tier: Tier
  /** Total XP at which the next level starts. */
  xpForNextLevel: number
  /** 0–1, how far through the current level. */
  progressToNextLevel: number
}

export function getLevel(): Promise<Level> {
  return api('/api/me/level')
}
