import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useContactsStore } from './contacts'
import {
  createEmptyResolvedConfig,
  createModelEntry,
  createProviderFromPreset,
  flattenProviders,
  getModelLabel,
  migrateConfigsToProviders,
  normalizeModelEntry,
  normalizeModelIdList,
  normalizeProviders,
  resolveModelConfig
} from './configsModel'

export const useConfigsStore = defineStore('configs', () => {
  const providers = ref([])
  // 全局默认模型（模型条目 id，兼容旧版配置 id）
  const activeConfigId = ref(null)

  // 旧接口：扁平“配置”列表 = 所有供应商下的全部模型；整表写入时按旧格式迁移成供应商
  const configs = computed({
    get: () => flattenProviders(providers.value),
    set: (list) => {
      providers.value = migrateConfigsToProviders(list)
      ensureActiveModel()
    }
  })

  const getConfig = computed(() => {
    return configs.value.find(c => c.id === activeConfigId.value) || configs.value[0] || createEmptyResolvedConfig()
  })

  const providerGroups = computed(() => providers.value
    .map(provider => ({
      provider,
      models: provider.models.map(model => resolveModelConfig(provider, model))
    }))
    .filter(group => group.models.length > 0))

  function findModel(modelId) {
    const id = String(modelId || '')
    if (!id) return null
    for (const provider of providers.value) {
      const model = provider.models.find(m => m.id === id)
      if (model) return { provider, model }
    }
    return null
  }

  function getModelConfig(modelId) {
    const hit = findModel(modelId)
    return hit ? resolveModelConfig(hit.provider, hit.model) : null
  }

  function getProvider(providerId) {
    return providers.value.find(p => p.id === providerId) || null
  }

  function ensureActiveModel() {
    if (findModel(activeConfigId.value)) return
    activeConfigId.value = providers.value.find(p => p.models.length > 0)?.models[0]?.id || null
  }

  function setProviders(list) {
    providers.value = normalizeProviders(list)
    ensureActiveModel()
  }

  function addProvider(presetId, overrides = {}) {
    providers.value.push(createProviderFromPreset(presetId, overrides))
    return providers.value[providers.value.length - 1]
  }

  function removeProvider(providerId) {
    providers.value = providers.value.filter(p => p.id !== providerId)
    ensureActiveModel()
  }

  /**
   * @param {string} providerId
   * @param {string[]} modelIds
   * @param {(modelId: string) => string} [resolveFormat] 默认用供应商的默认协议
   */
  function addModels(providerId, modelIds, resolveFormat) {
    const provider = getProvider(providerId)
    if (!provider) return []
    const existing = new Set(provider.models.map(m => m.model))
    const added = []
    normalizeModelIdList(modelIds).forEach((modelId) => {
      if (existing.has(modelId)) return
      existing.add(modelId)
      const format = typeof resolveFormat === 'function' ? resolveFormat(modelId) : provider.apiFormat
      provider.models.push(createModelEntry(modelId, format))
      added.push(provider.models[provider.models.length - 1])
    })
    ensureActiveModel()
    return added
  }

  /** 复制出同一模型的另一份设置（例如换协议或换参数对比） */
  function duplicateModel(modelId) {
    const hit = findModel(modelId)
    if (!hit) return null
    const index = hit.provider.models.indexOf(hit.model)
    const copy = normalizeModelEntry({
      ...JSON.parse(JSON.stringify(hit.model)),
      id: '',
      name: `${getModelLabel(hit.model)} 副本`
    }, hit.provider.apiFormat)
    hit.provider.models.splice(index + 1, 0, copy)
    return hit.provider.models[index + 1]
  }

  function removeModel(modelId) {
    const hit = findModel(modelId)
    if (!hit) return false
    hit.provider.models = hit.provider.models.filter(m => m.id !== modelId)
    ensureActiveModel()
    return true
  }

  function setDefaultModel(modelId) {
    if (findModel(modelId)) activeConfigId.value = modelId
  }

  /** 存储页单独导入“API 配置”块：兼容新版供应商列表与旧版扁平配置 */
  function importConfigsBlock(data) {
    if (!Array.isArray(data)) return false
    if (data.some(item => Array.isArray(item?.models))) setProviders(data)
    else configs.value = data
    return true
  }

  function getGroupMemberConfig(contact, memberId) {
    const contactsStore = useContactsStore()
    const member = contactsStore.getGroupMember(contact, memberId)
    if (!member || !member.configId) return null
    return configs.value.find(c => c.id === member.configId)
  }

  return {
    providers,
    activeConfigId,
    configs,
    getConfig,
    providerGroups,
    findModel,
    getModelConfig,
    getProvider,
    ensureActiveModel,
    setProviders,
    addProvider,
    removeProvider,
    addModels,
    duplicateModel,
    removeModel,
    setDefaultModel,
    importConfigsBlock,
    getGroupMemberConfig
  }
})
