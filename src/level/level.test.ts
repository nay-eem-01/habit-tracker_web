import { describe, expect, it } from 'vitest'
import type { Level } from '../api/level'
import { formatXp, levelUp, nextTier, tierLadder, xpToNext } from './level'

const at = (level: number, tier: Level['tier'] = 'BRONZE'): Level => ({
  xp: 420,
  level,
  tier,
  xpForNextLevel: 600,
  progressToNextLevel: 0.4,
  spentXp: 0,
  xpBalance: 420,
})

describe('levelUp', () => {
  it('celebrates nothing on a first visit or when the level has not gone up', () => {
    expect(levelUp(null, at(3))).toBeNull()
    expect(levelUp(3, at(3))).toBeNull()
    expect(levelUp(4, at(3))).toBeNull()
  })

  it('celebrates a higher level, and says when it opens a new tier', () => {
    expect(levelUp(3, at(4))).toEqual({ level: 4, newTier: false })
    expect(levelUp(4, at(5, 'SILVER'))).toEqual({ level: 5, newTier: true })
    // two levels at once, across the tier line, still counts as the new tier
    expect(levelUp(3, at(5, 'SILVER'))).toEqual({ level: 5, newTier: true })
  })
})

describe('xp', () => {
  it('counts what is left to the next level, and groups thousands', () => {
    expect(xpToNext(at(3))).toBe(180)
    expect(formatXp(4500)).toBe('4,500 XP')
  })
})

describe('tiers', () => {
  it('lists each tier with the levels it covers, the last one open-ended', () => {
    expect(tierLadder().map((step) => `${step.name}: ${step.levels}`)).toEqual([
      'Bronze: Levels 1–4',
      'Silver: Levels 5–9',
      'Gold: Levels 10–19',
      'Platinum: Levels 20–34',
      'Diamond: Levels 35+',
    ])
  })

  it('names the next tier and where it starts, and nothing after Diamond', () => {
    expect(nextTier('BRONZE')).toEqual({ name: 'Silver', from: 5 })
    expect(nextTier('PLATINUM')).toEqual({ name: 'Diamond', from: 35 })
    expect(nextTier('DIAMOND')).toBeNull()
  })
})
