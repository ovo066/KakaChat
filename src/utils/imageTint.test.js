import { describe, expect, it } from 'vitest'
import { pickTintFromPixels } from './imageTint'

function pixels(list) {
  return new Uint8ClampedArray(list.flatMap(([r, g, b, a = 255]) => [r, g, b, a]))
}

describe('pickTintFromPixels', () => {
  it('picks the dominant hue instead of blending distinct colors', () => {
    const blue = Array.from({ length: 6 }, () => [40, 120, 230])
    const orange = Array.from({ length: 3 }, () => [230, 110, 60])
    const tint = pickTintFromPixels(pixels([...blue, ...orange]))
    const hue = Number(/hsl\((\d+)/.exec(tint)[1])
    expect(hue).toBeGreaterThan(200)
    expect(hue).toBeLessThan(230)
  })

  it('keeps lightness readable under white text and ignores transparent pixels', () => {
    const tint = pickTintFromPixels(pixels([[250, 240, 120], [0, 0, 0, 0]]))
    expect(Number(/(\d+)%\)$/.exec(tint)[1])).toBeLessThanOrEqual(46)
    expect(pickTintFromPixels(pixels([[0, 0, 0, 0]]))).toBe('')
  })
})
