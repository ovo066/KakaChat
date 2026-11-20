import { resolveMockImagePlaceholder } from '../mockImage'
import { extractQuoteFromText } from '../../../../utils/messageQuote'
import { favoritePartIndexToKey, isMessagePartFavorited } from '../../../../utils/messageFavorites'
import { resolveMessageImageUrl } from '../../../../utils/mediaUrl'
import { normalizeSearchText } from '../../../../utils/searchText'
import {
  formatGiftToken,
  formatMeetToken,
  formatMockImageToken,
  formatMusicToken,
  formatStickerToken,
  formatTransferToken,
  formatVoiceToken
} from './contentParts'
import { formatTailMetaText, formatTimestampDisplay, isSameDay, normalizeReplyPreviewText } from './display'
import { getCachedParsedParts, isMessageEndingWithCallPart } from './parseCache'
import { getInteractionState } from '../interactiveMessages'
import { getPartReactionsForDisplay } from '../messageReactions'
import { getEmojiAnimationKind, getJumboEmojiGlyphs } from '../../../../utils/emoji'

const TOOL_LOG_TEXT_MAX_CHARS = 320
const REASONING_SUMMARY_MAX_CHARS = 72
const SMART_UI_STREAMING_WINDOW_MS = 5 * 60 * 1000
// 同一个人两条消息间隔超过这个时长就另起一段（重新出现尾巴/头像/时间）
const RUN_BREAK_GAP_MS = 3 * 60 * 1000

function truncateToolLogText(value, maxChars = TOOL_LOG_TEXT_MAX_CHARS) {
  const text = String(value || '').trim()
  if (!text) return ''
  if (text.length <= maxChars) return text
  return `${text.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`
}

function buildToolLogBlocks(message, blockMsgId, logEntries = []) {
  if (!Array.isArray(logEntries) || logEntries.length === 0) return []

  return logEntries.map((entry, index) => ({
    type: 'toolLog',
    key: `tool-log-${message.id}-${index}`,
    msgId: blockMsgId,
    source: String(entry?.source || '').trim() || 'internal',
    sourceLabel: truncateToolLogText(entry?.sourceLabel || '内置工具', 18),
    success: entry?.success !== false,
    title: truncateToolLogText(entry?.displayName || entry?.toolName || '工具调用', 80),
    subtitle: truncateToolLogText(entry?.subtitle || '', 120),
    summary: truncateToolLogText(entry?.summary || '', 160),
    argsPreview: truncateToolLogText(entry?.argsPreview || ''),
    resultPreview: truncateToolLogText(entry?.resultPreview || ''),
    errorText: truncateToolLogText(entry?.errorText || '', 160),
    durationLabel: truncateToolLogText(entry?.durationLabel || '', 24),
    round: Math.max(1, Number(entry?.round || 1) || 1),
    indexInRound: Math.max(0, Number(entry?.indexInRound ?? index) || 0)
  }))
}

function buildReasoningBlocks(message, blockMsgId) {
  const rawLogs = Array.isArray(message?.reasoningLogs) && message.reasoningLogs.length > 0
    ? message.reasoningLogs
    : (String(message?.reasoningContent || '').trim()
        ? [{ content: message.reasoningContent, round: 1 }]
        : [])

  return rawLogs.map((entry, index) => {
    const content = String(entry?.content || '').trim()
    if (!content) return null
    const compactSummary = content.replace(/\s+/g, ' ').trim()
    return {
      type: 'reasoning',
      key: `reasoning-${message.id}-${index}`,
      msgId: blockMsgId,
      content,
      summary: truncateToolLogText(compactSummary, REASONING_SUMMARY_MAX_CHARS),
      round: Math.max(1, Number(entry?.round || 1) || 1),
      indexInRound: index,
      streaming: message?.reasoningStreaming === true && Number(message?.reasoningStreamingRound || 1) === Math.max(1, Number(entry?.round || 1) || 1)
    }
  }).filter(Boolean)
}

function buildAgentTraceBlocks(message, blockMsgId, options = {}) {
  const traceBlocks = []
  if (options.showReasoning) {
    traceBlocks.push(...buildReasoningBlocks(message, blockMsgId))
  }
  if (options.showToolLog && Array.isArray(message?.toolLogs) && message.toolLogs.length > 0) {
    traceBlocks.push(...buildToolLogBlocks(message, blockMsgId, message.toolLogs))
  }

  return traceBlocks.sort((left, right) => {
    if (left.round !== right.round) return left.round - right.round
    if (left.type !== right.type) return left.type === 'reasoning' ? -1 : 1
    return left.indexInRound - right.indexInRound
  })
}

function normalizeGiftSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return null

  const name = String(snapshot.name || snapshot.item || '').trim()
  if (!name) return null

  const rawPrice = snapshot.price
  const numericPrice = rawPrice === null || rawPrice === undefined || rawPrice === ''
    ? null
    : Number(rawPrice)

  return {
    id: String(snapshot.id || '').trim(),
    name,
    description: String(snapshot.description || ''),
    price: Number.isFinite(numericPrice) && numericPrice >= 0 ? numericPrice : null,
    image: String(snapshot.image || '').trim()
  }
}

function resolveGiftDisplayData(message, part, partIndex) {
  const snapshot = normalizeGiftSnapshot(
    message?.giftPartSnapshots?.[String(partIndex)] ?? message?.giftPartSnapshots?.[partIndex]
  )
  if (!snapshot) {
    return {
      item: part.item,
      imageUrl: part.imageUrl,
      price: part.price,
      description: part.description
    }
  }

  return {
    item: snapshot.name || part.item,
    imageUrl: snapshot.image || part.imageUrl,
    price: snapshot.price,
    description: snapshot.description || null
  }
}

export function buildMessageBlocks(options) {
  const {
    getMessages,
    getStickerUrl,
    showTimestamps,
    allowAIStickers,
    allowAITransfer,
    allowAIGift,
    allowAIVoice,
    allowAICall,
    allowAIMockImage,
    allowAIMusicRecommend,
    allowAIMeet,
    allowAIRecall,
    allowAIFile,
    showToolLog,
    showReasoning,
    timestampGapMs,
    getAnimateMsgId,
    isGroupChat,
    getGroupMembers,
    showChatAvatars,
    getContactAvatar,
    getUserAvatar,
    showNarrations,
    getMockImagePlaceholder,
    getActiveContactId,
    getContactName
  } = options

  const allMsgs = getMessages() || []
  if (allMsgs.length === 0) return []
  const msgs = allMsgs.filter(m => m && !m.hideInChat && !m.hidden)
  if (msgs.length === 0) return []

    const idMap = new Map()
    for (const m of allMsgs) {
      if (!m) continue
      if (m.displayContent != null) {
        idMap.set(String(m.id), { ...m, content: m.displayContent })
      } else {
        idMap.set(String(m.id), m)
      }
    }

    const groupChat = isGroupChat ? isGroupChat() : false
    const members = groupChat && getGroupMembers ? getGroupMembers() : []
    const memberMap = new Map()
    const memberNameMap = new Map()
    for (const m of members) {
      memberMap.set(m.id, m)
      const memberName = String(m?.name || '').trim()
      if (memberName && !memberNameMap.has(memberName)) {
        memberNameMap.set(memberName, m)
      }
    }

    const shouldShowChatAvatars = showChatAvatars ? showChatAvatars() : false
    const forceShowAvatar = shouldShowChatAvatars || groupChat
    const activeContactId = getActiveContactId ? String(getActiveContactId() || '').trim() : ''
    const contactAvatarInfo = getContactAvatar ? getContactAvatar() : null
    const userAvatarInfo = getUserAvatar ? getUserAvatar() : null
    const timestampEnabled = showTimestamps ? showTimestamps() : false
    const aiStickersEnabled = allowAIStickers ? allowAIStickers() : true
    const aiTransferEnabled = allowAITransfer ? allowAITransfer() : true
    const aiGiftEnabled = allowAIGift ? allowAIGift() : true
    const aiVoiceEnabled = allowAIVoice ? allowAIVoice() : true
    const aiCallEnabled = allowAICall ? allowAICall() : true
    const aiMockImageEnabled = allowAIMockImage ? allowAIMockImage() : true
    const aiMusicEnabled = allowAIMusicRecommend ? allowAIMusicRecommend() : false
    const aiMeetEnabled = allowAIMeet ? allowAIMeet() : false
    const aiRecallEnabled = allowAIRecall ? allowAIRecall() : true
    const aiFileEnabled = allowAIFile ? allowAIFile() : false
    const contactName = getContactName ? String(getContactName() || '').trim() : ''
    const toolLogEnabled = showToolLog ? showToolLog() : false
    const reasoningEnabled = showReasoning ? showReasoning() : false
    const shouldShowNarrations = showNarrations ? showNarrations() : true
    const createFavoriteState = (message, partIndex = null) => {
      const msgPartKey = favoritePartIndexToKey(partIndex)
      return {
        favorited: isMessagePartFavorited(message, partIndex),
        msgPartKey,
        reactions: getPartReactionsForDisplay(message, msgPartKey)
      }
    }
    // 引用的原消息是谁发的：iMessage 里引用自己消息时，缩略气泡的文字用自己的气泡色
    const findQuotedMessage = (quote, beforeIndex) => {
      const target = String(quote || '').trim()
      if (!target) return null
      for (let idx = beforeIndex - 1; idx >= 0; idx -= 1) {
        const candidate = msgs[idx]
        const text = candidate?.displayContent != null ? candidate.displayContent : candidate?.content
        if (typeof text === 'string' && text.includes(target)) return candidate
      }
      return null
    }

    const result = []
    const findQuotedPartKey = (message, quote) => {
      const target = normalizeSearchText(extractQuoteFromText(String(quote ?? '')).cleanText)
      if (!target) return ''
      const msgId = String(message.sourceMsgId ?? message.id ?? '')
      const candidates = result
        .filter(block => block.msgId === msgId && block.msgPartKey)
        .map(block => ({
          partKey: block.msgPartKey,
          text: normalizeSearchText(extractQuoteFromText(String(block.contextContent ?? block.text ?? '')).cleanText)
        }))
      // 先匹配完整气泡，再匹配引用片段；不能用截断后的预览文字定位。
      return (candidates.find(block => block.text === target)
        || candidates.find(block => block.text.includes(target)))?.partKey || ''
    }

    // iMessage 式分段：同一发送者的连续消息才算一段；隔了很久、或上一条已被读过（已读不回）
    // 都另起一段，上一段的最后一个气泡保留小尾巴和已读/时间标记
    const continuesRun = (a, b) => {
      if (a.role !== b.role) return false
      if (groupChat && a.senderId !== b.senderId) return false
      const aTime = Number(a.time || 0)
      const bTime = Number(b.time || 0)
      if (aTime > 0 && bTime > 0) {
        const gap = bTime - aTime
        if (gap >= RUN_BREAK_GAP_MS || !isSameDay(aTime, bTime)) return false
        if (timestampEnabled && gap >= timestampGapMs) return false
        const readAt = Number(a.readAt || 0)
        if (a.role === 'user' && readAt > 0 && readAt <= bTime) return false
      }
      return true
    }

    for (let i = 0; i < msgs.length; i++) {
      const m = msgs[i]
      const blockMsgId = String(m?.sourceMsgId ?? m?.id ?? '').trim() || String(m?.id ?? '').trim()
      const next = msgs[i + 1]
      const prev = msgs[i - 1]
      const isUser = m.role === 'user'

      const nextIsSame = !!next && continuesRun(m, next)
      const prevIsSame = !!prev && continuesRun(prev, m)
      const isLastInGroup = !nextIsSame
      const isFirstInGroup = !prevIsSame

      let senderName = null
      let senderAvatar = null
      let senderAvatarType = 'emoji'
      if (groupChat && !isUser && m.senderId) {
        let member = memberMap.get(m.senderId)
        if (!member && m.senderName) {
          member = memberNameMap.get(m.senderName)
        }
        if (member) {
          senderName = member.name
          senderAvatar = member.avatar
          senderAvatarType = member.avatarType || 'emoji'
        } else if (m.senderName) {
          senderName = m.senderName
          senderAvatar = '🤖'
        }
      } else if (groupChat && !isUser && m.senderName) {
        const member = memberNameMap.get(m.senderName)
        if (member) {
          senderName = member.name
          senderAvatar = member.avatar
          senderAvatarType = member.avatarType || 'emoji'
        } else {
          senderName = m.senderName
          senderAvatar = '🤖'
        }
      } else if (groupChat && isUser && userAvatarInfo) {
        senderAvatar = userAvatarInfo.avatar
        senderAvatarType = userAvatarInfo.avatarType || 'emoji'
      } else if (!groupChat && !isUser && contactAvatarInfo) {
        senderAvatar = contactAvatarInfo.avatar
        senderAvatarType = contactAvatarInfo.avatarType || 'emoji'
      } else if (!groupChat && isUser && userAvatarInfo) {
        senderAvatar = userAvatarInfo.avatar
        senderAvatarType = userAvatarInfo.avatarType || 'emoji'
      }

      const prevTime = prev && prev.time ? prev.time : null
      const currTime = m.time || null
      const shouldShowTimestamp = !!(
        timestampEnabled && currTime && (
          !prevTime || !isSameDay(prevTime, currTime) || (currTime - prevTime) >= timestampGapMs
        )
      )
      const isPenultimateMsg = i === msgs.length - 2
      const suppressTailMeta = isPenultimateMsg && isMessageEndingWithCallPart(
        next,
        next?.role === 'user' || aiCallEnabled
      )
      const tailMetaText = (isLastInGroup && !suppressTailMeta) ? formatTailMetaText(m, isUser) : ''

      if (shouldShowTimestamp) {
        result.push({
          type: 'timestamp',
          key: 'ts-' + m.id,
          text: formatTimestampDisplay(currTime, prevTime)
        })
      }

      const animateMsgId = getAnimateMsgId ? getAnimateMsgId() : null
      const anim = !!(animateMsgId && animateMsgId === m.id)
      const bubbleAnimClass = anim ? 'bubble-appear' : ''
      const narrationAnimClass = anim ? 'narration-appear' : ''
      const resolvedAssistantVoiceContactId = (() => {
        const explicitContactId = typeof m.contactId === 'string' ? m.contactId.trim() : ''
        if (explicitContactId) return explicitContactId
        if (isUser) return ''
        if (!groupChat) return activeContactId
        const senderId = String(m.senderId || '').trim()
        if (senderId) {
          const member = memberMap.get(senderId)
          const contactId = String(member?.contactId || '').trim()
          if (contactId) return contactId
        }
        const senderNameValue = String(m.senderName || '').trim()
        if (senderNameValue) {
          const member = memberNameMap.get(senderNameValue)
          const contactId = String(member?.contactId || '').trim()
          if (contactId) return contactId
        }
        return ''
      })()

      // Offline card
      if (m && m.type === 'offlineCard') {
        result.push({
          type: 'offlineCard',
          key: 'offline-card-' + m.id,
          msgId: blockMsgId,
          sessionId: m.sessionId,
          summary: m.offlineSummary || '线下剧情',
          startTime: m.offlineStartTime,
          endTime: m.offlineEndTime,
          mb: 'mb-2'
        })
        continue
      }

      if (m && m.isCallRecord) {
        result.push({
          type: 'callRecord',
          key: 'call-rec-' + m.id,
          msgId: blockMsgId,
          isUser,
          mb: isLastInGroup ? 'mb-2' : 'mb-[2px]',
          callMode: m.callMode || 'voice',
          callDuration: m.callDuration || 0,
          callTranscript: m.callTranscript || [],
          time: m.time,
          meta: m.meta || {},
          animClass: bubbleAnimClass,
          contextContent: '[通话记录]',
          isGroupChat: groupChat,
          senderName: isFirstInGroup ? senderName : null,
          senderAvatar,
          senderAvatarType,
          showAvatar: forceShowAvatar || (isLastInGroup && (groupChat || shouldShowChatAvatars)),
          metaText: tailMetaText,
          ...createFavoriteState(m, null)
        })
        continue
      }

      if (m && m.isFile) {
        result.push({
          type: 'file',
          key: 'file-' + m.id,
          msgId: blockMsgId,
          isUser,
          mb: isLastInGroup ? 'mb-2' : 'mb-[2px]',
          fileName: m.fileName || '文件',
          fileText: String(m.fileText ?? ''),
          fileSize: m.fileSize,
          fileMime: m.fileExtracted ? 'text/plain' : (m.fileMime || ''),
          fileExtracted: m.fileExtracted || '',
          generating: false,
          animClass: bubbleAnimClass,
          contextContent: '[文件] ' + (m.fileName || ''),
          isGroupChat: groupChat,
          senderName: isFirstInGroup ? senderName : null,
          senderAvatar,
          senderAvatarType,
          showAvatar: forceShowAvatar || (isLastInGroup && (groupChat || shouldShowChatAvatars)),
          metaText: tailMetaText,
          ...createFavoriteState(m, null)
        })
        continue
      }

      if (m && m.isMockImage) {
        const mockText = String(m.mockImageText || m.content || '').trim()
        const placeholder = resolveMockImagePlaceholder(
          m.mockImagePlaceholder || (getMockImagePlaceholder ? getMockImagePlaceholder() : '')
        )
        result.push({
          type: 'mockImage',
          key: 'mock-' + m.id,
          msgId: blockMsgId,
          isUser,
          mb: isLastInGroup ? 'mb-2' : 'mb-[2px]',
          imageUrl: placeholder,
          mockText,
          animClass: bubbleAnimClass,
          contextContent: mockText || '[相机]',
          isGroupChat: groupChat,
          senderName: isFirstInGroup ? senderName : null,
          senderAvatar,
          senderAvatarType,
          showAvatar: forceShowAvatar || (isLastInGroup && (groupChat || shouldShowChatAvatars)),
          metaText: tailMetaText,
          ...createFavoriteState(m, null)
        })
        continue
      }

      const resolvedImageUrl = resolveMessageImageUrl(m)
      if (m && m.isImage && resolvedImageUrl) {
        result.push({
          type: 'image',
          key: 'img-' + m.id,
          msgId: blockMsgId,
          isUser,
          mb: isLastInGroup ? 'mb-2' : 'mb-[2px]',
          imageUrl: resolvedImageUrl,
          time: Number(m.time || 0),
          animClass: bubbleAnimClass,
          contextContent: '[图片]',
          isGroupChat: groupChat,
          senderName: isFirstInGroup ? senderName : null,
          senderAvatar,
          senderAvatarType,
          showAvatar: forceShowAvatar || (isLastInGroup && (groupChat || shouldShowChatAvatars)),
          metaText: tailMetaText,
          ...createFavoriteState(m, null)
        })
        continue
      }

      if (m && m.isImageRendering) {
        result.push({
          type: 'imageRendering',
          key: 'img-rendering-' + m.id,
          msgId: blockMsgId,
          isUser,
          mb: isLastInGroup ? 'mb-2' : 'mb-[2px]',
          text: String(m.content || '正在渲染图片…'),
          animClass: bubbleAnimClass,
          contextContent: '[图片渲染中]',
          isGroupChat: groupChat,
          senderName: isFirstInGroup ? senderName : null,
          senderAvatar,
          senderAvatarType,
          showAvatar: forceShowAvatar || (isLastInGroup && (groupChat || shouldShowChatAvatars)),
          metaText: tailMetaText,
          ...createFavoriteState(m, null)
        })
        continue
      }

      if (m && m.isSticker && m.stickerName) {
        const url = getStickerUrl(m.stickerName)
        result.push({
          type: 'stickerMessage',
          key: 'stkmsg-' + m.id,
          msgId: blockMsgId,
          isUser,
          mb: isLastInGroup ? 'mb-2' : 'mb-[2px]',
          stickerName: m.stickerName,
          stickerUrl: url,
          animClass: bubbleAnimClass,
          contextContent: String(m.content ?? ''),
          isGroupChat: groupChat,
          senderName: isFirstInGroup ? senderName : null,
          senderAvatar,
          senderAvatarType,
          showAvatar: forceShowAvatar || (isLastInGroup && (groupChat || shouldShowChatAvatars)),
          metaText: tailMetaText,
          ...createFavoriteState(m, null)
        })
        continue
      }

      const agentTraceBlocks = buildAgentTraceBlocks(m, blockMsgId, {
        showToolLog: toolLogEnabled,
        showReasoning: reasoningEnabled
      })
      agentTraceBlocks.forEach(block => {
        result.push({
          ...block,
          isGroupChat: groupChat
        })
      })

      const displayContent = m.displayContent != null ? m.displayContent : m.content
      const parseOptions = {
        allowStickers: isUser || aiStickersEnabled,
        allowTransfer: isUser || aiTransferEnabled,
        allowGift: isUser || aiGiftEnabled,
        allowVoice: isUser || aiVoiceEnabled,
        allowCall: isUser || aiCallEnabled,
        allowMockImage: isUser || aiMockImageEnabled,
        allowMusic: isUser || aiMusicEnabled,
        allowMeet: isUser || aiMeetEnabled,
        allowRecall: isUser || aiRecallEnabled,
        allowFile: !isUser && aiFileEnabled,
        allowNarration: !isUser
      }
      const parts = getCachedParsedParts(m, displayContent, parseOptions)

      if (parts.length === 1 && parts[0].type === 'narration') {
        if (shouldShowNarrations) {
          result.push({
            type: 'narration',
            key: 'nar-' + m.id + '-only',
            msgId: blockMsgId,
            partIndex: 0,
            msgPartKey: favoritePartIndexToKey(0),
            text: String(parts[0].content ?? ''),
            animClass: narrationAnimClass
          })
        }
        continue
      }

      // 旁白和撤回提示都是居中的系统行，不参与气泡尾巴/头像/已读标记的归属
      const renderPartIndexes = []
      for (let idx = 0; idx < parts.length; idx += 1) {
        if (parts[idx].type !== 'narration' && parts[idx].type !== 'recall') renderPartIndexes.push(idx)
      }
      const firstRenderPartIndex = renderPartIndexes.length > 0 ? renderPartIndexes[0] : -1
      const lastRenderPartIndex = renderPartIndexes.length > 0 ? renderPartIndexes[renderPartIndexes.length - 1] : -1
      let normalIndex = 0

      for (let partIndex = 0; partIndex < parts.length; partIndex += 1) {
        const part = parts[partIndex]

        if (part.type === 'narration') {
          if (shouldShowNarrations) {
            result.push({
              type: 'narration',
              key: 'nar-' + m.id + '-' + partIndex,
              msgId: blockMsgId,
              partIndex,
              msgPartKey: favoritePartIndexToKey(partIndex),
              text: String(part.content ?? ''),
              animClass: narrationAnimClass
            })
          }
          continue
        }

        if (part.type === 'recall') {
          result.push({
            type: 'recall',
            key: 'recall-' + m.id + '-' + partIndex,
            msgId: blockMsgId,
            partIndex,
            msgPartKey: favoritePartIndexToKey(partIndex),
            isUser,
            recallerName: isUser ? '你' : (senderName || String(m.senderName || '').trim() || contactName || '对方'),
            text: String(part.content ?? ''),
            animate: anim,
            contextContent: String(part.content ?? '')
          })
          continue
        }

        const isFirstRenderPart = partIndex === firstRenderPartIndex
        const isLastRenderPart = partIndex === lastRenderPartIndex

        if (part.type === 'ui') {
          const incomplete = part.complete === false
          result.push({
            type: 'smartUI',
            key: 'ui-' + m.id + '-' + partIndex,
            msgId: blockMsgId,
            partIndex,
            isUser,
            mb: (isLastInGroup && isLastRenderPart) ? 'mb-2' : 'mb-[6px]',
            markup: part.content,
            complete: !incomplete,
            // 只有末条消息里未闭合的界面才可能还在流式生成；被截断的旧消息不显示生成中
            streaming: incomplete && i === msgs.length - 1 && (Date.now() - Number(m.time || 0)) < SMART_UI_STREAMING_WINDOW_MS,
            animate: incomplete || anim,
            animClass: bubbleAnimClass,
            contextContent: part.content,
            isGroupChat: groupChat,
            senderName: (isFirstInGroup && isFirstRenderPart) ? senderName : null,
            senderAvatar,
            senderAvatarType,
            showAvatar: forceShowAvatar || (isLastInGroup && isLastRenderPart && (groupChat || shouldShowChatAvatars)),
            metaText: (isLastInGroup && isLastRenderPart) ? tailMetaText : '',
            ...createFavoriteState(m, partIndex)
          })
          continue
        }
        if (part.type === 'sticker') {
          const url = getStickerUrl(part.name)
          result.push({
            type: 'sticker',
            key: 'stk-' + m.id + '-' + partIndex,
            msgId: blockMsgId,
            partIndex,
            isUser,
            mb: (isLastInGroup && isLastRenderPart) ? 'mb-2' : 'mb-[2px]',
            stickerName: part.name,
            stickerUrl: url,
            animClass: bubbleAnimClass,
            contextContent: formatStickerToken(part.name),
            isGroupChat: groupChat,
            senderName: (isFirstInGroup && isFirstRenderPart) ? senderName : null,
            senderAvatar,
            senderAvatarType,
            showAvatar: forceShowAvatar || (isLastInGroup && isLastRenderPart && (groupChat || shouldShowChatAvatars)),
            metaText: (isLastInGroup && isLastRenderPart) ? tailMetaText : '',
            ...createFavoriteState(m, partIndex)
          })
          continue
        }

        if (part.type === 'transfer') {
          const interaction = getInteractionState(m, partIndex)
          result.push({
            type: 'transfer',
            key: 'transfer-' + m.id + '-' + partIndex,
            msgId: blockMsgId,
            partIndex,
            isUser,
            mb: (isLastInGroup && isLastRenderPart) ? 'mb-2' : 'mb-[2px]',
            amount: part.amount,
            note: part.note,
            interactionStatus: interaction.status,
            interactionRespondedAt: interaction.respondedAt,
            time: m.time,
            animClass: bubbleAnimClass,
            contextContent: formatTransferToken(part.amount, part.note),
            isGroupChat: groupChat,
            detailSenderName: senderName || null,
            senderName: (isFirstInGroup && isFirstRenderPart) ? senderName : null,
            senderAvatar,
            senderAvatarType,
            showAvatar: forceShowAvatar || (isLastInGroup && isLastRenderPart && (groupChat || shouldShowChatAvatars)),
            metaText: (isLastInGroup && isLastRenderPart) ? tailMetaText : '',
            ...createFavoriteState(m, partIndex)
          })
          continue
        }

        if (part.type === 'gift') {
          const interaction = getInteractionState(m, partIndex)
          const giftData = resolveGiftDisplayData(m, part, partIndex)
          result.push({
            type: 'gift',
            key: 'gift-' + m.id + '-' + partIndex,
            msgId: blockMsgId,
            partIndex,
            isUser,
            mb: (isLastInGroup && isLastRenderPart) ? 'mb-2' : 'mb-[2px]',
            item: giftData.item,
            message: part.message,
            imageUrl: giftData.imageUrl,
            price: giftData.price,
            description: giftData.description,
            interactionStatus: interaction.status,
            interactionRespondedAt: interaction.respondedAt,
            time: m.time,
            animClass: bubbleAnimClass,
            contextContent: formatGiftToken(giftData.item, part.message),
            isGroupChat: groupChat,
            detailSenderName: senderName || null,
            senderName: (isFirstInGroup && isFirstRenderPart) ? senderName : null,
            senderAvatar,
            senderAvatarType,
            showAvatar: forceShowAvatar || (isLastInGroup && isLastRenderPart && (groupChat || shouldShowChatAvatars)),
            metaText: (isLastInGroup && isLastRenderPart) ? tailMetaText : '',
            ...createFavoriteState(m, partIndex)
          })
          continue
        }

        if (part.type === 'meet') {
          const interaction = getInteractionState(m, partIndex)
          result.push({
            type: 'meet',
            key: 'meet-' + m.id + '-' + partIndex,
            msgId: blockMsgId,
            partIndex,
            isUser,
            mb: (isLastInGroup && isLastRenderPart) ? 'mb-2' : 'mb-[2px]',
            location: part.location,
            time: part.time,
            note: part.note,
            interactionStatus: interaction.status,
            interactionRespondedAt: interaction.respondedAt,
            animClass: bubbleAnimClass,
            contextContent: formatMeetToken(part.location, part.time, part.note),
            isGroupChat: groupChat,
            senderName: (isFirstInGroup && isFirstRenderPart) ? senderName : null,
            senderAvatar,
            senderAvatarType,
            showAvatar: forceShowAvatar || (isLastInGroup && isLastRenderPart && (groupChat || shouldShowChatAvatars)),
            metaText: (isLastInGroup && isLastRenderPart) ? tailMetaText : '',
            ...createFavoriteState(m, partIndex)
          })
          continue
        }

        if (part.type === 'voice') {
          result.push({
            type: 'voice',
            key: 'voice-' + m.id + '-' + partIndex,
            msgId: blockMsgId,
            partIndex,
            contactId: resolvedAssistantVoiceContactId,
            isUser,
            mb: (isLastInGroup && isLastRenderPart) ? 'mb-2' : 'mb-[2px]',
            text: part.text,
            emotion: part.emotion || 'normal',
            duration: part.duration,
            waveform: part.waveform,
            animClass: bubbleAnimClass,
            contextContent: formatVoiceToken(part.text),
            isGroupChat: groupChat,
            senderName: (isFirstInGroup && isFirstRenderPart) ? senderName : null,
            senderAvatar,
            senderAvatarType,
            showAvatar: forceShowAvatar || (isLastInGroup && isLastRenderPart && (groupChat || shouldShowChatAvatars)),
            metaText: (isLastInGroup && isLastRenderPart) ? tailMetaText : '',
            ...createFavoriteState(m, partIndex)
          })
          continue
        }

        if (part.type === 'file') {
          const fileText = String(part.content || '')
          result.push({
            type: 'file',
            key: 'file-' + m.id + '-' + partIndex,
            msgId: blockMsgId,
            partIndex,
            isUser,
            mb: (isLastInGroup && isLastRenderPart) ? 'mb-2' : 'mb-[2px]',
            fileName: part.name,
            fileText,
            fileSize: new Blob([fileText]).size,
            fileMime: '',
            generating: part.complete === false,
            animClass: bubbleAnimClass,
            contextContent: '[文件] ' + part.name,
            isGroupChat: groupChat,
            senderName: (isFirstInGroup && isFirstRenderPart) ? senderName : null,
            senderAvatar,
            senderAvatarType,
            showAvatar: forceShowAvatar || (isLastInGroup && isLastRenderPart && (groupChat || shouldShowChatAvatars)),
            metaText: (isLastInGroup && isLastRenderPart) ? tailMetaText : '',
            ...createFavoriteState(m, partIndex)
          })
          continue
        }

        if (part.type === 'mockImage') {
          const placeholder = resolveMockImagePlaceholder(getMockImagePlaceholder ? getMockImagePlaceholder() : '')
          const mockText = String(part.text || '').trim()
          result.push({
            type: 'mockImage',
            key: 'mock-' + m.id + '-' + partIndex,
            msgId: blockMsgId,
            partIndex,
            isUser,
            mb: (isLastInGroup && isLastRenderPart) ? 'mb-2' : 'mb-[2px]',
            imageUrl: placeholder,
            mockText,
            animClass: bubbleAnimClass,
            contextContent: formatMockImageToken(mockText),
            isGroupChat: groupChat,
            senderName: (isFirstInGroup && isFirstRenderPart) ? senderName : null,
            senderAvatar,
            senderAvatarType,
            showAvatar: forceShowAvatar || (isLastInGroup && isLastRenderPart && (groupChat || shouldShowChatAvatars)),
            metaText: (isLastInGroup && isLastRenderPart) ? tailMetaText : '',
            ...createFavoriteState(m, partIndex)
          })
          continue
        }

        if (part.type === 'call') {
          result.push({
            type: 'call',
            key: 'call-' + m.id + '-' + partIndex,
            msgId: blockMsgId,
            partIndex,
            isUser,
            mb: (isLastInGroup && isLastRenderPart) ? 'mb-2' : 'mb-[2px]',
            callMode: part.callMode,
            callText: part.callText,
            isCallInvite: part.isCallInvite,
            animClass: bubbleAnimClass,
            contextContent: part.callText,
            isGroupChat: groupChat,
            senderName: (isFirstInGroup && isFirstRenderPart) ? senderName : null,
            senderAvatar,
            senderAvatarType,
            showAvatar: forceShowAvatar || (isLastInGroup && isLastRenderPart && (groupChat || shouldShowChatAvatars)),
            metaText: (isLastInGroup && isLastRenderPart) ? tailMetaText : '',
            ...createFavoriteState(m, partIndex)
          })
          continue
        }

        if (part.type === 'music') {
          result.push({
            type: 'music',
            key: 'music-' + m.id + '-' + partIndex,
            msgId: blockMsgId,
            partIndex,
            isUser,
            mb: (isLastInGroup && isLastRenderPart) ? 'mb-2' : 'mb-[2px]',
            title: part.title,
            artist: part.artist,
            url: part.url,
            cover: part.cover,
            animClass: bubbleAnimClass,
            contextContent: formatMusicToken(part.title, part.artist, part.url, part.cover),
            isGroupChat: groupChat,
            senderName: (isFirstInGroup && isFirstRenderPart) ? senderName : null,
            senderAvatar,
            senderAvatarType,
            showAvatar: forceShowAvatar || (isLastInGroup && isLastRenderPart && (groupChat || shouldShowChatAvatars)),
            metaText: (isLastInGroup && isLastRenderPart) ? tailMetaText : '',
            ...createFavoriteState(m, partIndex)
          })
          continue
        }

        const isLastNormalPart = isLastRenderPart
        const isFirstNormalPart = normalIndex === 0
        normalIndex += 1

        // has-tail / in-group 在全部块生成后按「下一个可见块」统一决定，见 applyBubbleTails
        const bubbleClass = isUser ? 'bubble-user' : 'bubble-ai'

        let replyText = ''
        let replyFromUser = !isUser
        let replyToMsgId = ''
        let replyToPartKey = ''
        let bubbleText = String(part.content ?? '')

        const { quote: partQuote, cleanText } = extractQuoteFromText(bubbleText)
        if (partQuote) {
          replyText = normalizeReplyPreviewText(partQuote)
          bubbleText = cleanText
          const quotedMsg = findQuotedMessage(partQuote, i)
          if (quotedMsg) {
            replyFromUser = quotedMsg.role === 'user'
            replyToMsgId = String(quotedMsg.sourceMsgId ?? quotedMsg.id ?? '')
            replyToPartKey = findQuotedPartKey(quotedMsg, partQuote)
          }
        } else if ((m.replyTo || m.replyToText) && isFirstNormalPart) {
          const org = m.replyTo ? idMap.get(String(m.replyTo)) : null
          replyText = normalizeReplyPreviewText(
            m.replyToText != null ? m.replyToText : (org ? org.content : '已删除')
          )
          if (org) {
            replyFromUser = org.role === 'user'
            replyToMsgId = String(org.sourceMsgId ?? org.id ?? '')
            replyToPartKey = findQuotedPartKey(org, m.replyToText ?? org.content)
          }
        }

        const jumboGlyphs = getJumboEmojiGlyphs(bubbleText)

        const mb = (isLastInGroup && isLastNormalPart) ? 'mb-2' : 'mb-[2px]'
        const metaText = (isLastInGroup && isLastNormalPart) ? tailMetaText : ''

        result.push({
          type: 'bubble',
          key: 'msg-' + m.id + '-n-' + normalIndex,
          msgId: blockMsgId,
          partIndex,
          isUser,
          mb,
          bubbleClass,
          animClass: bubbleAnimClass,
          replyText,
          replyFromUser,
          replyToMsgId,
          replyToPartKey,
          text: bubbleText,
          jumboEmoji: jumboGlyphs.length,
          emojiAnim: jumboGlyphs.length > 0 ? getEmojiAnimationKind(jumboGlyphs) : '',
          emotion: part.emotion || 'normal',
          metaText,
          contextContent: String(part.content ?? ''),
          isGroupChat: groupChat,
          senderName: (isFirstInGroup && isFirstRenderPart) ? senderName : null,
          senderAvatar,
          senderAvatarType,
          showAvatar: forceShowAvatar || (isLastInGroup && isLastNormalPart && (groupChat || shouldShowChatAvatars)),
          fromOffline: !!m.fromOffline,
          runEnd: isLastInGroup,
          runMsgId: String(m.id),
          ...createFavoriteState(m, partIndex)
        })
      }
    }

  applyBubbleTails(result)
  return groupImageBlocks(result)
}

// 一次多选发出的几张图（逐条存成图片消息、时间几乎相同）合并成一个相册块
const IMAGE_BATCH_WINDOW_MS = 2000

function canJoinImageGroup(prev, block) {
  if (prev?.type !== 'image' || block?.type !== 'image') return false
  if (prev.isUser !== block.isUser) return false
  if (prev.senderName !== block.senderName && block.senderName) return false
  if (prev.isGroupChat && prev.senderAvatar !== block.senderAvatar) return false
  const gap = Math.abs(Number(block.time || 0) - Number(prev.time || 0))
  return Number(prev.time) > 0 && Number(block.time) > 0 && gap <= IMAGE_BATCH_WINDOW_MS
}

function toImageGroupItem(block) {
  return {
    key: block.key,
    msgId: block.msgId,
    imageUrl: block.imageUrl,
    msgPartKey: block.msgPartKey,
    favorited: block.favorited,
    reactions: block.reactions
  }
}

function groupImageBlocks(blocks) {
  const output = []
  let k = 0
  while (k < blocks.length) {
    const first = blocks[k]
    let end = k + 1
    while (end < blocks.length && canJoinImageGroup(blocks[end - 1], blocks[end])) end += 1
    if (end - k < 2) {
      output.push(first)
      k += 1
      continue
    }
    const members = blocks.slice(k, end)
    const last = members[members.length - 1]
    output.push({
      ...first,
      type: 'imageGroup',
      key: 'imggrp-' + first.key,
      mb: last.mb,
      images: members.map(toImageGroupItem),
      contextContent: `[图片×${members.length}]`,
      showAvatar: last.showAvatar,
      metaText: last.metaText,
      favorited: members.every(item => item.favorited),
      reactions: members.flatMap((item, idx) => (Array.isArray(item.reactions) ? item.reactions : [])
        .map(reaction => ({ ...reaction, key: `${idx}-${reaction.key}` })))
    })
    k = end
  }
  return output
}

// 居中的系统行不打断气泡段落，也不抢尾巴
const TAIL_TRANSPARENT_TYPES = new Set(['narration', 'recall', 'reasoning', 'toolLog'])

function isPlainBubble(block) {
  return block?.type === 'bubble' && !(Number(block.jumboEmoji) > 0)
}

// 尾巴长在一段连续气泡的最后一个上：后面紧跟卡片/图片/贴纸/大号表情，
// 或者这条消息就是段落末尾（换人、隔了很久、已读不回）时都要有尾巴
function applyBubbleTails(blocks) {
  for (let k = 0; k < blocks.length; k += 1) {
    const block = blocks[k]
    if (block.type !== 'bubble') continue
    let next = null
    for (let j = k + 1; j < blocks.length; j += 1) {
      if (!TAIL_TRANSPARENT_TYPES.has(blocks[j].type)) {
        next = blocks[j]
        break
      }
    }
    const hasTail = !next
      || !isPlainBubble(next)
      || (next.runMsgId !== block.runMsgId && block.runEnd)
    block.bubbleClass += hasTail ? ' has-tail' : ' in-group'
    delete block.runEnd
  }
  for (const block of blocks) {
    if (block.type === 'bubble') delete block.runMsgId
  }
}
