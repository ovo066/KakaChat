/**
 * Emoji 工具：判断"纯 emoji 消息"（iMessage 里 1~3 个 emoji 会放大显示、去掉气泡），
 * 以及按 emoji 语义挑一个动画。
 */

const PICTOGRAPHIC_RE = /\p{Extended_Pictographic}/u
const EMOJI_PRESENTATION_RE = /\p{Emoji_Presentation}|\u{FE0F}|\u{200D}|[\u{1F3FB}-\u{1F3FF}]/u
const KEYCAP_RE = /^[0-9#*]\u{FE0F}?\u{20E3}$/u
const FLAG_RE = /^[\u{1F1E6}-\u{1F1FF}]{2}$/u
const VARIATION_AND_SKIN_RE = /\u{FE0F}|[\u{1F3FB}-\u{1F3FF}]/gu
// 默认按文字样式显示、但单独发出时大家都当 emoji 用的字符（AI 输出常漏掉 FE0F）
const TEXT_DEFAULT_EMOJI = new Set(['❤', '☺', '✌', '☝', '✍', '☀', '☁', '☂', '☃', '♥', '❄', '✈', '❣', '☹', '‼', '⁉'])

const segmenter = typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
  ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  : null

/**
 * @param {string} text
 * @returns {string[]}
 */
export function splitGraphemes(text) {
  const value = String(text ?? '')
  if (!value) return []
  if (segmenter) return Array.from(segmenter.segment(value), item => item.segment)
  return Array.from(value)
}

/**
 * @param {string} grapheme
 * @returns {boolean}
 */
export function isEmojiGrapheme(grapheme) {
  const value = String(grapheme || '')
  if (!value) return false
  if (KEYCAP_RE.test(value) || FLAG_RE.test(value)) return true
  if (!PICTOGRAPHIC_RE.test(value)) return false
  if (EMOJI_PRESENTATION_RE.test(value)) return true
  return TEXT_DEFAULT_EMOJI.has(value)
}

/**
 * 纯 emoji（忽略空白）且不超过 max 个时返回 emoji 列表，否则返回空数组。
 * @param {string} text
 * @param {number} [max=3]
 * @returns {string[]}
 */
export function getJumboEmojiGlyphs(text, max = 3) {
  const compact = String(text ?? '').replace(/\s+/g, '')
  if (!compact || compact.length > 48) return []
  const graphemes = splitGraphemes(compact)
  if (graphemes.length === 0 || graphemes.length > max) return []
  return graphemes.every(isEmojiGrapheme) ? graphemes : []
}

const ANIMATION_GROUPS = [
  ['beat', '❤ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💖 💗 💓 💞 💕 💘 💝 ❣ ♥ 💟 😍 🥰 😘 😻 💋 🫶'],
  ['laugh', '😂 🤣 😆 😹 😄 😁 😀 😃 😅 🤭'],
  ['wave', '👋 🤚 ✋ 🖐'],
  ['clap', '👏 🙌 🙏 🤝'],
  ['thumb', '👍 👎 👌 ✌ 🤞 🤙 💪 ☝ 👆 🤘 🫡'],
  ['cry', '😭 😢 🥺 😿 😞 😔 😥 😓 🥹'],
  ['angry', '😡 😠 🤬 💢 👿 😤'],
  ['shock', '😱 😮 😲 🤯 😳 😨 😰 🙀'],
  ['party', '🎉 🎊 🥳 ✨ 🎆 🎇 🎁 🎂 🌟 ⭐'],
  ['fire', '🔥 💥 ⚡ 💯'],
  ['sleep', '😴 💤 🥱 😪']
]

const ANIMATION_LOOKUP = new Map()
ANIMATION_GROUPS.forEach(([kind, list]) => {
  list.split(' ').forEach(emoji => ANIMATION_LOOKUP.set(emoji, kind))
})

/**
 * @param {string[]} glyphs
 * @returns {string} beat/laugh/wave/clap/thumb/cry/angry/shock/party/fire/sleep/jelly
 */
export function getEmojiAnimationKind(glyphs) {
  const list = Array.isArray(glyphs) ? glyphs : []
  for (const glyph of list) {
    const kind = ANIMATION_LOOKUP.get(String(glyph || '').replace(VARIATION_AND_SKIN_RE, ''))
    if (kind) return kind
  }
  return 'jelly'
}
