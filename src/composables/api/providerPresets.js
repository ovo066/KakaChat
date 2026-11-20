import {
  API_FORMAT_ANTHROPIC_MESSAGES,
  API_FORMAT_GEMINI_GENERATE_CONTENT,
  API_FORMAT_OPENAI_COMPATIBLE,
  API_FORMAT_OPENAI_RESPONSES,
  normalizeApiFormat
} from './providerFormats'
import { getBrandColor, resolveModelBrand } from './brandIcons'

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   url: string,
 *   apiFormat: string,
 *   hosts: string[],
 *   brand?: string,
 *   icon?: string,
 *   tint: string,
 *   glyph?: string,
 *   hint?: string
 * }} ProviderPreset
 */

export const CUSTOM_PROVIDER_PRESET_ID = 'custom'

// brand 对应 src/assets/brand-icons 下的图标；tint 是图标底色，glyph 是图形颜色（默认白色）
/** @type {ProviderPreset[]} */
export const PROVIDER_PRESETS = Object.freeze([
  {
    id: 'openai',
    name: 'OpenAI',
    url: 'https://api.openai.com/v1',
    apiFormat: API_FORMAT_OPENAI_COMPATIBLE,
    hosts: ['api.openai.com'],
    brand: 'openai',
    tint: '#0D0D0D'
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    url: 'https://api.anthropic.com',
    apiFormat: API_FORMAT_ANTHROPIC_MESSAGES,
    hosts: ['api.anthropic.com'],
    brand: 'claude',
    tint: '#D97757'
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    url: 'https://generativelanguage.googleapis.com/v1beta',
    apiFormat: API_FORMAT_GEMINI_GENERATE_CONTENT,
    hosts: ['generativelanguage.googleapis.com'],
    brand: 'gemini',
    tint: 'linear-gradient(140deg, #3186FF 0%, #6F6BF0 55%, #C05FB8 100%)'
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    url: 'https://api.deepseek.com/v1',
    apiFormat: API_FORMAT_OPENAI_COMPATIBLE,
    hosts: ['api.deepseek.com'],
    brand: 'deepseek',
    tint: '#4D6BFE'
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    url: 'https://openrouter.ai/api/v1',
    apiFormat: API_FORMAT_OPENAI_COMPATIBLE,
    hosts: ['openrouter.ai'],
    brand: 'openrouter',
    tint: 'linear-gradient(140deg, #7275FA, #4A4CD4)',
    hint: '聚合平台，一个 Key 用多家模型'
  },
  {
    id: 'siliconflow',
    name: '硅基流动',
    url: 'https://api.siliconflow.cn/v1',
    apiFormat: API_FORMAT_OPENAI_COMPATIBLE,
    hosts: ['api.siliconflow.cn', 'api.siliconflow.com'],
    brand: 'siliconcloud',
    tint: '#6E29F6'
  },
  {
    id: 'volcengine',
    name: '火山方舟',
    url: 'https://ark.cn-beijing.volces.com/api/v3',
    apiFormat: API_FORMAT_OPENAI_COMPATIBLE,
    hosts: ['ark.cn-beijing.volces.com'],
    brand: 'volcengine',
    tint: 'linear-gradient(140deg, #00C2E0, #006EFF)',
    hint: '豆包等模型'
  },
  {
    id: 'dashscope',
    name: '阿里云百炼',
    url: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiFormat: API_FORMAT_OPENAI_COMPATIBLE,
    hosts: ['dashscope.aliyuncs.com', 'dashscope-intl.aliyuncs.com'],
    brand: 'bailian',
    tint: 'linear-gradient(140deg, #7347FF, #1C54E3)',
    hint: '通义千问等模型'
  },
  {
    id: 'moonshot',
    name: 'Kimi',
    url: 'https://api.moonshot.cn/v1',
    apiFormat: API_FORMAT_OPENAI_COMPATIBLE,
    hosts: ['api.moonshot.cn', 'api.moonshot.ai'],
    brand: 'kimi',
    tint: '#16161A'
  },
  {
    id: 'zhipu',
    name: '智谱 GLM',
    url: 'https://open.bigmodel.cn/api/paas/v4',
    apiFormat: API_FORMAT_OPENAI_COMPATIBLE,
    hosts: ['open.bigmodel.cn'],
    brand: 'zhipu',
    tint: '#3859FF'
  },
  {
    id: 'minimax',
    name: 'MiniMax',
    url: 'https://api.minimaxi.com/v1',
    apiFormat: API_FORMAT_OPENAI_COMPATIBLE,
    hosts: ['api.minimaxi.com', 'api.minimax.io', 'api.minimax.chat'],
    brand: 'minimax',
    tint: 'linear-gradient(140deg, #E2167E, #FE603C)'
  },
  {
    id: 'xai',
    name: 'xAI',
    url: 'https://api.x.ai/v1',
    apiFormat: API_FORMAT_OPENAI_COMPATIBLE,
    hosts: ['api.x.ai'],
    brand: 'xai',
    tint: '#16161A'
  },
  {
    id: 'ollama',
    name: 'Ollama',
    url: 'http://localhost:11434/v1',
    apiFormat: API_FORMAT_OPENAI_COMPATIBLE,
    hosts: ['localhost:11434', '127.0.0.1:11434'],
    brand: 'ollama',
    tint: '#FFFFFF',
    glyph: '#111111',
    hint: '本地运行，无需 Key'
  },
  {
    id: CUSTOM_PROVIDER_PRESET_ID,
    name: '自定义',
    url: '',
    apiFormat: API_FORMAT_OPENAI_COMPATIBLE,
    hosts: [],
    icon: 'ph-plugs-connected',
    tint: 'linear-gradient(140deg, #A1A1A8, #6D6D73)',
    hint: '中转站、自建服务等'
  }
])

export const API_FORMAT_OPTIONS = Object.freeze([
  { value: API_FORMAT_OPENAI_COMPATIBLE, label: 'OpenAI 兼容', short: 'OpenAI 兼容', path: '/chat/completions', detail: '绝大多数服务商和中转站', color: '#10A37F' },
  { value: API_FORMAT_OPENAI_RESPONSES, label: 'OpenAI Responses', short: 'Responses', path: '/responses', detail: 'OpenAI 新版接口', color: '#0EA5E9' },
  { value: API_FORMAT_ANTHROPIC_MESSAGES, label: 'Anthropic Messages', short: 'Anthropic', path: '/v1/messages', detail: 'Claude 原生接口，支持提示词缓存', color: '#D97757' },
  { value: API_FORMAT_GEMINI_GENERATE_CONTENT, label: 'Gemini', short: 'Gemini', path: ':generateContent', detail: 'Gemini 原生接口', color: '#3186FF' }
])

const FORMAT_OPTION_BY_VALUE = new Map(API_FORMAT_OPTIONS.map(option => [option.value, option]))

export function getApiFormatOption(format) {
  return FORMAT_OPTION_BY_VALUE.get(normalizeApiFormat(format)) || API_FORMAT_OPTIONS[0]
}

export function getProviderPreset(presetId) {
  const id = String(presetId || '').trim()
  return PROVIDER_PRESETS.find(preset => preset.id === id) || null
}

function readUrlHost(url) {
  const raw = String(url || '').trim()
  if (!raw) return ''
  try {
    return new URL(raw).host.toLowerCase()
  } catch {
    return ''
  }
}

export function findProviderPresetByUrl(url) {
  const host = readUrlHost(url)
  if (!host) return null
  return PROVIDER_PRESETS.find(preset => preset.hosts.includes(host)) || null
}

/** 供应商未命名时用域名兜底，例如 relay.example.com */
export function describeProviderHost(url) {
  const host = readUrlHost(url)
  return host.replace(/^api\./, '')
}

/**
 * 按模型名猜原生协议：只在服务商的默认协议是 OpenAI 兼容且用户选择“自动识别”时使用。
 * 中转站大多同时提供 /v1/messages 与 Gemini 原生入口，但也有只开放 OpenAI 兼容的，所以不默认启用。
 */
export function guessApiFormatForModel(modelId, fallback = API_FORMAT_OPENAI_COMPATIBLE) {
  const id = String(modelId || '').trim().toLowerCase().replace(/^.*\//, '')
  if (/^claude[-_]/.test(id) || id.startsWith('claude')) return API_FORMAT_ANTHROPIC_MESSAGES
  if (/^gemini[-_]/.test(id)) return API_FORMAT_GEMINI_GENERATE_CONTENT
  return normalizeApiFormat(fallback)
}

const CUSTOM_PROVIDER_TINTS = Object.freeze([
  'linear-gradient(140deg, #5AC8FA, #007AFF)',
  'linear-gradient(140deg, #FFB340, #FF7A00)',
  'linear-gradient(140deg, #66D47E, #20A346)',
  'linear-gradient(140deg, #FF7AA8, #E8366F)',
  'linear-gradient(140deg, #B08CFF, #7A4DF0)',
  'linear-gradient(140deg, #4FD1C5, #14918A)'
])

function hashText(value) {
  let hash = 0
  for (const ch of String(value || '')) hash = (hash * 31 + ch.codePointAt(0)) >>> 0
  return hash
}

/** 供应商图标：预设用品牌图标，自定义供应商用名称首字 + 按 id 固定的底色 */
export function getProviderVisual(provider) {
  const preset = getProviderPreset(provider?.preset) || findProviderPresetByUrl(provider?.url)
  if (preset && preset.id !== CUSTOM_PROVIDER_PRESET_ID) {
    return { brand: preset.brand || '', icon: preset.icon || '', text: '', tint: preset.tint, glyph: preset.glyph || '' }
  }
  const first = Array.from(String(provider?.name || '').trim())[0] || ''
  if (!first) {
    const custom = getProviderPreset(CUSTOM_PROVIDER_PRESET_ID)
    return { brand: '', icon: custom.icon, text: '', tint: custom.tint, glyph: '' }
  }
  return {
    brand: '',
    icon: '',
    text: first.toUpperCase(),
    tint: CUSTOM_PROVIDER_TINTS[hashText(provider?.id || provider?.name) % CUSTOM_PROVIDER_TINTS.length],
    glyph: ''
  }
}

/** 模型图标：按模型 ID 识别家族，识别不到时用通用立方体 */
export function getModelVisual(modelId) {
  const brand = resolveModelBrand(modelId)
  if (!brand) return { brand: '', icon: 'ph-cube', color: '' }
  return { brand, icon: '', color: getBrandColor(brand) || '' }
}
