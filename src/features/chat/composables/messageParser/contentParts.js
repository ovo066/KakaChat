import {
  getGiftData,
  getGiftImageUrl,
  getGiftPrice
} from '../../../../data/gifts'
import { estimateVoiceDuration, generateWaveform } from '../../../../utils/voiceWaveform'
import { hasSmartUIMarkup, splitSmartUISegments, stripArchivedSmartUI } from '../../smartUI/markup'
import { formatFileBlockToken, hasFileMarkup, splitFileSegments } from '../../files/fileMessages'
import { stripReactionTokens } from '../reactionTokens'

export { estimateVoiceDuration, generateWaveform }

export function formatStickerToken(name) {
  const n = String(name ?? '').trim()
  return `(sticker:${n})`
}

export function formatTransferToken(amount, note) {
  const a = String(amount ?? '').trim()
  const n = String(note ?? '').trim()
  return n ? `(transfer:${a}:${n})` : `(transfer:${a})`
}

const UNSAFE_SPECIAL_TOKEN_VALUE_REGEX = /[%:：()[\]（）【】\r\n]/

function encodeSpecialTokenValue(value) {
  const text = String(value ?? '').trim()
  if (!text) return ''
  return UNSAFE_SPECIAL_TOKEN_VALUE_REGEX.test(text) ? encodeURIComponent(text) : text
}

function decodeSpecialTokenValue(value) {
  const text = String(value ?? '').trim()
  if (!text || !text.includes('%')) return text
  try {
    return decodeURIComponent(text).trim()
  } catch {
    return text
  }
}

function splitTokenSegments(text) {
  const raw = String(text ?? '')
  const segments = []
  let current = ''

  for (const ch of raw) {
    if (ch === ':' || ch === '：') {
      segments.push(current.trim())
      current = ''
      continue
    }
    current += ch
  }

  segments.push(current.trim())
  return segments
}

export function formatGiftToken(item, message) {
  const i = encodeSpecialTokenValue(item)
  const m = encodeSpecialTokenValue(message)
  return m ? `(gift:${i}:${m})` : `(gift:${i})`
}

function prependEmotionTag(text, emotion) {
  const t = String(text ?? '').trim()
  const normalizedEmotion = normalizeEmotionTag(emotion)
  if (!t) return ''
  if (!normalizedEmotion || normalizedEmotion === 'normal') return t
  return `[emotion:${normalizedEmotion}]${t}`
}

export function formatVoiceToken(text, emotion = 'normal') {
  const t = prependEmotionTag(text, emotion)
  return `(voice:${t})`
}

export function formatMockImageToken(text) {
  const t = String(text ?? '').trim()
  return `(camera:${t})`
}

export function formatMeetToken(location, time, note) {
  const l = encodeSpecialTokenValue(location)
  const t = encodeSpecialTokenValue(time)
  const n = encodeSpecialTokenValue(note)
  if (n) return `(meet:${l}:${t}:${n})`
  if (t) return `(meet:${l}:${t})`
  return `(meet:${l})`
}

export function formatRecallToken(text) {
  const t = String(text ?? '').trim()
  return `(recall:${t})`
}

export function formatMusicToken(title, artist, url = '', cover = '') {
  const t = String(title ?? '').trim()
  const a = String(artist ?? '').trim()
  const u = String(url ?? '').trim()
  const c = String(cover ?? '').trim()
  if (u && c) return `(music:${t}:${a}:${u}:${c})`
  if (u) return `(music:${t}:${a}:${u})`
  return a ? `(music:${t}:${a})` : `(music:${t})`
}


const EMOTION_TAG_REGEX = /\[\s*emotion\s*[:：]\s*([a-zA-Z_]+)\s*\]/gi
const VALID_EMOTIONS = new Set([
  'normal', 'happy', 'sad', 'surprised', 'angry', 'shy', 'thinking', 'laughing',
  'excited', 'worried', 'confused', 'love', 'sleepy', 'proud', 'nervous'
])

function normalizeEmotionTag(value) {
  const key = String(value || '').trim().toLowerCase()
  if (!key || !VALID_EMOTIONS.has(key)) return ''
  return key
}

function stripEmotionTags(text, fallbackEmotion = 'normal') {
  const raw = String(text ?? '')
  let detected = ''
  const cleaned = raw
    .replace(EMOTION_TAG_REGEX, (_, token) => {
      const next = normalizeEmotionTag(token)
      if (next) detected = next
      return ' '
    })
    .replace(/\s{2,}/g, ' ')
    .trim()

  const fallback = normalizeEmotionTag(fallbackEmotion) || 'normal'
  return {
    text: cleaned,
    emotion: detected || fallback
  }
}

const SPECIAL_TOKEN_BRACKETS = {
  '(': ')',
  '（': '）',
  '[': ']',
  '【': '】'
}

const SPECIAL_TOKEN_TYPE_REGEX = /^(?:stickers?|sticker|表情包|贴纸|transfer|转账|gift|礼物|voice|语音|call|通话|camera|相机|mockimage|mock|模拟图片|music|音乐|meet|见面|线下见面|recall|unsend|撤回)$/i
const SPECIAL_TOKEN_PREFIX_REGEX = /^\s*(?:stickers?|sticker|表情包|贴纸|transfer|转账|gift|礼物|voice|语音|call|通话|camera|相机|mockimage|mock|模拟图片|music|音乐|meet|见面|线下见面|recall|unsend|撤回)\s*[:：]/i
const LINE_BREAK_REGEX = /\r\n?|\u0085|\u2028|\u2029/g

function normalizeLineBreaks(text) {
  return String(text ?? '').replace(LINE_BREAK_REGEX, '\n')
}

function unwrapSpecialToken(token) {
  const raw = String(token ?? '').trim()
  if (raw.length < 3) return null

  const open = raw[0]
  const close = SPECIAL_TOKEN_BRACKETS[open]
  if (!close || raw[raw.length - 1] !== close) return null
  return raw.slice(1, -1).trim()
}

function splitByFirstColon(text) {
  const raw = String(text ?? '')
  const idx = raw.search(/[:：]/)
  if (idx < 0) return [raw.trim(), '']
  const left = raw.slice(0, idx).trim()
  const right = raw.slice(idx + 1).trim()
  return [left, right]
}

function extractUrlsFromMusicPayload(payload) {
  const text = String(payload ?? '')
  const urlMatches = text.match(/https?:\/\/[^\s)\]）】]+/gi) || []
  if (urlMatches.length === 0) {
    return { rest: text.trim(), urls: [] }
  }
  let rest = text
  urlMatches.forEach((url) => {
    rest = rest.replace(url, '')
  })
  rest = rest
    .replace(/\s*[:：]\s*/g, ':')
    .replace(/^:+|:+$/g, '')
    .trim()
  return { rest, urls: urlMatches }
}

function findSpecialTokensInLine(line) {
  const text = String(line ?? '')
  const matches = []

  let i = 0
  while (i < text.length) {
    const open = text[i]
    const close = SPECIAL_TOKEN_BRACKETS[open]
    if (!close) {
      i += 1
      continue
    }

    const afterOpen = text.slice(i + 1)
    if (!SPECIAL_TOKEN_PREFIX_REGEX.test(afterOpen)) {
      i += 1
      continue
    }

    let depth = 1
    let j = i + 1
    while (j < text.length) {
      const ch = text[j]
      if (ch === open) depth += 1
      else if (ch === close) {
        depth -= 1
        if (depth === 0) break
      }
      j += 1
    }

    if (depth === 0) {
      matches.push({
        index: i,
        end: j + 1,
        token: text.slice(i, j + 1)
      })
      i = j + 1
      continue
    }

    i += 1
  }

  return matches
}

function parseSpecialToken(token, fallbackEmotion = 'normal') {
  const body = unwrapSpecialToken(token)
  if (!body) return null

  const headMatch = body.match(/^([^:：]+)\s*[:：]\s*([\s\S]*)$/)
  if (!headMatch) return null

  const kind = headMatch[1].trim()
  const payload = (headMatch[2] || '').trim()
  if (!SPECIAL_TOKEN_TYPE_REGEX.test(kind) || !payload) return null

  if (/^(?:stickers?|sticker|表情包|贴纸)$/i.test(kind)) {
    return { type: 'sticker', name: payload }
  }

  if (/^(?:transfer|转账)$/i.test(kind)) {
    const [amount, note] = splitByFirstColon(payload)
    return amount ? { type: 'transfer', amount, note } : null
  }

  if (/^(?:gift|礼物)$/i.test(kind)) {
    const [itemRaw, messageRaw] = splitByFirstColon(payload)
    const item = decodeSpecialTokenValue(itemRaw)
    const message = decodeSpecialTokenValue(messageRaw)
    const imageUrl = getGiftImageUrl(item)
    const price = getGiftPrice(item)
    const giftData = getGiftData(item)
    const description = giftData?.description || null
    return item ? { type: 'gift', item, message, imageUrl, price, description } : null
  }

  if (/^(?:voice|语音)$/i.test(kind)) {
    const parsedVoice = stripEmotionTags(payload, fallbackEmotion)
    const text = parsedVoice.text
    const duration = estimateVoiceDuration(text)
    const waveform = generateWaveform(text)
    return text ? { type: 'voice', text, duration, waveform, emotion: parsedVoice.emotion } : null
  }

  if (/^(?:call|通话)$/i.test(kind)) {
    const [mode, text] = splitByFirstColon(payload)
    const callMode = /video|视频/i.test(mode) ? 'video' : 'voice'
    const callText = stripEmotionTags(text, fallbackEmotion).text
    return { type: 'call', callMode, callText: callText || (callMode === 'video' ? '视频通话' : '语音通话'), isCallInvite: true }
  }

  if (/^(?:camera|相机|mockimage|mock|模拟图片)$/i.test(kind)) {
    return { type: 'mockImage', text: stripEmotionTags(payload, fallbackEmotion).text }
  }

  if (/^(?:music|音乐)$/i.test(kind)) {
    const { rest, urls } = extractUrlsFromMusicPayload(payload)
    const segments = rest.split(/[:：]/).map(s => s.trim()).filter(Boolean)
    const title = segments[0] || ''
    const artist = segments[1] || ''
    const url = urls[0] || segments[2] || ''
    const cover = urls[1] || segments[3] || ''
    return title ? { type: 'music', title, artist, url, cover } : null
  }

  if (/^(?:recall|unsend|撤回)$/i.test(kind)) {
    // 发出后又撤回的消息：界面只显示"撤回了一条消息"，原文可点开查看
    const text = stripEmotionTags(payload, fallbackEmotion).text
    return text ? { type: 'recall', content: text } : null
  }

  if (/^(?:meet|见面|线下见面)$/i.test(kind)) {
    const segments = splitTokenSegments(payload)
    const location = decodeSpecialTokenValue(segments[0] || '')
    let time = ''
    let note = ''

    if (segments.length === 2) {
      time = decodeSpecialTokenValue(segments[1] || '')
    } else if (segments.length === 3) {
      time = decodeSpecialTokenValue(segments[1] || '')
      note = decodeSpecialTokenValue(segments[2] || '')
    } else if (segments.length > 3) {
      time = decodeSpecialTokenValue(segments.slice(1, -1).join(':'))
      note = decodeSpecialTokenValue(segments[segments.length - 1] || '')
    }

    return location ? { type: 'meet', location, time, note } : null
  }

  return null
}

export function rebuildMessageContent(parts) {
  if (!parts || parts.length === 0) return ''

  const segments = []
  for (const part of parts) {
    if (part.type === 'narration') {
      segments.push(`*${part.content}*`)
    } else if (part.type === 'sticker') {
      segments.push(formatStickerToken(part.name))
    } else if (part.type === 'transfer') {
      segments.push(formatTransferToken(part.amount, part.note))
    } else if (part.type === 'gift') {
      segments.push(formatGiftToken(part.item, part.message))
    } else if (part.type === 'voice') {
      segments.push(formatVoiceToken(part.text, part.emotion))
    } else if (part.type === 'mockImage') {
      segments.push(formatMockImageToken(part.text))
    } else if (part.type === 'call') {
      const mode = part.callMode === 'video' ? 'video' : 'voice'
      segments.push(part.callText ? `(call:${mode}:${part.callText})` : `(call:${mode})`)
    } else if (part.type === 'music') {
      segments.push(formatMusicToken(part.title, part.artist, part.url, part.cover))
    } else if (part.type === 'meet') {
      segments.push(formatMeetToken(part.location, part.time, part.note))
    } else if (part.type === 'recall') {
      segments.push(formatRecallToken(part.content))
    } else if (part.type === 'file') {
      segments.push(formatFileBlockToken(part.name, part.content))
    } else {
      segments.push(part.content)
    }
  }
  return segments.join('\n')
}

export function parseMessageContent(content, allowStickersOrOptions = true) {
  const normalizedContent = stripArchivedSmartUI(normalizeLineBreaks(content))

  // <file> 文件块：整体切出（内部可能含任意字符），优先于 <ui> 与逐行解析
  const fileOpts = (allowStickersOrOptions && typeof allowStickersOrOptions === 'object') ? allowStickersOrOptions : null
  if ((!fileOpts || fileOpts.allowFile !== false) && hasFileMarkup(normalizedContent)) {
    const fileParts = []
    for (const segment of splitFileSegments(normalizedContent)) {
      if (segment.type === 'file') {
        fileParts.push({ type: 'file', name: segment.name, content: segment.content, complete: segment.complete })
      } else if (segment.content.trim()) {
        fileParts.push(...parseMessageContent(segment.content, allowStickersOrOptions))
      }
    }
    return fileParts
  }

  // <ui> 智能界面块是可跨行的整体，先于逐行/旁白解析切出来，保证各处 partIndex 一致
  if (hasSmartUIMarkup(normalizedContent)) {
    const uiParts = []
    for (const segment of splitSmartUISegments(normalizedContent)) {
      if (segment.type === 'ui') {
        uiParts.push({ type: 'ui', content: segment.content.trim(), complete: segment.complete })
      } else if (segment.content.trim()) {
        uiParts.push(...parseMessageContent(segment.content, allowStickersOrOptions))
      }
    }
    return uiParts
  }

  // AI 的表情回应 token 不是正文：流式输出阶段也不让它出现在气泡里
  const plainContent = stripReactionTokens(normalizedContent)
  const parts = []
  const regex = /\*([^*\n]+)\*/g

  const opts = (allowStickersOrOptions && typeof allowStickersOrOptions === 'object')
    ? allowStickersOrOptions
    : { allowStickers: allowStickersOrOptions }
  const allowStickers = opts.allowStickers !== false
  const allowTransfer = opts.allowTransfer !== false
  const allowGift = opts.allowGift !== false
  const allowVoice = opts.allowVoice !== false
  const allowCall = opts.allowCall !== false
  const allowMockImage = opts.allowMockImage !== false
  const allowMusic = opts.allowMusic !== false
  const allowMeet = opts.allowMeet !== false
  const allowRecall = opts.allowRecall !== false
  const allowNarration = opts.allowNarration !== false
  const anySpecialAllowed = allowStickers || allowTransfer || allowGift || allowVoice || allowCall || allowMockImage || allowMusic || allowMeet || allowRecall

  const pushNormalPart = (target, text, fallbackEmotion = 'normal') => {
    const parsed = stripEmotionTags(text, fallbackEmotion)
    if (!parsed.text) return
    target.push({ type: 'normal', content: parsed.text, emotion: parsed.emotion })
  }

  const pushTokenPart = (target, token, fallbackEmotion = 'normal') => {
    const parsed = parseSpecialToken(token, fallbackEmotion)
    if (parsed) {
      const ok = (
        (parsed.type === 'sticker' && allowStickers) ||
        (parsed.type === 'transfer' && allowTransfer) ||
        (parsed.type === 'gift' && allowGift) ||
        (parsed.type === 'voice' && allowVoice) ||
        (parsed.type === 'call' && allowCall) ||
        (parsed.type === 'mockImage' && allowMockImage) ||
        (parsed.type === 'music' && allowMusic) ||
        (parsed.type === 'meet' && allowMeet) ||
        (parsed.type === 'recall' && allowRecall)
      )
      if (ok) {
        target.push(parsed)
      } else {
        pushNormalPart(target, token, fallbackEmotion)
      }
    } else {
      pushNormalPart(target, token, fallbackEmotion)
    }
  }

  const pushLineParts = (target, line, fallbackEmotion = 'normal') => {
    const parsedLine = stripEmotionTags(line, fallbackEmotion)
    const lineText = parsedLine.text
    const lineEmotion = parsedLine.emotion
    if (!lineText) return

    if (!anySpecialAllowed) {
      pushNormalPart(target, lineText, lineEmotion)
      return
    }

    const tokens = findSpecialTokensInLine(lineText)
    if (tokens.length === 0) {
      pushNormalPart(target, lineText, lineEmotion)
      return
    }

    let cursor = 0
    for (const match of tokens) {
      const before = lineText.substring(cursor, match.index).trim()
      if (before) {
        pushNormalPart(target, before, lineEmotion)
      }
      pushTokenPart(target, match.token, lineEmotion)
      cursor = match.end
    }

    const rest = lineText.substring(cursor).trim()
    if (rest) {
      pushNormalPart(target, rest, lineEmotion)
    }
  }

  const pushTextParts = (text) => {
    const normalized = normalizeLineBreaks(text)
      .replace(/\n+\s*(\[(?:quote|引用)[:：][^\]]+\])/gi, ' $1')
      .replace(/(\[(?:quote|引用)[:：][^\]]+\])\s*\n+/gi, '$1 ')
    const lines = normalized.split(/\n+/).map(l => l.trim()).filter(l => l)
    lines.forEach(line => {
      pushLineParts(parts, line, 'normal')
    })
  }

  if (allowNarration) {
    let lastIndex = 0
    let match
    while ((match = regex.exec(plainContent)) !== null) {
      if (match.index > lastIndex) {
        const text = plainContent.substring(lastIndex, match.index).trim()
        if (text) {
          pushTextParts(text)
        }
      }
      parts.push({ type: 'narration', content: match[1].trim() })
      lastIndex = regex.lastIndex
    }

    if (lastIndex < plainContent.length) {
      const text = plainContent.substring(lastIndex).trim()
      if (text) {
        pushTextParts(text)
      }
    }
  } else {
    pushTextParts(plainContent)
  }

  if (parts.length === 0) {
    const text = plainContent.trim()
    if (text) {
      const fallback = []
      const lines = text.split(/\n+/).map(l => l.trim()).filter(l => l)
      lines.forEach(line => {
        pushLineParts(fallback, line, 'normal')
      })
      return fallback.length > 0 ? fallback : [{ type: 'normal', content: text, emotion: 'normal' }]
    }
    return []
  }

  return parts
}
