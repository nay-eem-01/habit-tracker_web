import { api } from './client'

/** Groups of levels: BRONZE 1–4, SILVER 5–9, GOLD 10–19, PLATINUM 20–34, DIAMOND 35+. */
export type Tier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND'

/** XP is earned from done days, streak milestones and achieved goals. Spending it on rest days never lowers the level. */
export interface Level {
  xp: number
  /** Starts at 1. */
  level: number
  tier: Tier
  /** Total XP at which the next level starts. */
  xpForNextLevel: number
  /** 0–1, how far through the current level. */
  progressToNextLevel: number
  /** XP spent on rest days. */
  spentXp: number
  /** XP left to spend: xp − spentXp. */
  xpBalance: number
}

export function getLevel(): Promise<Level> {
  return api('/api/me/level')
}
