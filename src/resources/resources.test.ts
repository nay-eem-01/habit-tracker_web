import { describe, expect, it } from 'vitest'
import { backPath, emptyResource, fileProblem, formatBytes, hostOf, safeHref, titleFromFileName, toResourceRequest } from './resources'

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

describe('files', () => {
  const file = (name: string, size: number) => new File([new Uint8Array(size)], name)

  it('sends a file edit as a FILE with no url', () => {
    expect(toResourceRequest({ ...emptyResource('FILE'), title: 'Plan', url: 'https://ignored' })).toEqual({
      type: 'FILE',
      title: 'Plan',
      pinned: false,
    })
  })

  it('catches what the server would refuse, before uploading', () => {
    expect(fileProblem(file('plan.pdf', 10))).toBeNull()
    expect(fileProblem(file('photo.JPG', 10))).toBeNull()
    expect(fileProblem(file('setup.exe', 10))).toMatch(/PNG, JPEG/)
    expect(fileProblem(file('page.svg', 10))).toMatch(/PNG, JPEG/)
    expect(fileProblem(file('README', 10))).toMatch(/PNG, JPEG/)
    expect(fileProblem(file('empty.txt', 0))).toBe('That file is empty.')
    expect(fileProblem(file('big.png', 10 * 1024 * 1024 + 1))).toBe('That file is 10.0 MB; the limit is 10 MB.')
  })

  it('sizes bytes for people', () => {
    expect(formatBytes(820)).toBe('820 B')
    expect(formatBytes(48_213)).toBe('47 KB')
    expect(formatBytes(2_500_000)).toBe('2.4 MB')
  })

  it('suggests a title from the file name', () => {
    expect(titleFromFileName('Week 1 plan.pdf')).toBe('Week 1 plan')
    expect(titleFromFileName('.env')).toBe('.env')
  })
})
