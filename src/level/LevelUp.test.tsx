// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Level } from '../api/level'
import { ok, page, renderApp, resetApp, session, stubApi } from '../test/helpers'

const level = (n: number, tier: Level['tier'] = 'BRONZE', xp = 420): Level => ({
  xp,
  level: n,
  tier,
  xpForNextLevel: 50 * n * (n + 1),
  progressToNextLevel: 0.4,
})
const read = {
  id: 1,
  name: 'Read',
  frequencyType: 'DAILY',
  frequencyConfig: null,
  targetCount: 1,
  archived: false,
  createdAt: '2026-09-01T00:00:00Z',
}
const signedIn = { 'POST /api/auth/refresh': () => ok(session) }
const KEY = `devhabit.level.${session.user.id}`

beforeEach(() => {
  resetApp()
  localStorage.clear()
  vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-02T04:00:00Z') })
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('level in the header', () => {
  it('shows the level, and says the XP to the next one to a screen reader', async () => {
    stubApi({ ...signedIn, 'GET /api/me/level': () => ok(level(3)), 'GET /api/goals': () => ok(page([])) })
    renderApp('/goals')

    const badge = await screen.findByRole('link', { name: 'Level 3, Bronze. 180 XP to level 4.' })
    expect(badge.textContent).toBe('Lv 3')
  })
})

describe('level up', () => {
  it('only remembers the level on a first visit', async () => {
    stubApi({ ...signedIn, 'GET /api/me/level': () => ok(level(3)), 'GET /api/goals': () => ok(page([])) })
    renderApp('/goals')

    await screen.findByRole('link', { name: /^Level 3,/ })
    expect(screen.queryByText('Level up')).toBeNull()
    expect(localStorage.getItem(KEY)).toBe('3')
  })

  it('announces a level reached since the last visit, once', async () => {
    localStorage.setItem(KEY, '4')
    stubApi({ ...signedIn, 'GET /api/me/level': () => ok(level(5, 'SILVER')), 'GET /api/goals': () => ok(page([])) })
    renderApp('/goals')

    expect(await screen.findByText('Level 5')).toBeTruthy()
    expect(screen.getByText('Silver')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Nice' }))

    expect(screen.queryByText('Level up')).toBeNull()
    expect(localStorage.getItem(KEY)).toBe('5')
  })

  it('levels up right after the check-in that earned it', async () => {
    let checkedIn = false
    stubApi({
      ...signedIn,
      'GET /api/me/level': () => ok(checkedIn ? level(4, 'BRONZE', 610) : level(3, 'BRONZE', 595)),
      'GET /api/habits': () => ok(page([read])),
      'GET /api/habits/1/logs': () => ok(page(checkedIn ? [{ id: 1, date: '2026-10-02', completedCount: 1, done: true }] : [])),
      'GET /api/habits/1/streak': () => ok({ current: 1, longest: 1, unit: 'DAYS' }),
      'POST /api/habits/1/checkin': () => {
        checkedIn = true
        return ok({ id: 1, date: '2026-10-02', completedCount: 1, done: true })
      },
    })
    renderApp('/today')

    await screen.findByRole('link', { name: /^Level 3,/ })
    await userEvent.click(await screen.findByRole('button', { name: 'Mark Read done' }))

    expect(await screen.findByText('Level 4')).toBeTruthy()
    expect(screen.getByRole('link', { name: /^Level 4,/ })).toBeTruthy()
  })
})

describe('level card', () => {
  it('shows the level, tier, XP and the way to the next level', async () => {
    const { render } = await import('@testing-library/react')
    const { LevelCard } = await import('./LevelCard')
    render(<LevelCard level={{ xp: 1250, level: 5, tier: 'SILVER', xpForNextLevel: 1500, progressToNextLevel: 0.5 }} />)

    expect(screen.getByRole('heading').textContent).toBe('Level 5 · Silver')
    expect(screen.getByText('1,250 XP earned, never lost')).toBeTruthy()
    expect(screen.getByRole('progressbar', { name: 'Progress to level 6' }).getAttribute('aria-valuenow')).toBe('50')
    expect(screen.getByText('250 XP to level 6')).toBeTruthy()
  })
})
