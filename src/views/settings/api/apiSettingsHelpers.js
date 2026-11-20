import {
  parseCustomRequestBody,
  parseCustomRequestHeaders,
  parseRemovedRequestParameters
} from '../../../composables/api/requestCustomization'
import { getBrandLabel, resolveModelBrand } from '../../../composables/api/brandIcons'
import { prepareApiKey, stripInvisibleFormatChars } from '../../../utils/httpHeaders'
import { MAX_OUTPUT_TOKENS_LIMIT } from '../../../stores/configsModel'

/** @typedef {{ ok: boolean, value: any, error: string }} FieldResult */

function ok(value) {
  return { ok: true, value, error: '' }
}

function fail(error) {
  return { ok: false, value: null, error }
}

/** @returns {FieldResult} */
export function parseTemperatureInput(text) {
  const raw = String(text ?? '').trim()
  if (!raw) return ok(null)
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0 || n > 2) return fail('温度需在 0–2 之间')
  return ok(Math.round(n * 100) / 100)
}

/** @returns {FieldResult} */
export function parseMaxTokensInput(text) {
  const raw = String(text ?? '').trim()
  if (!raw) return ok(null)
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 1 || n > MAX_OUTPUT_TOKENS_LIMIT) {
    return fail(`输出上限需为 1–${MAX_OUTPUT_TOKENS_LIMIT} 的整数`)
  }
  return ok(n)
}

/**
 * @param {'headers' | 'body' | 'remove'} kind
 * @returns {FieldResult}
 */
export function parseAdvancedField(kind, text) {
  const raw = String(text ?? '').trim()
  try {
    if (kind === 'headers') {
      parseCustomRequestHeaders(raw)
      return ok(raw)
    }
    if (kind === 'body') {
      parseCustomRequestBody(raw)
      return ok(raw)
    }
    return ok(parseRemovedRequestParameters(raw))
  } catch (error) {
    return fail(error?.message || '格式不正确')
  }
}

export function describeApiKeyProblem(key) {
  try {
    prepareApiKey(key)
    return ''
  } catch (error) {
    return error?.message || 'API Key 格式不正确'
  }
}

export function cleanUrlInput(value) {
  return stripInvisibleFormatChars(value).trim()
}

export function describeUrlProblem(url) {
  const value = cleanUrlInput(url)
  if (!value) return '还没有填写接口地址'
  if (!/^https?:\/\//i.test(value)) return '地址需要以 http:// 或 https:// 开头'
  return ''
}

/** 在 Gemini 协议下提示中转站常见的 /v1beta 地址 */
export function describeGeminiRelayHint(url, isOfficialGemini) {
  if (isOfficialGemini) return ''
  return /\/v1\/?$/i.test(cleanUrlInput(url))
    ? '中转站的 Gemini 原生入口通常是 /v1beta，可打开下方“单独设置接口地址”修改'
    : ''
}

/** 把模型 ID 按家族分组：大组在前，“其他”放最后，组内保持原顺序 */
export function groupModelIdsByFamily(modelIds) {
  const groups = new Map()
  ;(Array.isArray(modelIds) ? modelIds : []).forEach((id) => {
    const brand = resolveModelBrand(id)
    if (!groups.has(brand)) groups.set(brand, { brand, label: getBrandLabel(brand), ids: [] })
    groups.get(brand).ids.push(id)
  })
  return [...groups.values()].sort((a, b) => {
    if (!a.brand) return 1
    if (!b.brand) return -1
    return b.ids.length - a.ids.length
  })
}

/** 正在使用某个模型的角色 / 群聊数（含群成员） */
export function countModelUsage(modelId, contacts) {
  if (!modelId) return 0
  return (Array.isArray(contacts) ? contacts : []).filter((contact) => {
    if (contact?.configId === modelId) return true
    return Array.isArray(contact?.members) && contact.members.some(member => member?.configId === modelId)
  }).length
}
