import { describe, expect, it } from 'vitest'
import { useMessageParser } from './useMessageParser'

function createParser(messages, options = {}) {
  return useMessageParser({
    getMessages: () => messages,
    getStickerUrl: () => '',
    showTimestamps: () => false,
    allowAIStickers: () => true,
    allowAITransfer: () => true,
    allowAIGift: () => true,
    allowAIVoice: () => true,
    allowAICall: () => true,
    allowAIMockImage: () => true,
    allowAIMusicRecommend: () => true,
    allowAIMeet: () => true,
    showToolLog: () => !!options.showToolLog,
    showReasoning: () => !!options.showReasoning,
    timestampGapMs: 0,
    getAnimateMsgId: () => null,
    isGroupChat: () => !!options.isGroupChat,
    getGroupMembers: () => options.groupMembers || [],
    showChatAvatars: () => false,
    getContactAvatar: () => null,
    getUserAvatar: () => null,
    showNarrations: () => true,
    getMockImagePlaceholder: () => '',
    getActiveContactId: () => options.activeContactId || '',
    getContactName: () => options.contactName || ''
  })
}

describe('useMessageParser', () => {
  it('binds direct assistant voice blocks to the active chat contact', () => {
    const { blocks } = createParser([
      {
        id: 'msg-1',
        role: 'assistant',
        content: '(voice:当前聊天角色语音)'
      }
    ], {
      activeContactId: 'contact-direct-1'
    })

    expect(blocks.value).toMatchObject([
      {
        type: 'voice',
        msgId: 'msg-1',
        contactId: 'contact-direct-1',
        text: '当前聊天角色语音'
      }
    ])
  })

  it('preserves contactId on parsed voice blocks', () => {
    const { blocks } = createParser([
      {
        id: 'msg-1',
        role: 'assistant',
        contactId: 'contact-1',
        content: '(voice:收藏里的语音)'
      }
    ])

    expect(blocks.value).toMatchObject([
      {
        type: 'voice',
        msgId: 'msg-1',
        contactId: 'contact-1',
        text: '收藏里的语音'
      }
    ])
  })

  it('binds group assistant voice blocks to the sender contact', () => {
    const { blocks } = createParser([
      {
        id: 'msg-1',
        role: 'assistant',
        senderId: 'member-1',
        content: '(voice:群聊角色语音)'
      }
    ], {
      isGroupChat: true,
      groupMembers: [
        { id: 'member-1', contactId: 'contact-role-1', name: '角色一' }
      ]
    })

    expect(blocks.value).toMatchObject([
      {
        type: 'voice',
        msgId: 'msg-1',
        contactId: 'contact-role-1',
        text: '群聊角色语音'
      }
    ])
  })

  it('prefers sourceMsgId for block msgId when rendering preview messages', () => {
    const { blocks } = createParser([
      {
        id: 'preview-msg-1',
        sourceMsgId: 'source-msg-1',
        role: 'assistant',
        content: '预览气泡'
      }
    ])

    expect(blocks.value).toMatchObject([
      {
        type: 'bubble',
        msgId: 'source-msg-1',
        text: '预览气泡'
      }
    ])
  })

  it('prefers sourceMsgId when preview messages use synthetic ids', () => {
    const { blocks } = createParser([
      {
        id: 'preview-msg-1',
        sourceMsgId: 'msg-1',
        role: 'assistant',
        content: '预览消息'
      }
    ])

    expect(blocks.value).toMatchObject([
      {
        type: 'bubble',
        msgId: 'msg-1',
        text: '预览消息'
      }
    ])
  })

  it('normalizes and truncates long reply preview text', () => {
    const longReply = `第一行\n第二行 ${'很长的引用'.repeat(40)}`
    const { blocks } = createParser([
      {
        id: 'msg-1',
        role: 'assistant',
        content: '收到',
        replyToText: longReply
      }
    ])

    expect(blocks.value).toHaveLength(1)
    expect(blocks.value[0].replyText).toContain('第一行 第二行')
    expect(blocks.value[0].replyText).not.toContain('\n')
    expect(blocks.value[0].replyText.endsWith('…')).toBe(true)
    expect(blocks.value[0].replyText.length).toBeLessThanOrEqual(141)
  })

  it('does not render empty assistant placeholders as chat bubbles', () => {
    const { blocks } = createParser([
      {
        id: 'msg-1',
        role: 'assistant',
        content: ''
      }
    ])

    expect(blocks.value).toEqual([])
  })

  it('targets the quoted bubble within a multi-bubble assistant reply', () => {
    const { blocks } = createParser([
      { id: 'original', role: 'assistant', content: '第一句\n指定气泡\n最后一句' },
      { id: 'reply', role: 'assistant', content: '[quote:指定气泡] 收到' }
    ])

    expect(blocks.value.at(-1)).toMatchObject({
      replyToMsgId: 'original', replyToPartKey: '1', replyText: '指定气泡'
    })
  })

  it('resolves persisted reply text against the full bubble before truncating the preview', () => {
    const quotedText = `${'相同前缀'.repeat(40)}指定气泡`
    const { blocks } = createParser([
      { id: 'original', role: 'assistant', content: `${'相同前缀'.repeat(40)}另一气泡\n${quotedText}` },
      { id: 'reply', role: 'user', content: '收到', replyTo: 'original', replyToText: quotedText }
    ])

    expect(blocks.value.at(-1)).toMatchObject({ replyToMsgId: 'original', replyToPartKey: '1' })
    expect(blocks.value.at(-1).replyText.endsWith('…')).toBe(true)
  })

  it('prefers an exact bubble over an earlier bubble containing the same text', () => {
    const { blocks } = createParser([
      { id: 'original', role: 'assistant', content: '指定气泡还有其他内容\n指定气泡' },
      { id: 'reply', role: 'user', content: '收到', replyTo: 'original', replyToText: '指定气泡' }
    ])

    expect(blocks.value.at(-1).replyToPartKey).toBe('1')
  })

  it('keeps original part indexes across media and quoted bubbles with numeric message ids', () => {
    const { blocks } = createParser([
      { id: 42, role: 'assistant', content: '(voice:语音内容)\n[quote:前文] 指定气泡' },
      { id: 'reply', role: 'user', content: '收到', replyTo: '42', replyToText: '[quote:前文] 指定气泡' }
    ])

    expect(blocks.value.at(-1)).toMatchObject({ replyToMsgId: '42', replyToPartKey: '1' })
  })

  it('uses source message ids and matches quoted fragments in display content', () => {
    const { blocks } = createParser([
      { id: 'preview', sourceMsgId: 'original', role: 'assistant', content: '原始内容', displayContent: '第一句\n这里是指定气泡的内容' },
      { id: 'reply', role: 'assistant', content: '[引用:指定气泡] 收到' }
    ])

    expect(blocks.value.at(-1)).toMatchObject({ replyToMsgId: 'original', replyToPartKey: '1' })
  })

  it('preserves message-level fallback when the quoted bubble is no longer present', () => {
    const { blocks } = createParser([
      { id: 'original', role: 'assistant', content: '编辑后的内容' },
      { id: 'reply', role: 'user', content: '收到', replyTo: 'original', replyToText: '编辑前的内容' }
    ])

    expect(blocks.value.at(-1)).toMatchObject({ replyToMsgId: 'original', replyToPartKey: '' })
  })

  it('renders tool log cards before the assistant bubble when enabled', () => {
    const { blocks } = createParser([
      {
        id: 'msg-1',
        role: 'assistant',
        content: '已经帮你处理好了',
        toolLogs: [
          {
            source: 'mcp',
            sourceLabel: 'MCP',
            success: true,
            displayName: 'create_page',
            subtitle: 'Notion · create_page',
            summary: '已返回 pageId',
            argsPreview: '{\n  "title": "周计划"\n}',
            resultPreview: '{\n  "pageId": "page_1"\n}',
            durationLabel: '32 ms',
            round: 1
          }
        ]
      }
    ], {
      showToolLog: true
    })

    expect(blocks.value).toHaveLength(2)
    expect(blocks.value[0]).toMatchObject({
      type: 'toolLog',
      msgId: 'msg-1',
      title: 'create_page',
      summary: '已返回 pageId',
      durationLabel: '32 ms'
    })
    expect(blocks.value[1]).toMatchObject({
      type: 'bubble',
      msgId: 'msg-1',
      text: '已经帮你处理好了'
    })
  })

  it('hides tool log cards when the setting is disabled', () => {
    const { blocks } = createParser([
      {
        id: 'msg-1',
        role: 'assistant',
        content: '只显示正文',
        toolLogs: [
          {
            source: 'internal',
            sourceLabel: '内置工具',
            success: true,
            displayName: '创建日程事件',
            summary: '已返回 eventId',
            round: 1
          }
        ]
      }
    ])

    expect(blocks.value).toHaveLength(1)
    expect(blocks.value[0]).toMatchObject({
      type: 'bubble',
      text: '只显示正文'
    })
  })

  it('renders reasoning before tool calls and keeps it hidden by default', () => {
    const messages = [
      {
        id: 'msg-reasoning-1',
        role: 'assistant',
        content: '已经查询完成',
        reasoningLogs: [
          { content: '用户想测试联网搜索，我需要先选择搜索工具。', round: 1 }
        ],
        reasoningStreaming: true,
        reasoningStreamingRound: 1,
        toolLogs: [
          { displayName: 'WebSearch', success: true, round: 1 }
        ]
      }
    ]

    const hiddenParser = createParser(messages, { showToolLog: true })
    expect(hiddenParser.blocks.value.map(block => block.type)).toEqual(['toolLog', 'bubble'])

    const visibleParser = createParser(messages, { showToolLog: true, showReasoning: true })
    expect(visibleParser.blocks.value.map(block => block.type)).toEqual(['reasoning', 'toolLog', 'bubble'])
    expect(visibleParser.blocks.value[0]).toMatchObject({
      content: '用户想测试联网搜索，我需要先选择搜索工具。',
      round: 1,
      streaming: true
    })
  })

  it('marks only the active reasoning round as streaming', () => {
    const { blocks } = createParser([
      {
        id: 'msg-reasoning-stream',
        role: 'assistant',
        content: '',
        reasoningLogs: [
          { content: '第一轮思考', round: 1 },
          { content: '第二轮思考中', round: 2 }
        ],
        reasoningStreaming: true,
        reasoningStreamingRound: 2
      }
    ], { showReasoning: true })

    expect(blocks.value.map(block => block.streaming)).toEqual([false, true])
  })

  it('prefers persisted gift snapshots over live catalog lookup when rendering gift cards', () => {
    const { blocks } = createParser([
      {
        id: 'msg-gift-1',
        role: 'user',
        content: '(gift:玫瑰:送给你)',
        giftPartSnapshots: {
          0: {
            id: 'gift_custom_1',
            name: '演唱会门票',
            description: '去年一起看的那场',
            price: 520,
            image: 'data:image/png;base64,abc'
          }
        }
      }
    ])

    expect(blocks.value).toHaveLength(1)
    expect(blocks.value[0]).toMatchObject({
      type: 'gift',
      item: '演唱会门票',
      description: '去年一起看的那场',
      price: 520,
      imageUrl: 'data:image/png;base64,abc',
      message: '送给你'
    })
  })

  it('renders recall tokens as notices and keeps the tail on the last real bubble', () => {
    const { blocks } = createParser([
      {
        id: 'msg-recall',
        role: 'assistant',
        content: '在吗\n(recall:其实我想你了)'
      }
    ], {
      contactName: '小雨'
    })

    expect(blocks.value).toMatchObject([
      { type: 'bubble', text: '在吗', bubbleClass: 'bubble-ai has-tail' },
      { type: 'recall', msgId: 'msg-recall', partIndex: 1, recallerName: '小雨', text: '其实我想你了', isUser: false }
    ])
  })
  describe('iMessage bubble tails', () => {
    const base = 1_700_000_000_000
    const tailsOf = (blocks) => blocks
      .filter(block => block.type === 'bubble')
      .map(block => [block.text, block.bubbleClass.includes('has-tail')])

    it('only tails the last bubble of a quick same-sender run', () => {
      const { blocks } = createParser([
        { id: 'u1', role: 'user', content: '在吗', time: base },
        { id: 'u2', role: 'user', content: '有事问你', time: base + 5_000 }
      ])
      expect(tailsOf(blocks.value)).toEqual([['在吗', false], ['有事问你', true]])
      expect(blocks.value[0].metaText).toBe('')
    })

    it('starts a new run after a long gap so the earlier bubble keeps its tail', () => {
      const { blocks } = createParser([
        { id: 'u1', role: 'user', content: '早', time: base },
        { id: 'u2', role: 'user', content: '人呢', time: base + 10 * 60_000 }
      ])
      expect(tailsOf(blocks.value)).toEqual([['早', true], ['人呢', true]])
    })

    it('keeps the tail and read mark on a message that was read but not answered', () => {
      const { blocks } = createParser([
        { id: 'u1', role: 'user', content: '睡了吗', time: base, readStatus: 'read', readAt: base + 20_000 },
        { id: 'u2', role: 'user', content: '？', time: base + 60_000, readStatus: 'unread' }
      ])
      expect(tailsOf(blocks.value)).toEqual([['睡了吗', true], ['？', true]])
      expect(blocks.value[0].metaText).toMatch(/已读$/)
      expect(blocks.value[1].metaText).toMatch(/未读$/)
    })

    it('tails a bubble that is followed by a card from the same sender', () => {
      const { blocks } = createParser([
        { id: 'a1', role: 'assistant', content: '给你听这首' + String.fromCharCode(10) + '(music:晴天:周杰伦)', time: base }
      ])
      expect(blocks.value.map(block => block.type)).toEqual(['bubble', 'music'])
      expect(blocks.value[0].bubbleClass).toBe('bubble-ai has-tail')
    })
  })

  it('merges photos sent together into one album block', () => {
    const base = 1_700_000_000_000
    const photo = (id, offset) => ({ id, role: 'user', content: '[图片]', isImage: true, imageUrl: `data:image/png;base64,${id}`, time: base + offset })
    const { blocks } = createParser([
      photo('p1', 0),
      photo('p2', 0),
      photo('p3', 1),
      photo('p4', 60_000)
    ])
    expect(blocks.value.map(block => block.type)).toEqual(['imageGroup', 'image'])
    expect(blocks.value[0].images.map(item => item.msgId)).toEqual(['p1', 'p2', 'p3'])
  })
})
