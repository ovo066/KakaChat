import { describe, expect, it } from 'vitest'
import {
  applyAssistantReactions,
  extractReactionTokens,
  formatReactionNote,
  getPartReactionsForDisplay,
  getUserReaction,
  normalizeReactionEmoji,
  resolveUserReactionPartKey,
  stripReactionTokens,
  toggleUserReaction
} from './messageReactions'
import { parseMessageContent } from './messageParser/contentParts'

describe('normalizeReactionEmoji', () => {
  it('maps tapback aliases to the classic emoji', () => {
    expect(normalizeReactionEmoji('heart')).toBe('❤️')
    expect(normalizeReactionEmoji('❤')).toBe('❤️')
    expect(normalizeReactionEmoji('哈哈')).toBe('😂')
    expect(normalizeReactionEmoji('!!')).toBe('‼️')
    expect(normalizeReactionEmoji('?')).toBe('❓')
  })

  it('accepts any emoji and rejects plain text', () => {
    expect(normalizeReactionEmoji('🥺')).toBe('🥺')
    expect(normalizeReactionEmoji('好的')).toBeNull()
  })
})

describe('reaction tokens', () => {
  it('extracts tokens with optional quote and cleans the text', () => {
    const result = extractReactionTokens('(react:❤️)\n好呀，那就这么定了')
    expect(result.cleanedContent).toBe('好呀，那就这么定了')
    expect(result.reactions).toEqual([{ emoji: '❤️', quote: '' }])

    const targeted = extractReactionTokens('（回应：👍：明天见）')
    expect(targeted.reactions).toEqual([{ emoji: '👍', quote: '明天见' }])
    expect(targeted.cleanedContent).toBe('')
  })

  it('leaves unrecognised tokens untouched', () => {
    expect(stripReactionTokens('我写了(回应:好的)')).toBe('我写了(回应:好的)')
    expect(extractReactionTokens('(react:abc)').reactions).toEqual([])
  })

  it('hides reaction tokens from parsed bubbles', () => {
    const parts = parseMessageContent('(react:😂)\n笑死我了', { allowNarration: true })
    expect(parts).toEqual([{ type: 'normal', content: '笑死我了', emotion: 'normal' }])
  })
})

describe('user reactions', () => {
  it('toggles and replaces the user reaction on a bubble', () => {
    const msg = { id: 'm1', role: 'assistant', content: 'hi' }
    expect(toggleUserReaction(msg, '0', '👍')).toBe('👍')
    expect(getUserReaction(msg, '0')).toBe('👍')
    expect(toggleUserReaction(msg, '0', '❤️')).toBe('❤️')
    expect(msg.reactions).toHaveLength(1)
    expect(toggleUserReaction(msg, '0', '❤')).toBeNull()
    expect(msg.reactions).toEqual([])
  })

  it('groups reactions for display', () => {
    const msg = {
      reactions: [
        { emoji: '❤️', part: '0', from: 'assistant', senderId: 'a', senderName: '小明', time: 1 },
        { emoji: '❤️', part: '0', from: 'user', time: 2 },
        { emoji: '😂', part: '1', from: 'user', time: 3 }
      ]
    }
    const display = getPartReactionsForDisplay(msg, '0')
    expect(display).toHaveLength(1)
    expect(display[0]).toMatchObject({ emoji: '❤️', tapback: 'heart', count: 2, mine: true, names: ['小明'] })
  })
})

describe('applyAssistantReactions', () => {
  it('attaches the reaction to the latest user bubble and strips the token', () => {
    const user = { id: 'u1', role: 'user', content: '在吗\n今天好累' }
    const reply = { id: 'a1', role: 'assistant', content: '(react:🥺)\n抱抱你' }
    const chat = { msgs: [user, reply] }
    const result = applyAssistantReactions({ activeChat: chat, message: reply, now: 10 })
    expect(result).toEqual({ appliedCount: 1, tokenCount: 1 })
    expect(reply.content).toBe('抱抱你')
    expect(user.reactions).toEqual([{ emoji: '🥺', part: '1', from: 'assistant', time: 10 }])
  })

  it('targets the bubble that contains the quoted text', () => {
    const user = { id: 'u1', role: 'user', content: '我考过了！\n晚上吃什么' }
    expect(resolveUserReactionPartKey(user, '考过了')).toBe('0')
    expect(resolveUserReactionPartKey({ role: 'user', isImage: true, content: '[图片]' }, '')).toBe('message')
  })

  it('describes reactions for the model', () => {
    expect(formatReactionNote({ role: 'assistant', reactions: [{ emoji: '❤️', part: '0', from: 'user' }] }))
      .toBe('（用户用 ❤️ 回应了这条消息）')
    expect(formatReactionNote({ role: 'user', reactions: [{ emoji: '👍', part: '0', from: 'assistant' }] }))
      .toBe('（你用 👍 回应了这条消息）')
    expect(formatReactionNote(
      { role: 'user', reactions: [{ emoji: '👍', part: '0', from: 'assistant', senderId: 'b', senderName: '小红' }] },
      { selfMemberId: 'a' }
    )).toBe('（小红用 👍 回应了这条消息）')
  })
})
