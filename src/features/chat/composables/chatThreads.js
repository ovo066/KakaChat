import { makeId } from '../../../utils/id'
import { buildMessagePreview, refreshContactMessageSummary } from '../../../utils/contactMessageSummary'

// 同一角色的多段对话：contact.msgs 始终是"当前对话"，其余对话存档在 contact.chatThreads。
// 切换时整体交换 msgs，其他依赖 contact.msgs 的模块无需感知。

export const MAX_CHAT_THREADS = 50
const THREAD_TITLE_MAX_CHARS = 24

// 这些记忆游标/摘要只对某一段对话有意义，随对话一起存取；核心记忆与长短期总结在各对话间共享
const THREAD_MEMORY_CURSOR_KEYS = Object.freeze([
  'lastSummaryMsgId',
  'lastAIMemoryMsgId',
  'contextSummary'
])

function cloneJson(value, fallback = null) {
  if (value == null) return fallback
  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    return fallback
  }
}

export function normalizeThreadTitle(title) {
  const text = String(title ?? '').replace(/\s+/g, ' ').trim()
  return text.length > THREAD_TITLE_MAX_CHARS ? text.slice(0, THREAD_TITLE_MAX_CHARS) : text
}

function firstMessageTime(msgs) {
  for (const msg of msgs) {
    const time = Number(msg?.time || 0)
    if (time > 0) return time
  }
  return 0
}

function lastVisibleMessage(msgs) {
  for (let i = msgs.length - 1; i >= 0; i -= 1) {
    const msg = msgs[i]
    if (msg && !msg.hideInChat && !msg.hidden) return msg
  }
  return null
}

function normalizeThreadRecord(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const msgs = Array.isArray(raw.msgs) ? raw.msgs : []
  const createdAt = Number(raw.createdAt || 0) || firstMessageTime(msgs) || Date.now()
  return {
    ...raw,
    id: String(raw.id || '').trim() || makeId('thread'),
    title: normalizeThreadTitle(raw.title),
    createdAt,
    updatedAt: Number(raw.updatedAt || 0) || createdAt,
    msgs
  }
}

export function ensureChatThreadFields(contact) {
  if (!contact || typeof contact !== 'object') return contact
  contact.chatThreads = Array.isArray(contact.chatThreads)
    ? contact.chatThreads.map(normalizeThreadRecord).filter(Boolean)
    : []
  const current = contact.currentThread
  if (!current || typeof current !== 'object' || !String(current.id || '').trim()) {
    const msgs = Array.isArray(contact.msgs) ? contact.msgs : []
    contact.currentThread = {
      id: makeId('thread'),
      title: '',
      createdAt: firstMessageTime(msgs) || Date.now()
    }
  } else {
    current.title = normalizeThreadTitle(current.title)
  }
  return contact
}

export function hasChatThreads(contact) {
  return Array.isArray(contact?.chatThreads) && contact.chatThreads.length > 0
}

function takeMemoryCursors(contact) {
  const memory = contact?.memory
  if (!memory || typeof memory !== 'object') return {}
  const cursors = {}
  THREAD_MEMORY_CURSOR_KEYS.forEach((key) => {
    cursors[key] = cloneJson(memory[key], null)
  })
  return cursors
}

function applyMemoryCursors(contact, cursors) {
  const memory = contact?.memory
  if (!memory || typeof memory !== 'object') return
  THREAD_MEMORY_CURSOR_KEYS.forEach((key) => {
    memory[key] = cursors && key in cursors ? cursors[key] : null
  })
  // 向量库按联系人建索引，换了对话后需要重建（调用方还应清掉旧的 round 向量）
  memory.lastVectorizedMsgId = null
  memory.roundVectorsDirty = true
}

function stashCurrentThread(contact) {
  const msgs = Array.isArray(contact.msgs) ? contact.msgs : []
  if (msgs.length === 0) return null
  const meta = contact.currentThread
  const record = {
    id: meta.id,
    title: normalizeThreadTitle(meta.title),
    createdAt: Number(meta.createdAt || 0) || firstMessageTime(msgs) || Date.now(),
    updatedAt: Number(lastVisibleMessage(msgs)?.time || 0) || Date.now(),
    msgs,
    memoryCursors: takeMemoryCursors(contact)
  }
  contact.chatThreads.unshift(record)
  return record
}

/**
 * 把当前对话存档，开启一段空白的新对话。当前对话为空时只更新标题。
 * @returns {{ archived: object|null, thread: object }}
 */
export function startNewChatThread(contact, options = {}) {
  ensureChatThreadFields(contact)
  const title = normalizeThreadTitle(options.title)
  const msgs = Array.isArray(contact.msgs) ? contact.msgs : []
  if (msgs.length === 0) {
    contact.currentThread.title = title
    return { archived: null, thread: contact.currentThread }
  }
  if (contact.chatThreads.length >= MAX_CHAT_THREADS) {
    throw new Error(`最多保存 ${MAX_CHAT_THREADS} 段对话，请先删除旧对话`)
  }

  const archived = stashCurrentThread(contact)
  contact.msgs = []
  contact.currentThread = { id: makeId('thread'), title, createdAt: Date.now() }
  applyMemoryCursors(contact, null)
  refreshContactMessageSummary(contact, { forceRescan: true })
  return { archived, thread: contact.currentThread }
}

/**
 * 切换到某段已存档的对话；当前对话（非空时）会被存档。
 */
export function switchChatThread(contact, threadId) {
  ensureChatThreadFields(contact)
  const id = String(threadId || '').trim()
  if (!id || id === contact.currentThread.id) return null
  const index = contact.chatThreads.findIndex(thread => thread.id === id)
  if (index < 0) return null

  const [target] = contact.chatThreads.splice(index, 1)
  stashCurrentThread(contact)
  contact.msgs = Array.isArray(target.msgs) ? target.msgs : []
  contact.currentThread = {
    id: target.id,
    title: normalizeThreadTitle(target.title),
    createdAt: Number(target.createdAt || 0) || Date.now()
  }
  applyMemoryCursors(contact, target.memoryCursors)
  refreshContactMessageSummary(contact, { forceRescan: true })
  return contact.currentThread
}

export function renameChatThread(contact, threadId, title) {
  ensureChatThreadFields(contact)
  const id = String(threadId || '').trim()
  const nextTitle = normalizeThreadTitle(title)
  if (!id || id === contact.currentThread.id) {
    contact.currentThread.title = nextTitle
    return true
  }
  const thread = contact.chatThreads.find(item => item.id === id)
  if (!thread) return false
  thread.title = nextTitle
  return true
}

export function deleteChatThread(contact, threadId) {
  ensureChatThreadFields(contact)
  const id = String(threadId || '').trim()
  const index = contact.chatThreads.findIndex(thread => thread.id === id)
  if (index < 0) return null
  const [removed] = contact.chatThreads.splice(index, 1)
  return removed
}

function buildThreadPreview(msgs) {
  const last = lastVisibleMessage(msgs)
  return last ? buildMessagePreview(last) : ''
}

function buildThreadOpening(msgs) {
  const first = msgs.find(msg => msg && !msg.hideInChat && !msg.hidden && msg.role === 'user')
    || msgs.find(msg => msg && !msg.hideInChat && !msg.hidden)
  return first ? normalizeThreadTitle(buildMessagePreview(first)) : ''
}

function toThreadListItem(thread, msgs, isCurrent) {
  const last = lastVisibleMessage(msgs)
  return {
    id: thread.id,
    title: normalizeThreadTitle(thread.title),
    fallbackTitle: buildThreadOpening(msgs) || (isCurrent ? '新对话' : '空白对话'),
    createdAt: Number(thread.createdAt || 0) || 0,
    updatedAt: Number(last?.time || 0) || Number(thread.updatedAt || 0) || Number(thread.createdAt || 0) || 0,
    msgCount: msgs.length,
    preview: buildThreadPreview(msgs),
    isCurrent
  }
}

/**
 * 供 UI 展示：当前对话置顶，其余按最近活跃排序。
 */
export function listChatThreads(contact) {
  if (!contact || typeof contact !== 'object') return []
  const msgs = Array.isArray(contact.msgs) ? contact.msgs : []
  const current = contact.currentThread && typeof contact.currentThread === 'object'
    ? contact.currentThread
    : { id: '', title: '', createdAt: firstMessageTime(msgs) }
  const archived = (Array.isArray(contact.chatThreads) ? contact.chatThreads : [])
    .filter(thread => thread && typeof thread === 'object')
    .map(thread => toThreadListItem(thread, Array.isArray(thread.msgs) ? thread.msgs : [], false))
    .sort((a, b) => b.updatedAt - a.updatedAt)
  return [toThreadListItem(current, msgs, true), ...archived]
}
