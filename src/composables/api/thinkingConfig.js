/**
 * 思考深度 → 各协议的原生参数。
 * 存储值：''（模型默认，不发任何参数）/ 'auto'（模型自己决定想多少）/ 'minimal' | 'low' | 'medium' | 'high'
 */

export const THINKING_AUTO = 'auto'
const LEVELS = ['minimal', 'low', 'medium', 'high']

export function normalizeThinkingSetting(value) {
  const v = String(value || '').trim().toLowerCase()
  if (v === THINKING_AUTO || LEVELS.includes(v)) return v
  return ''
}

/** Claude 4.6 及以后（含 5 系列）支持 adaptive thinking；更早的只认 budget_tokens */
export function supportsAdaptiveThinking(modelId) {
  const id = String(modelId || '').toLowerCase().replace(/^.*\//, '')
  if (!id.includes('claude')) return false
  if (/claude-(?:opus|sonnet|haiku|fable|mythos)-(?:[5-9]|\d{2,})/.test(id)) return true
  if (/claude-(?:fable|mythos)/.test(id)) return true
  const m = id.match(/claude-(?:opus|sonnet|haiku)-4[-.](\d+)/)
  return !!m && Number(m[1]) >= 6
}

const ANTHROPIC_EFFORT = { minimal: 'low', low: 'low', medium: 'medium', high: 'high' }
const ANTHROPIC_LEGACY_BUDGET = { auto: 4096, minimal: 1024, low: 2048, medium: 6144, high: 12288 }

/** 直接修改 Anthropic Messages 请求体 */
export function applyAnthropicThinking(body, setting) {
  const mode = normalizeThinkingSetting(setting)
  if (!mode || !body) return body
  if (supportsAdaptiveThinking(body.model)) {
    body.thinking = { type: 'adaptive', display: 'summarized' }
    // 开启思考时 Claude 只接受 temperature=1，干脆不发采样参数
    delete body.temperature
    delete body.top_p
    delete body.top_k
    if (mode !== THINKING_AUTO) body.output_config = { ...(body.output_config || {}), effort: ANTHROPIC_EFFORT[mode] }
    return body
  }
  // 旧模型：固定预算，必须 >= 1024 且小于 max_tokens，开启时不能自定义温度
  const maxTokens = Number(body.max_tokens) || 4096
  const budget = Math.min(ANTHROPIC_LEGACY_BUDGET[mode], maxTokens - 1024)
  if (budget < 1024) return body
  body.thinking = { type: 'enabled', budget_tokens: budget }
  delete body.temperature
  delete body.top_p
  delete body.top_k
  return body
}

const GEMINI_BUDGET = { auto: -1, minimal: 512, low: 2048, medium: 8192, high: 24576 }

/** 直接修改 Gemini GenerateContent 请求体；-1 = 动态思考 */
export function applyGeminiThinking(body, setting) {
  const mode = normalizeThinkingSetting(setting)
  if (!mode || !body) return body
  body.generationConfig = {
    ...(body.generationConfig || {}),
    thinkingConfig: { thinkingBudget: GEMINI_BUDGET[mode], includeThoughts: true }
  }
  return body
}

/** OpenAI 兼容 / Responses：自动 = 不指定，由模型按问题难度决定 */
export function resolveOpenAIReasoningEffort(setting) {
  const mode = normalizeThinkingSetting(setting)
  return mode === THINKING_AUTO ? '' : mode
}

export const THINKING_OPTIONS = Object.freeze([
  { value: '', label: '模型默认', detail: '不发送思考参数' },
  { value: THINKING_AUTO, label: '自动', detail: '模型按问题难度自己决定想多久' },
  { value: 'minimal', label: '最少', detail: '' },
  { value: 'low', label: '低', detail: '' },
  { value: 'medium', label: '中', detail: '' },
  { value: 'high', label: '高', detail: '' }
])
