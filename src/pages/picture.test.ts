import { describe, expect, it } from 'vitest'
import { squareCrop } from './picture'

describe('squareCrop', () => {
  it('cuts the centre square of a wide or tall picture', () => {
    expect(squareCrop(4000, 3000)).toEqual({ x: 500, y: 0, side: 3000 })
    expect(squareCrop(1080, 1920)).toEqual({ x: 0, y: 420, side: 1080 })
    expect(squareCrop(300, 300)).toEqual({ x: 0, y: 0, side: 300 })
  })
})
