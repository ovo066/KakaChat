import { describe, expect, it, vi } from 'vitest'

vi.mock('../useSoundEffects', () => ({
  useSoundEffects: () => ({ playEvent: vi.fn() })
}))

import { markPendingUserMessagesAsRead } from './chatMessages'

describe('markPendingUserMessagesAsRead', () => {
  it('records read-only on the last pending user message only', () => {
    const chat = {
      msgs: [
        { id: 'u0', role: 'user', content: 'old', readStatus: 'read', readAt: 1 },
        { id: 'a0', role: 'assistant', content: 'hi' },
        { id: 'u1', role: 'user', content: 'a', readStatus: 'unread' },
        { id: 'u2', role: 'user', content: 'b', readStatus: 'unread' }
      ]
    }

    expect(markPendingUserMessagesAsRead(chat, 'read_only', { readOnlyReason: ' 在忙 ' })).toBe(2)
    expect(chat.msgs[0].readOnlyAt).toBeUndefined()
    expect(chat.msgs[2].readOnlyAt).toBeUndefined()
    expect(chat.msgs[2].readReason).toBe('read_only')
    expect(chat.msgs[3].readOnlyAt).toBeGreaterThan(0)
    expect(chat.msgs[3].readOnlyReason).toBe('在忙')
  })

  it('does not record read-only for normal replies', () => {
    const chat = { msgs: [{ id: 'u1', role: 'user', content: 'a', readStatus: 'unread' }] }

    markPendingUserMessagesAsRead(chat, 'assistant_reply')
    expect(chat.msgs[0].readOnlyAt).toBeUndefined()
  })
})
