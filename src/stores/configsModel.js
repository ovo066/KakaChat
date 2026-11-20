import { makeId } from '../utils/id'
import { normalizeApiKey, stripInvisibleFormatChars } from '../utils/httpHeaders'
import {
  API_FORMAT_OPENAI_COMPATIBLE,
  createDefaultCacheConfig,
  normalizeApiFormat,
  normalizeCacheConfig,
  normalizeProviderConfig
} from '../composables/api/providerFormats'
import { normalizeRemovedRequestParameters } from '../composables/api/requestCustomization'
import {
  CUSTOM_PROVIDER_PRESET_ID,
  describeProviderHost,
  findProviderPresetByUrl,
  getProviderPreset
} from '../composables/api/providerPresets'

/**
 * 数据模型：一个供应商（地址 + Key + 请求头）下挂多个模型，每个模型单独选择接口协议与生成参数。
 * 模型条目的 id 沿用旧版“API 配置”的 id（cfg_xxx），联系人 / 群成员 / 各功能里存的 configId
 * 直接指向模型，因此旧数据无需改引用。
 *
 * @typedef {{
 *   id: string,
 *   model: string,
 *   name: string,
 *   apiFormat: string,
 *   urlOverride: string,
 *   temperature: number | null,
 *   maxTokens: number | null,
 *   reasoningEffort: string,
 *   customBodyJson: string,
 *   removeBodyParams: string[],
 *   autoAdaptParameters: boolean,
 *   cacheConfig: { enabled: boolean, systemPrompt: boolean, ttl: string }
 * }} ProviderModel
 *
 * @typedef {{
 *   id: string,
 *   name: string,
 *   preset: string,
 *   url: string,
 *   key: string,
 *   apiFormat: string,
 *   customHeadersJson: string,
 *   cachedModels: string[],
 *   cachedModelsUpdatedAt: number | null,
 *   models: ProviderModel[]
 * }} ModelProvider
 */

// 与请求层 parseOptionalMaxTokens 的上限一致
export const MAX_OUTPUT_TOKENS_LIMIT = 65535
const REASONING_EFFORTS = new Set(['auto', 'minimal', 'low', 'medium', 'high'])

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function cleanText(value) {
  return typeof value === 'string' ? stripInvisibleFormatChars(value).trim() : ''
}

export function normalizeOptionalNumber(value, min, max, integer = false) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n) || n < min || n > max) return null
  return integer ? Math.floor(n) : n
}

export function normalizeReasoningEffort(value) {
  const effort = String(value || '').trim().toLowerCase()
  return REASONING_EFFORTS.has(effort) ? effort : ''
}

export function normalizeModelIdList(rawList) {
  if (!Array.isArray(rawList)) return []
  const seen = new Set()
  const result = []
  for (const item of rawList) {
    const id = String(item || '').trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    result.push(id)
  }
  return result
}

/** @returns {ProviderModel} */
export function normalizeModelEntry(raw, fallbackFormat = API_FORMAT_OPENAI_COMPATIBLE) {
  const entry = isPlainObject(raw) ? raw : {}
  return {
    id: String(entry.id || '').trim() || makeId('cfg'),
    model: cleanText(entry.model),
    name: cleanText(entry.name),
    apiFormat: normalizeApiFormat(entry.apiFormat || fallbackFormat),
    urlOverride: cleanText(entry.urlOverride),
    temperature: normalizeOptionalNumber(entry.temperature, 0, 2),
    maxTokens: normalizeOptionalNumber(entry.maxTokens, 1, MAX_OUTPUT_TOKENS_LIMIT, true),
    reasoningEffort: normalizeReasoningEffort(entry.reasoningEffort),
    customBodyJson: typeof entry.customBodyJson === 'string' ? entry.customBodyJson.trim() : '',
    removeBodyParams: normalizeRemovedRequestParameters(entry.removeBodyParams),
    autoAdaptParameters: entry.autoAdaptParameters !== false,
    cacheConfig: normalizeCacheConfig(entry.cacheConfig)
  }
}

function resolvePresetId(rawPreset, url) {
  const preset = getProviderPreset(rawPreset)
  if (preset) return preset.id
  return findProviderPresetByUrl(url)?.id || CUSTOM_PROVIDER_PRESET_ID
}

/** @returns {ModelProvider} */
export function normalizeProviderEntry(raw, index = 0) {
  const entry = isPlainObject(raw) ? raw : {}
  const url = cleanText(entry.url)
  const preset = resolvePresetId(entry.preset, url)
  const apiFormat = normalizeApiFormat(entry.apiFormat)
  const presetName = preset === CUSTOM_PROVIDER_PRESET_ID ? '' : (getProviderPreset(preset)?.name || '')
  const updatedAt = Number(entry.cachedModelsUpdatedAt)
  return {
    id: String(entry.id || '').trim() || makeId('prv'),
    name: cleanText(entry.name) || presetName || describeProviderHost(url) || `供应商 ${index + 1}`,
    preset,
    url,
    key: normalizeApiKey(entry.key),
    apiFormat,
    customHeadersJson: typeof entry.customHeadersJson === 'string' ? entry.customHeadersJson.trim() : '',
    cachedModels: normalizeModelIdList(entry.cachedModels),
    cachedModelsUpdatedAt: Number.isFinite(updatedAt) && updatedAt > 0 ? updatedAt : null,
    models: (Array.isArray(entry.models) ? entry.models : [])
      .filter(isPlainObject)
      .map(model => normalizeModelEntry(model, apiFormat))
  }
}

/** 规范化供应商列表，并保证供应商 id、模型 id 全局唯一（模型 id 被联系人等引用）。 */
export function normalizeProviders(list) {
  const providerIds = new Set()
  const modelIds = new Set()
  return (Array.isArray(list) ? list : [])
    .filter(isPlainObject)
    .map((raw, index) => {
      const provider = normalizeProviderEntry(raw, index)
      if (providerIds.has(provider.id)) provider.id = makeId('prv')
      providerIds.add(provider.id)
      provider.models.forEach((model) => {
        if (modelIds.has(model.id)) model.id = makeId('cfg')
        modelIds.add(model.id)
      })
      return provider
    })
}

function legacyGroupKey(cfg) {
  const url = String(cfg.url || '').trim().replace(/\/+$/, '').toLowerCase()
  return [url, cfg.key, String(cfg.customHeadersJson || '').trim()].join('\n')
}

/**
 * 旧版扁平“API 配置”→ 供应商。地址、Key、自定义请求头都相同的配置合并成同一个供应商下的多个模型；
 * 模型 id 保持旧配置 id，原配置名在与供应商名不同时保留为模型显示名。
 */
export function migrateConfigsToProviders(configs) {
  const groups = new Map()
  ;(Array.isArray(configs) ? configs : []).filter(isPlainObject).forEach((raw, index) => {
    const cfg = normalizeProviderConfig(raw)
    cfg.id = String(raw.id || '').trim() || (index === 0 ? 'default' : `cfg_legacy_${index}`)
    cfg.url = cleanText(cfg.url)
    const key = legacyGroupKey(cfg)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(cfg)
  })

  const providers = []
  groups.forEach((items) => {
    const first = items[0]
    const preset = findProviderPresetByUrl(first.url)
    const firstName = cleanText(first.name)
    const providerName = (items.length === 1 && !preset && firstName)
      ? firstName
      : (preset?.name || describeProviderHost(first.url) || firstName || 'API')
    const cachedModels = normalizeModelIdList(items.flatMap(item => Array.isArray(item.cachedModels) ? item.cachedModels : []))
    const updatedAt = Math.max(0, ...items.map(item => Number(item.cachedModelsUpdatedAt) || 0))

    providers.push({
      id: `prv_${first.id}`,
      name: providerName,
      preset: preset?.id || CUSTOM_PROVIDER_PRESET_ID,
      url: first.url,
      key: first.key,
      apiFormat: first.apiFormat,
      customHeadersJson: first.customHeadersJson,
      cachedModels,
      cachedModelsUpdatedAt: updatedAt || null,
      models: items.map((item) => {
        const alias = cleanText(item.name)
        const model = cleanText(item.model)
        return {
          ...item,
          name: alias && alias !== providerName && alias !== model ? alias : ''
        }
      })
    })
  })
  return normalizeProviders(providers)
}

export function getModelLabel(model) {
  return cleanText(model?.name) || cleanText(model?.model) || '未命名模型'
}

/** 供应商 + 模型 → 旧版扁平配置形状，请求层与各功能统一消费这个对象。 */
export function resolveModelConfig(provider, model) {
  const modelLabel = getModelLabel(model)
  return {
    id: model.id,
    providerId: provider.id,
    providerName: provider.name,
    modelLabel,
    name: `${provider.name} · ${modelLabel}`,
    url: model.urlOverride || provider.url,
    key: provider.key,
    model: model.model,
    apiFormat: model.apiFormat,
    temperature: model.temperature,
    maxTokens: model.maxTokens,
    reasoningEffort: model.reasoningEffort,
    customHeadersJson: provider.customHeadersJson,
    customBodyJson: model.customBodyJson,
    autoAdaptParameters: model.autoAdaptParameters,
    removeBodyParams: [...model.removeBodyParams],
    cacheConfig: { ...model.cacheConfig }
  }
}

export function flattenProviders(providers) {
  const result = []
  ;(Array.isArray(providers) ? providers : []).forEach((provider) => {
    ;(Array.isArray(provider?.models) ? provider.models : []).forEach((model) => {
      result.push(resolveModelConfig(provider, model))
    })
  })
  return result
}

export function createEmptyResolvedConfig() {
  return {
    id: '',
    providerId: '',
    providerName: '',
    modelLabel: '未配置模型',
    name: '未配置模型',
    url: '',
    key: '',
    model: '',
    apiFormat: API_FORMAT_OPENAI_COMPATIBLE,
    temperature: null,
    maxTokens: null,
    reasoningEffort: '',
    customHeadersJson: '',
    customBodyJson: '',
    autoAdaptParameters: true,
    removeBodyParams: [],
    cacheConfig: createDefaultCacheConfig()
  }
}

/** @returns {ProviderModel} */
export function createModelEntry(modelId, apiFormat, overrides = {}) {
  return normalizeModelEntry({ ...overrides, model: modelId, apiFormat }, apiFormat)
}

/** @returns {ModelProvider} */
export function createProviderFromPreset(presetId, overrides = {}) {
  const preset = getProviderPreset(presetId) || getProviderPreset(CUSTOM_PROVIDER_PRESET_ID)
  return normalizeProviderEntry({
    name: preset.name,
    preset: preset.id,
    url: preset.url,
    apiFormat: preset.apiFormat,
    models: [],
    ...overrides
  })
}
