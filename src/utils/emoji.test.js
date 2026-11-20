import { describe, expect, it } from 'vitest'
import { getEmojiAnimationKind, getJumboEmojiGlyphs, isEmojiGrapheme } from './emoji'

describe('getJumboEmojiGlyphs', () => {
  it('treats 1~3 emoji-only messages as jumbo', () => {
    expect(getJumboEmojiGlyphs('😂')).toEqual(['😂'])
    expect(getJumboEmojiGlyphs('😂 😂')).toEqual(['😂', '😂'])
    expect(getJumboEmojiGlyphs('❤️🔥👍')).toEqual(['❤️', '🔥', '👍'])
  })

  it('keeps ZWJ sequences, skin tones and flags as single emoji', () => {
    expect(getJumboEmojiGlyphs('👨‍👩‍👧')).toHaveLength(1)
    expect(getJumboEmojiGlyphs('👍🏽')).toHaveLength(1)
    expect(getJumboEmojiGlyphs('🇨🇳')).toHaveLength(1)
  })

  it('rejects text, long emoji runs and text-style symbols', () => {
    expect(getJumboEmojiGlyphs('好的😂')).toEqual([])
    expect(getJumboEmojiGlyphs('😂😂😂😂')).toEqual([])
    expect(getJumboEmojiGlyphs('©')).toEqual([])
    expect(getJumboEmojiGlyphs('123')).toEqual([])
    expect(getJumboEmojiGlyphs('')).toEqual([])
  })

  it('accepts common emoji that AI often sends without FE0F', () => {
    expect(isEmojiGrapheme('❤')).toBe(true)
    expect(getJumboEmojiGlyphs('❤')).toEqual(['❤'])
  })
})

describe('getEmojiAnimationKind', () => {
  it('maps emoji to a matching animation', () => {
    expect(getEmojiAnimationKind(['❤️'])).toBe('beat')
    expect(getEmojiAnimationKind(['😂'])).toBe('laugh')
    expect(getEmojiAnimationKind(['👋🏻'])).toBe('wave')
    expect(getEmojiAnimationKind(['🥔'])).toBe('jelly')
  })
})
