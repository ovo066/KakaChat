/**
 * 气泡表情回应（iMessage Tapback）。
 *
 * 存储：message.reactions = [{ emoji, part, from, senderId?, senderName?, time }]
 *  - part 与收藏一致：'message' 表示整条消息（图片/贴纸等），数字字符串表示第几个内容片段
 *  - from：'user' | 'assistant'；同一个人在同一个气泡上只保留一个回应（再选一次相同的即取消）
 *
 * AI 通过 (react:❤️) / (react:❤️:原文片段) 回应用户最近的消息，token 会在定稿时剥离。
 */
import { parseMessageContent } from './messageParser/contentParts'
import {
  extractReactionTokens,
  getTapbackKind,
  normalizeReactionEmoji,
  reactionKey
} from './reactionTokens'

export {
  TAPBACK_OPTIONS,
  extractReactionTokens,
  getTapbackKind,
  normalizeReactionEmoji,
  reactionKey,
  stripReactionTokens
} from './reactionTokens'

export const REACTION_PART_WHOLE_MESSAGE = 'message'
const MAX_REACTION_GROUPS = 3

const NON_TEXT_MESSAGE_FLAGS = ['isImage', 'isSticker', 'isFile', 'isMockImage', 'isCallRecord', 'isImageRendering']

// 与 buildBlocks 解析用户消息时的选项保持一致，保证片段下标对得上
const USER_MESSAGE_PARSE_OPTIONS = Object.freeze({
  allowStickers: true,
  allowTransfer: true,
  allowGift: true,
  allowVoice: true,
  allowCall: true,
  allowMockImage: true,
  allowMusic: true,
  allowMeet: true,
  allowRecall: true,
  allowFile: false,
  allowNarration: false
})

/**
 * @param {number|null|undefined} partIndex
 * @returns {string}
 */
export function reactionPartKeyFromIndex(partIndex) {
  const value = Number(partIndex)
  return partIndex != null && partIndex !== '' && Number.isInteger(value) && value >= 0
    ? String(value)
    : REACTION_PART_WHOLE_MESSAGE
}

function normalizeStoredReactions(message) {
  const list = Array.isArray(message?.reactions) ? message.reactions : []
  return list.filter(item => item && typeof item === 'object' && reactionKey(item.emoji) && item.part != null)
}

function isSameActor(reaction, actor) {
  if (reaction.from !== actor.from) return false
  if (actor.from === 'user') return true
  return String(reaction.senderId || '') === String(actor.senderId || '')
}

/**
 * 设置（或在 emoji 为空时移除）某人对某个气泡的回应。
 * @param {object} message
 * @param {string} partKey
 * @param {string|null} emoji
 * @param {{ from: 'user'|'assistant', senderId?: string, senderName?: string, time?: number }} actor
 * @returns {boolean} 是否有变化
 */
export function setMessageReaction(message, partKey, emoji, actor) {
  if (!message || typeof message !== 'object' || !actor?.from) return false
  const part = String(partKey || REACTION_PART_WHOLE_MESSAGE)
  const current = normalizeStoredReactions(message)
  const existing = current.find(item => item.part === part && isSameActor(item, actor))
  const nextEmoji = emoji ? normalizeReactionEmoji(emoji) : null
  if (existing && nextEmoji && reactionKey(existing.emoji) === reactionKey(nextEmoji)) return false
  if (!existing && !nextEmoji) return false

  const next = current.filter(item => !(item.part === part && isSameActor(item, actor)))
  if (nextEmoji) {
    const entry = { emoji: nextEmoji, part, from: actor.from, time: actor.time || Date.now() }
    if (actor.senderId) entry.senderId = String(actor.senderId)
    if (actor.senderName) entry.senderName = String(actor.senderName)
    next.push(entry)
  }
  message.reactions = next
  return true
}

/**
 * 用户在气泡上选了一个回应：相同则取消，不同则替换。
 * @returns {string|null} 生效后的回应，取消时为 null
 */
export function toggleUserReaction(message, partKey, emoji) {
  const part = String(partKey || REACTION_PART_WHOLE_MESSAGE)
  const current = getUserReaction(message, part)
  const nextEmoji = normalizeReactionEmoji(emoji)
  if (current && nextEmoji && reactionKey(current) === reactionKey(nextEmoji)) {
    setMessageReaction(message, part, null, { from: 'user' })
    return null
  }
  setMessageReaction(message, part, nextEmoji, { from: 'user' })
  return nextEmoji
}

/**
 * @returns {string|null} 用户在这个气泡上的回应
 */
export function getUserReaction(message, partKey) {
  const part = String(partKey || REACTION_PART_WHOLE_MESSAGE)
  const found = normalizeStoredReactions(message).find(item => item.part === part && item.from === 'user')
  return found ? found.emoji : null
}

/**
 * 气泡上显示的回应：按 emoji 合并，最新的排在最后（叠在最上层），最多 3 组。
 * @returns {Array<{ key: string, emoji: string, tapback: string|null, count: number, mine: boolean, names: string[] }>}
 */
export function getPartReactionsForDisplay(message, partKey) {
  const part = String(partKey || REACTION_PART_WHOLE_MESSAGE)
  const list = normalizeStoredReactions(message)
    .filter(item => item.part === part)
    .sort((a, b) => (Number(a.time) || 0) - (Number(b.time) || 0))
  if (list.length === 0) return []

  const groups = new Map()
  list.forEach((item) => {
    const key = reactionKey(item.emoji)
    const group = groups.get(key) || { key, emoji: item.emoji, tapback: getTapbackKind(item.emoji), count: 0, mine: false, names: [], time: 0 }
    group.count += 1
    group.mine = group.mine || item.from === 'user'
    if (item.from !== 'user' && item.senderName) group.names.push(item.senderName)
    group.time = Math.max(group.time, Number(item.time) || 0)
    groups.delete(key)
    groups.set(key, group)
  })
  return Array.from(groups.values())
    .slice(-MAX_REACTION_GROUPS)
    .map(({ time, ...group }) => group)
}

function normalizeForMatch(value) {
  return String(value ?? '').replace(/\s+/g, '').toLowerCase()
}

function getPartMatchText(part) {
  if (!part) return ''
  return [part.content, part.text, part.name, part.item, part.note, part.title, part.location]
    .filter(Boolean)
    .join(' ')
}

/**
 * 回应落在用户消息的哪个气泡上：有原文片段时找包含它的片段，否则取最后一个。
 * @returns {string}
 */
export function resolveUserReactionPartKey(message, quote = '') {
  if (!message || NON_TEXT_MESSAGE_FLAGS.some(flag => message[flag])) return REACTION_PART_WHOLE_MESSAGE
  const content = message.displayContent != null ? message.displayContent : message.content
  const parts = parseMessageContent(String(content ?? ''), USER_MESSAGE_PARSE_OPTIONS)
  const candidates = []
  parts.forEach((part, index) => {
    if (part.type !== 'narration' && part.type !== 'recall') candidates.push(index)
  })
  if (candidates.length === 0) return REACTION_PART_WHOLE_MESSAGE

  const target = normalizeForMatch(quote)
  if (target) {
    const matched = candidates.find(index => normalizeForMatch(getPartMatchText(parts[index])).includes(target))
    if (matched != null) return String(matched)
  }
  return String(candidates[candidates.length - 1])
}

function isVisibleUserMessage(message) {
  return message?.role === 'user' && !message.hideInChat && !message.hidden && !message.interactionEvent
}

function findReactionTarget(messages, sourceMessage, quote) {
  const list = Array.isArray(messages) ? messages : []
  const target = normalizeForMatch(quote)
  let latest = null
  for (let index = list.length - 1; index >= 0; index -= 1) {
    const message = list[index]
    if (message === sourceMessage || !isVisibleUserMessage(message)) continue
    if (!latest) latest = message
    if (!target) break
    const content = message.displayContent != null ? message.displayContent : message.content
    if (normalizeForMatch(content).includes(target)) return message
  }
  return latest
}

/**
 * 定稿 AI 回复时：剥离回应 token，并把回应挂到对应的用户消息上。
 * @param {{ activeChat: object, message: object, now?: number }} options
 * @returns {{ appliedCount: number, tokenCount: number }} tokenCount 为识别到的回应 token 数（含重复回应）
 */
export function applyAssistantReactions({ activeChat, message, now = Date.now() }) {
  if (!activeChat || !message || typeof message.content !== 'string') return { appliedCount: 0, tokenCount: 0 }
  const { cleanedContent, reactions } = extractReactionTokens(message.content)
  if (reactions.length === 0) return { appliedCount: 0, tokenCount: 0 }

  message.content = cleanedContent
  if (typeof message.displayContent === 'string') {
    message.displayContent = extractReactionTokens(message.displayContent).cleanedContent
  }

  let appliedCount = 0
  reactions.forEach(({ emoji, quote }) => {
    const target = findReactionTarget(activeChat.msgs, message, quote)
    if (!target) return
    const changed = setMessageReaction(target, resolveUserReactionPartKey(target, quote), emoji, {
      from: 'assistant',
      senderId: message.senderId,
      senderName: message.senderName,
      time: now
    })
    if (changed) appliedCount += 1
  })
  return { appliedCount, tokenCount: reactions.length }
}

/**
 * 给模型看的回应说明，附在对应消息后面。
 * @param {object} message
 * @param {{ selfMemberId?: string, namedActors?: boolean }} [options]
 *   selfMemberId：群聊多 API 模式下当前发言成员；namedActors：群聊单 API（一个模型扮演全员）时按成员名称呼
 * @returns {string}
 */
export function formatReactionNote(message, options = {}) {
  const list = normalizeStoredReactions(message)
  if (list.length === 0 || (message.role !== 'user' && message.role !== 'assistant')) return ''
  const selfMemberId = String(options.selfMemberId || '')
  const namedActors = options.namedActors === true

  const notes = []
  list.forEach((item) => {
    const emoji = item.emoji
    if (message.role === 'assistant' && item.from === 'user') {
      notes.push(`用户用 ${emoji} 回应了这条消息`)
      return
    }
    if (message.role === 'user' && item.from === 'assistant') {
      const isSelf = namedActors
        ? !item.senderName
        : (!selfMemberId || !item.senderId || String(item.senderId) === selfMemberId)
      const actor = isSelf ? '你' : (item.senderName || '其他成员')
      notes.push(`${actor}用 ${emoji} 回应了这条消息`)
    }
  })
  const unique = Array.from(new Set(notes))
  return unique.length > 0 ? `（${unique.join('；')}）` : ''
}

/**
 * @param {object} message
 * @param {string} content
 * @param {{ selfMemberId?: string, namedActors?: boolean }} [options]
 * @returns {string}
 */
export function appendReactionNote(message, content, options) {
  const note = formatReactionNote(message, options)
  if (!note) return content
  const text = String(content ?? '')
  return text ? `${text}\n${note}` : note
}
