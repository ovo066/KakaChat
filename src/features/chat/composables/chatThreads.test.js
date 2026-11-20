import { describe, expect, it } from 'vitest'
import {
  deleteChatThread,
  ensureChatThreadFields,
  listChatThreads,
  renameChatThread,
  startNewChatThread,
  switchChatThread
} from './chatThreads'

function createContact() {
  return {
    id: 'contact_1',
    name: '小雨',
    msgs: [
      { id: 'm1', role: 'user', content: '今天去看海吧', time: 1000 },
      { id: 'm2', role: 'assistant', content: '好呀', time: 2000 }
    ],
    memory: {
      core: [{ id: 'core_1', content: '喜欢海' }],
      lastSummaryMsgId: 'm2',
      lastAIMemoryMsgId: 'm1',
      contextSummary: { content: '看海计划' },
      lastVectorizedMsgId: 'm2',
      roundVectorsDirty: false
    }
  }
}

describe('chat threads', () => {
  it('archives the current conversation when starting a new one', () => {
    const contact = createContact()
    const { archived, thread } = startNewChatThread(contact, { title: '第二天' })

    expect(archived.msgs.map(m => m.id)).toEqual(['m1', 'm2'])
    expect(archived.memoryCursors).toEqual({
      lastSummaryMsgId: 'm2',
      lastAIMemoryMsgId: 'm1',
      contextSummary: { content: '看海计划' }
    })
    expect(contact.msgs).toEqual([])
    expect(contact.currentThread).toBe(thread)
    expect(thread.title).toBe('第二天')
    expect(contact.memory.core).toHaveLength(1)
    expect(contact.memory.lastSummaryMsgId).toBeNull()
    expect(contact.memory.contextSummary).toBeNull()
    expect(contact.memory.lastVectorizedMsgId).toBeNull()
    expect(contact.memory.roundVectorsDirty).toBe(true)
    expect(contact.msgCount).toBe(0)
  })

  it('does not archive an empty conversation', () => {
    const contact = { id: 'c', msgs: [] }
    const { archived } = startNewChatThread(contact, { title: '空白' })

    expect(archived).toBeNull()
    expect(contact.chatThreads).toEqual([])
    expect(contact.currentThread.title).toBe('空白')
  })

  it('swaps messages and memory cursors when switching threads', () => {
    const contact = createContact()
    const { archived } = startNewChatThread(contact)
    contact.msgs.push({ id: 'n1', role: 'user', content: '新的开始', time: 5000 })
    contact.memory.lastSummaryMsgId = 'n1'
    const newThreadId = contact.currentThread.id

    switchChatThread(contact, archived.id)

    expect(contact.currentThread.id).toBe(archived.id)
    expect(contact.msgs.map(m => m.id)).toEqual(['m1', 'm2'])
    expect(contact.memory.lastSummaryMsgId).toBe('m2')
    expect(contact.memory.contextSummary).toEqual({ content: '看海计划' })
    expect(contact.chatThreads.map(t => t.id)).toEqual([newThreadId])
    expect(contact.chatThreads[0].msgs.map(m => m.id)).toEqual(['n1'])
    expect(contact.chatThreads[0].memoryCursors.lastSummaryMsgId).toBe('n1')
    expect(contact.lastMsgId).toBe('m2')
  })

  it('drops an empty current conversation when switching away', () => {
    const contact = createContact()
    const { archived } = startNewChatThread(contact)

    switchChatThread(contact, archived.id)

    expect(contact.chatThreads).toEqual([])
    expect(contact.msgs).toHaveLength(2)
  })

  it('lists the current thread first and supports rename/delete', () => {
    const contact = createContact()
    ensureChatThreadFields(contact)
    const first = startNewChatThread(contact).archived
    contact.msgs.push({ id: 'n1', role: 'user', content: '在吗', time: 9000 })

    expect(renameChatThread(contact, first.id, '  看海  ')).toBe(true)
    const list = listChatThreads(contact)
    expect(list.map(item => item.isCurrent)).toEqual([true, false])
    expect(list[0]).toMatchObject({ fallbackTitle: '在吗', msgCount: 1 })
    expect(list[1]).toMatchObject({ title: '看海', msgCount: 2, preview: '好呀' })

    expect(deleteChatThread(contact, first.id)?.id).toBe(first.id)
    expect(listChatThreads(contact)).toHaveLength(1)
  })
})
