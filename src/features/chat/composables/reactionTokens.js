/**
 * 表情回应 token 与 tapback 定义（不依赖消息解析器，供 contentParts 在流式阶段隐藏 token）。
 */
import { getJumboEmojiGlyphs, isEmojiGrapheme, splitGraphemes } from '../../../utils/emoji'

export const TAPBACK_OPTIONS = Object.freeze([
  { key: 'heart', emoji: '❤️', label: '爱心' },
  { key: 'like', emoji: '👍', label: '赞' },
  { key: 'dislike', emoji: '👎', label: '踩' },
  { key: 'haha', emoji: '😂', label: '哈哈' },
  { key: 'emphasize', emoji: '‼️', label: '强调' },
  { key: 'question', emoji: '❓', label: '疑问' }
])

const TAPBACK_ALIASES = new Map()
;[
  ['heart', 'heart love loved 爱心 心 喜欢 ❤ ♥ 💗'],
  ['like', 'like liked thumbsup thumbs_up 赞 点赞 👍'],
  ['dislike', 'dislike disliked thumbsdown thumbs_down 踩 👎'],
  ['haha', 'haha lol laugh laughed 哈哈 哈哈哈 笑 😂'],
  ['emphasize', 'emphasize emphasized !! ！！ ‼ 强调 感叹'],
  ['question', 'question questioned ? ？ 疑问 问号 ❓ ❔']
].forEach(([key, aliases]) => {
  aliases.split(' ').forEach(alias => TAPBACK_ALIASES.set(alias.toLowerCase(), key))
})

const TAPBACK_BY_KEY = new Map(TAPBACK_OPTIONS.map(option => [option.key, option]))

// (react:❤️) (react:heart:原文片段) （回应：👍）
const REACTION_TOKEN_RE = /[(（]\s*(?:react|reaction|tapback|回应|表情回应)\s*[:：]\s*([^:：()（）\n]{1,24}?)\s*(?:[:：]\s*([^()（）\n]{1,120}?)\s*)?[)）]/gi

function stripVariationSelectors(value) {
  return String(value || '').replace(/[\u{FE0E}\u{FE0F}]/gu, '')
}

/**
 * @param {string} emoji
 * @returns {string} 用于比较的键（忽略 FE0F）
 */
export function reactionKey(emoji) {
  return stripVariationSelectors(emoji).trim()
}

/**
 * @param {string} emoji
 * @returns {string|null} 经典 tapback 的 key（heart/like/...），自定义 emoji 返回 null
 */
export function getTapbackKind(emoji) {
  const key = reactionKey(emoji)
  if (!key) return null
  const option = TAPBACK_OPTIONS.find(item => reactionKey(item.emoji) === key)
  return option ? option.key : null
}

/**
 * 把 AI/用户给出的回应（emoji 或别名）规范成一个 emoji；无法识别返回 null。
 * @param {string} raw
 * @returns {string|null}
 */
export function normalizeReactionEmoji(raw) {
  const text = String(raw ?? '').trim()
  if (!text) return null
  const alias = TAPBACK_ALIASES.get(stripVariationSelectors(text).toLowerCase())
  if (alias) return TAPBACK_BY_KEY.get(alias).emoji

  const jumbo = getJumboEmojiGlyphs(text, 8)
  const glyph = jumbo[0] || splitGraphemes(text).find(isEmojiGrapheme)
  if (!glyph) return null
  const tapback = getTapbackKind(glyph)
  return tapback ? TAPBACK_BY_KEY.get(tapback).emoji : glyph
}

/**
 * 从文本里剥离回应 token。
 * @param {string} content
 * @returns {{ cleanedContent: string, reactions: Array<{ emoji: string, quote: string }> }}
 */
export function extractReactionTokens(content) {
  const text = String(content ?? '')
  const reactions = []
  if (!text) return { cleanedContent: text, reactions }
  REACTION_TOKEN_RE.lastIndex = 0
  if (!REACTION_TOKEN_RE.test(text)) return { cleanedContent: text, reactions }
  REACTION_TOKEN_RE.lastIndex = 0

  const cleanedContent = text
    .replace(REACTION_TOKEN_RE, (match, rawEmoji, rawQuote) => {
      const emoji = normalizeReactionEmoji(rawEmoji)
      if (!emoji) return match
      reactions.push({ emoji, quote: String(rawQuote || '').trim() })
      return ''
    })
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return { cleanedContent: reactions.length > 0 ? cleanedContent : text, reactions }
}

/**
 * 只去掉回应 token（流式输出时避免 token 闪现在气泡里）。
 * @param {string} content
 * @returns {string}
 */
export function stripReactionTokens(content) {
  const text = String(content ?? '')
  if (!text || !/(?:react|reaction|tapback|回应)/i.test(text)) return text
  REACTION_TOKEN_RE.lastIndex = 0
  // 只吞掉能识别出 emoji 的 token，用户自己打的"(回应:好的)"之类保持原样
  return text.replace(REACTION_TOKEN_RE, (match, rawEmoji) => (normalizeReactionEmoji(rawEmoji) ? '' : match))
}
