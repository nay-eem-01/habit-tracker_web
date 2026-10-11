import { describe, expect, it } from 'vitest'
import { keyBytes } from './push'

describe('keyBytes', () => {
  it('reads base64url without padding, as the server sends the VAPID key', () => {
    // "-_8" is base64url for 0xFB 0xFF; the standard alphabet would be "+/8="
    expect(Array.from(keyBytes('-_8'))).toEqual([0xfb, 0xff])
    expect(Array.from(keyBytes('AQID'))).toEqual([1, 2, 3])
  })
})
