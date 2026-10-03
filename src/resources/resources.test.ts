import { describe, expect, it } from 'vitest'
import { backPath, emptyResource, hostOf, safeHref, toResourceRequest } from './resources'

describe('toResourceRequest', () => {
  it('sends a note without a url, trimmed, on its goal', () => {
    expect(
      toResourceRequest({ ...emptyResource('NOTE', '3'), title: ' Plan ', body: ' **Week 1** ', url: 'https://left.over' }),
    ).toEqual({ type: 'NOTE', title: 'Plan', body: '**Week 1**', goalId: 3, pinned: false })
  })

  it('sends a link with its url, leaving out an empty comment and goal', () => {
    expect(toResourceRequest({ ...emptyResource('LINK'), title: 'C25K', url: ' https://example.com/plan ', pinned: true })).toEqual({
      type: 'LINK',
      title: 'C25K',
      url: 'https://example.com/plan',
      pinned: true,
    })
  })
})

describe('safeHref', () => {
  it('keeps http and https addresses', () => {
    expect(safeHref('https://example.com/a?b=1')).toBe('https://example.com/a?b=1')
    expect(safeHref('http://example.com')).toBe('http://example.com/')
  })

  it('refuses anything that could run script or isn’t an address', () => {
    expect(safeHref('javascript:alert(1)')).toBeNull()
    expect(safeHref('data:text/html,<b>x</b>')).toBeNull()
    expect(safeHref('not a url')).toBeNull()
    expect(safeHref(null)).toBeNull()
  })
})

describe('hostOf', () => {
  it('names the site without www', () => {
    expect(hostOf('https://www.example.com/plan')).toBe('example.com')
    expect(hostOf('nonsense')).toBe('nonsense')
  })
})

describe('backPath', () => {
  it('only follows paths inside the app', () => {
    expect(backPath('/goals/1', '/resources')).toBe('/goals/1')
    expect(backPath('//evil.example', '/resources')).toBe('/resources')
    expect(backPath('https://evil.example', '/resources')).toBe('/resources')
    expect(backPath(null, '/resources')).toBe('/resources')
  })
})
