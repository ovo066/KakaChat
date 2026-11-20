import { createApiError, createApiFailureResult, trimText } from './errors'
import { hasImageToken } from './imageTokens'
import { cleanReasoningContent } from './reasoningContent'
import { createGiftSnapshot } from '../../data/gifts'
import { extractQuoteFromText } from '../../utils/messageQuote'
import {
  applyAssistantInteractionDecisions,
  applyAssistantReactions,
  ensureInteractiveMessagePending,
  parseMessageContent
} from '../../features/chat'

const CONTENT_FILTER_NOTICE = '⚠️ 回复被内容安全策略截断。'
const REASONING_ENTRY_MAX_CHARS = 12000
const REASONING_TOTAL_MAX_CHARS = 32000

function attachGiftPartSnapshots(message) {
  if (!message || typeof message !== 'object') return

  const parts = parseMessageContent(String(message.content || ''), {
    allowStickers: false,
    allowTransfer: false,
    allowGift: true,
    allowVoice: false,
    allowCall: false,
    allowMockImage: false,
    allowMusic: false,
    allowMeet: false,
    allowNarration: true
  })

  const snapshots = {}
  parts.forEach((part, partIndex) => {
    if (part?.type !== 'gift') return
    const snapshot = createGiftSnapshot(part.item)
    if (!snapshot) return
    snapshots[partIndex] = snapshot
  })

  if (Object.keys(snapshots).length > 0) {
    message.giftPartSnapshots = snapshots
    return
  }

  delete message.giftPartSnapshots
}

function removeChatMessage(activeChat, message) {
  const messages = activeChat?.msgs
  if (!Array.isArray(messages) || !message) return
  const idx = messages.findIndex(item => item === message || (message.id && item?.id === message.id))
  if (idx >= 0) messages.splice(idx, 1)
}

function touchChatMessage(activeChat, message) {
  const messages = activeChat?.msgs
  if (!Array.isArray(messages) || !message) return

  const idx = messages.findIndex(item => item === message || (message.id && item?.id === message.id))
  if (idx < 0) return

  messages.splice(idx, 1, message)
}

export function createAssistantMessage(makeMsgId, traceId, extra = {}) {
  const msg = {
    id: makeMsgId(),
    role: 'assistant',
    content: '',
    time: Date.now(),
    traceId,
    ...extra
  }
  ensureInteractiveMessagePending(msg)
  attachGiftPartSnapshots(msg)
  return msg
}

export function appendAssistantReasoning(message, content, round = 1) {
  if (!message || typeof message !== 'object') return false

  const text = String(content || '').trim()
  if (!text) return false

  const logs = Array.isArray(message.reasoningLogs)
    ? message.reasoningLogs.filter(item => item && String(item.content || '').trim())
    : []
  const normalizedRound = Math.max(1, Number(round || 1) || 1)
  if (logs.some(item => Number(item.round || 1) === normalizedRound && String(item.content || '').trim() === text)) {
    return false
  }

  const usedChars = logs.reduce((total, item) => total + String(item.content || '').length, 0)
  const availableChars = Math.max(0, REASONING_TOTAL_MAX_CHARS - usedChars)
  if (availableChars <= 0) return false

  const maxChars = Math.min(REASONING_ENTRY_MAX_CHARS, availableChars)
  const clipped = text.length > maxChars
    ? `${text.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`
    : text

  logs.push({
    content: clipped,
    round: normalizedRound
  })
  message.reasoningLogs = logs
  message.reasoningContent = logs.map(item => String(item.content || '').trim()).filter(Boolean).join('\n\n')
  return true
}

export function setAssistantReasoning(message, content, round = 1) {
  if (!message || typeof message !== 'object') return false

  const text = String(content || '').trim()
  if (!text) return false

  const normalizedRound = Math.max(1, Number(round || 1) || 1)
  const logs = Array.isArray(message.reasoningLogs)
    ? message.reasoningLogs.filter(item => item && String(item.content || '').trim())
    : []
  const existingIndex = logs.findIndex(item => Number(item.round || 1) === normalizedRound)
  const usedByOtherRounds = logs.reduce((total, item, index) => (
    index === existingIndex ? total : total + String(item.content || '').length
  ), 0)
  const availableChars = Math.max(0, REASONING_TOTAL_MAX_CHARS - usedByOtherRounds)
  if (availableChars <= 0) return false

  const maxChars = Math.min(REASONING_ENTRY_MAX_CHARS, availableChars)
  const clipped = text.length > maxChars
    ? `${text.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`
    : text
  if (existingIndex >= 0 && String(logs[existingIndex].content || '') === clipped) return false

  const nextEntry = { content: clipped, round: normalizedRound }
  if (existingIndex >= 0) {
    logs.splice(existingIndex, 1, nextEntry)
  } else {
    logs.push(nextEntry)
  }
  message.reasoningLogs = logs
  message.reasoningContent = logs.map(item => String(item.content || '').trim()).filter(Boolean).join('\n\n')
  return true
}

export function applyReplyMetadata(message, allMessages = [], options = {}) {
  if (!message || typeof message !== 'object') {
    return { quote: null, cleanContent: '' }
  }

  const prefixRegex = options.prefixRegex instanceof RegExp ? options.prefixRegex : null
  const cleanedReasoning = cleanReasoningContent(message.content)
  appendAssistantReasoning(message, cleanedReasoning.reasoningContent)
  let nextContent = cleanedReasoning.text
  if (cleanedReasoning.removedChars > 0) {
    message.reasoningFiltered = true
    message.reasoningFilteredChars = Math.max(
      Number(message.reasoningFilteredChars || 0) || 0,
      cleanedReasoning.removedChars
    )
  }
  if (prefixRegex) {
    nextContent = nextContent.replace(prefixRegex, '').trim()
  }
  message.content = nextContent

  if (prefixRegex && typeof message.displayContent === 'string') {
    message.displayContent = message.displayContent.replace(prefixRegex, '').trim()
  }

  const { quote, cleanText } = extractQuoteFromText(nextContent)

  if (!quote) {
    if (typeof options.buildDisplayContent === 'function') {
      message.displayContent = options.buildDisplayContent(nextContent)
    }
    const visible = message.displayContent != null ? String(message.displayContent) : nextContent
    return { quote: null, cleanContent: visible }
  }

  message.replyToText = quote
  const quotedMsg = Array.isArray(allMessages)
    ? allMessages.find(item => item?.id !== message.id && typeof item?.content === 'string' && item.content.includes(quote))
    : null
  if (quotedMsg) {
    message.replyTo = quotedMsg.id
  }

  message.content = cleanText
  if (typeof options.buildDisplayContent === 'function') {
    message.displayContent = options.buildDisplayContent(cleanText)
  } else if (message.displayContent != null) {
    message.displayContent = cleanText
  }

  const visible = message.displayContent != null ? String(message.displayContent) : cleanText
  return { quote, cleanContent: visible }
}

export function applyContentFilterNotice(message, streamInfo, notice = CONTENT_FILTER_NOTICE) {
  if (!message || streamInfo?.finishReason !== 'content_filter') {
    return false
  }

  message.contentFiltered = true
  const baseContent = typeof message.content === 'string' ? message.content : String(message.content || '')
  message.content = baseContent ? `${baseContent}

${notice}` : notice
  return true
}

export function assertVisibleAssistantReply({
  message,
  mode,
  traceId,
  model,
  url,
  streamInfo,
  allowAIImageGeneration,
  extra = {}
}) {
  const visibleContent = trimText(message?.displayContent != null ? message.displayContent : message?.content)
  const imageOnlyReply = hasImageToken(message?.content, allowAIImageGeneration)
  if (visibleContent || imageOnlyReply) {
    return { visibleContent, imageOnlyReply }
  }

  const meta = {
    mode,
    traceId,
    model,
    url,
    streamInfo,
    ...extra
  }
  console.warn('[api-empty-reply]', meta)
  throw createApiError('EMPTY_REPLY', 'empty reply', meta)
}

export function finalizeStreamingAssistantReply({
  message,
  activeChat,
  streamInfo,
  prefixRegex,
  buildDisplayContent,
  makeMsgId,
  syncForumToAI = false,
  parseMomentContent,
  actor = {},
  applyForumOnlyPlaceholder,
  pushMomentsIslandNotifications,
  visibility = {}
}) {
  applyContentFilterNotice(message, streamInfo)
  applyReplyMetadata(message, activeChat?.msgs, {
    prefixRegex,
    buildDisplayContent
  })
  const interactionResult = applyAssistantInteractionDecisions({
    activeChat,
    message,
    makeId: makeMsgId
  })
  const reactionResult = applyAssistantReactions({ activeChat, message })
  attachGiftPartSnapshots(message)
  if (typeof buildDisplayContent === 'function') {
    message.displayContent = buildDisplayContent(message.content)
  } else if (message.displayContent != null) {
    message.displayContent = message.content
  }
  ensureInteractiveMessagePending(message)

  const visibleAfterInteraction = trimText(message?.displayContent != null ? message.displayContent : message?.content)
  // 只点了个表情回应、没说话：回应已挂在用户消息上，这条空回复直接移除（不进上下文，也不响提示音）
  if (reactionResult.tokenCount > 0 && interactionResult.resolvedCount === 0 && !visibleAfterInteraction) {
    removeChatMessage(activeChat, message)
    return {
      forumOnly: false,
      parsedMomentsResult: null,
      interactionOnly: true,
      acceptedMeet: false
    }
  }
  const interactionOnly = interactionResult.resolvedCount > 0 && !visibleAfterInteraction
  if (interactionOnly) {
    message.hideInChat = true
    touchChatMessage(activeChat, message)
    return {
      forumOnly: false,
      parsedMomentsResult: null,
      interactionOnly: true,
      acceptedMeet: interactionResult.acceptedMeet === true
    }
  }

  let forumOnly = false
  let parsedMomentsResult = null
  if (syncForumToAI && message?.content && typeof parseMomentContent === 'function') {
    parsedMomentsResult = parseMomentContent(message.content, actor)
    if (typeof applyForumOnlyPlaceholder === 'function') {
      forumOnly = !!applyForumOnlyPlaceholder(message, parsedMomentsResult)
    }
    if (typeof pushMomentsIslandNotifications === 'function') {
      pushMomentsIslandNotifications(parsedMomentsResult, actor)
    }
  }

  assertVisibleAssistantReply({
    ...visibility,
    message,
    streamInfo
  })

  touchChatMessage(activeChat, message)

  return {
    forumOnly,
    parsedMomentsResult,
    acceptedMeet: interactionResult.acceptedMeet === true
  }
}

export function appendAssistantErrorMessage({
  activeChat,
  makeMsgId,
  friendlyError,
  traceId,
  errorCode = 'API_ERROR',
  extra = {}
}) {
  if (!activeChat) return null

  const msg = createAssistantMessage(makeMsgId, traceId, {
    content: '⚠️ ' + friendlyError,
    errorCode,
    ...extra
  })
  activeChat.msgs.push(msg)
  return msg
}

export function handleAssistantRequestFailure({
  activeChat,
  removeMessageIfVisiblyEmpty,
  createdMsgId,
  buildFriendlyErrorMessage,
  makeMsgId,
  traceId,
  error,
  extra = {}
}) {
  if (typeof removeMessageIfVisiblyEmpty === 'function') {
    removeMessageIfVisiblyEmpty(activeChat, createdMsgId)
  }

  const errorCode = error?.code || 'API_ERROR'
  const friendlyError = typeof buildFriendlyErrorMessage === 'function'
    ? buildFriendlyErrorMessage(error, traceId)
    : String(error?.message || error || 'API error')

  appendAssistantErrorMessage({
    activeChat,
    makeMsgId,
    friendlyError,
    traceId,
    errorCode,
    extra
  })

  return createApiFailureResult(error, {
    traceId,
    errorMessage: friendlyError,
    defaultCode: errorCode
  })
}
