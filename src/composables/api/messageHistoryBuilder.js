import {
  appendReactionNote,
  buildFileMessageModelContent,
  pickFullSmartUIMessages,
  rewriteSmartUIContentForModel
} from '../../features/chat'
import { appendReadOnlyNote } from './readOnlyNote'

// 已读不回 + 表情回应，都以括注的形式跟在消息后面告诉模型
function appendMessageNotes(message, content, reactionOptions) {
  return appendReactionNote(message, appendReadOnlyNote(message, content), reactionOptions)
}

function resolveTextContent(message) {
  return message?.isFile ? buildFileMessageModelContent(message) : message?.content
}

function isImagePlaceholder(content) {
  return content === '[\u56FE\u7247]'
}

function buildImageParts(imageUrl, text) {
  const parts = []
  if (text) {
    parts.push({ type: 'text', text })
  }
  parts.push({ type: 'image_url', image_url: { url: imageUrl } })
  return parts
}

function resolveReplyText(message, allMessages = []) {
  if (message?.replyToText != null) {
    return message.replyToText
  }
  if (message?.replyTo) {
    const originalMessage = allMessages.find(item => item?.id === message.replyTo)
    return originalMessage?.content || ''
  }
  return ''
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function hasSenderPrefix(content, senderName) {
  const text = String(content || '')
  const name = String(senderName || '').trim()
  if (!text || !name) return false
  return new RegExp(`^\\[\\s*${escapeRegex(name)}\\s*\\][:：]\\s*`, 'i').test(text)
}

function prefixGroupAssistantContent(message, content, fallback = '') {
  const text = String(content || '').trim()
  const senderName = String(message?.senderName || '').trim()
  const nextContent = text || String(fallback || '').trim()

  if (!senderName || !nextContent) return nextContent
  if (hasSenderPrefix(nextContent, senderName)) return nextContent
  return `[${senderName}]: ${nextContent}`
}

export async function resolveContextMessageImageUrls(contextMsgs = [], resolveImageUrl) {
  if (!Array.isArray(contextMsgs) || contextMsgs.length === 0 || typeof resolveImageUrl !== 'function') {
    return contextMsgs
  }

  return await Promise.all(contextMsgs.map(async (message) => {
    if (!message?.isImage) return message

    const currentUrl = String(message?.imageUrl || '').trim()
    const nextUrl = await resolveImageUrl(message, currentUrl)
    if (!nextUrl || nextUrl === currentUrl) return message

    return {
      ...message,
      imageUrl: nextUrl
    }
  }))
}

export function buildDirectChatApiMessages(contextMsgs = [], allMessages = []) {
  const fullSmartUIMessages = pickFullSmartUIMessages(contextMsgs)
  return contextMsgs.map(message => {
    if (message?.role === 'system') {
      return { role: message.role, content: message.content }
    }

    if (message?.isImage && message?.imageUrl) {
      const text = (message.content && !isImagePlaceholder(message.content)) ? message.content : ''
      return {
        role: message.role,
        content: buildImageParts(message.imageUrl, appendMessageNotes(message, text))
      }
    }

    let content = message?.isFile
      ? resolveTextContent(message)
      : rewriteSmartUIContentForModel(message, message.content, fullSmartUIMessages.has(message))
    const replyText = resolveReplyText(message, allMessages)
    if (replyText) {
      content = `[quote:${replyText}]\n${content}`
    }

    return { role: message.role, content: appendMessageNotes(message, content) }
  })
}

export function buildGroupSingleApiMessages(contextMsgs = []) {
  return contextMsgs.map(message => {
    if (message?.role === 'system') {
      return { role: message.role, content: message.content }
    }

    if (message?.isImage && message?.imageUrl) {
      const baseContent = (message.content && !isImagePlaceholder(message.content)) ? message.content : ''
      let text = ''
      if (message.role === 'user') {
        text = '[\u7528\u6237]:' + (baseContent ? ` ${baseContent}` : ' [\u56FE\u7247]')
      } else if (message.role === 'assistant') {
        text = prefixGroupAssistantContent(message, baseContent, '[\u56FE\u7247]')
      } else if (baseContent) {
        text = baseContent
      }
      return {
        role: message.role,
        content: buildImageParts(message.imageUrl, appendReactionNote(message, text, { namedActors: true }))
      }
    }

    let content = resolveTextContent(message)
    if (message.role === 'user') {
      content = `[\u7528\u6237]: ${resolveTextContent(message)}`
    } else if (message.role === 'assistant') {
      content = prefixGroupAssistantContent(message, resolveTextContent(message))
    }
    return { role: message.role, content: appendReactionNote(message, content, { namedActors: true }) }
  })
}

export function buildGroupMultiApiMessages(contextMsgs = [], memberId) {
  return contextMsgs.map(message => {
    if (message?.role === 'system') {
      return { role: message.role, content: message.content }
    }

    const isUserMessage = message.role === 'user'
    const role = isUserMessage ? 'user' : (message.senderId === memberId ? 'assistant' : 'user')
    const prefix = isUserMessage ? '[\u7528\u6237]:' : (message.senderName ? `[${message.senderName}]:` : '')

    if (message?.isImage && message?.imageUrl) {
      const baseContent = (message.content && !isImagePlaceholder(message.content)) ? message.content : ''
      const text = prefix
        ? (baseContent ? `${prefix} ${baseContent}` : `${prefix} [\u56FE\u7247]`)
        : baseContent
      return {
        role,
        content: buildImageParts(message.imageUrl, appendReactionNote(message, text, { selfMemberId: memberId }))
      }
    }

    const text = resolveTextContent(message)
    const content = prefix ? `${prefix} ${text}` : text
    return { role, content: appendReactionNote(message, content, { selfMemberId: memberId }) }
  })
}
