import { computed } from 'vue'
import { useContactsStore } from '../../../../stores/contacts'
import { useConfigsStore } from '../../../../stores/configs'
import { useLorebookStore } from '../../../../stores/lorebook'
import { usePersonasStore } from '../../../../stores/personas'
import { useSettingsStore } from '../../../../stores/settings'
import { useStickersStore } from '../../../../stores/stickers'
import { useStorage } from '../../../../composables/useStorage'
import { useToast } from '../../../../composables/useToast'
import { showConfirm } from '../../../../composables/useConfirm'
import { isReservedPromptPresetBook } from '../../../../utils/presetPromptBooks'
import { sanitizeMiniMaxVoiceId } from '../../../../utils/minimaxConfig'
import { listAvailableMcpServers, normalizeMcpServerIds } from '../../../../utils/mcpServers'

export const MESSAGE_RETENTION_OPTIONS = Object.freeze([
  { id: 0, title: '不限制' },
  { id: 20, title: '20 条' },
  { id: 50, title: '50 条' },
  { id: 100, title: '100 条' },
  { id: 200, title: '200 条' }
])

function mcpServerSubtitle(server) {
  const disabledSuffix = server?.enabled === false ? ' · 全局已禁用' : ''
  if (server?.source === 'notion') return `Notion${disabledSuffix}`
  if (server?.source === 'direct') return `MCP 直连${disabledSuffix}`
  const transport = server?.transport === 'http' ? 'HTTP' : 'STDIO'
  return `本地桥接 · ${transport}${disabledSuffix}`
}

/**
 * iOS 26 联系人卡片里的就地编辑：每一项改完立即写回联系人并保存，
 * 字段规则与 ContactModal 保持一致。
 * @param {() => object | null} getContact
 */
export function useContactCardEditor(getContact) {
  const contactsStore = useContactsStore()
  const configsStore = useConfigsStore()
  const lorebookStore = useLorebookStore()
  const personasStore = usePersonasStore()
  const settingsStore = useSettingsStore()
  const stickersStore = useStickersStore()
  const { scheduleSave } = useStorage()
  const { showToast } = useToast()

  const contact = computed(() => getContact() || null)

  function findStoredContact() {
    const id = contact.value?.id
    if (!id) return null
    return contactsStore.contacts.find(item => item.id === id) || contact.value
  }

  function update(patch) {
    const target = findStoredContact()
    if (!target) return
    Object.assign(target, patch)
    if (contactsStore.activeChat?.id === target.id && contactsStore.activeChat !== target) {
      Object.assign(contactsStore.activeChat, patch)
    }
    scheduleSave()
  }

  const lorebookOptions = computed(() => (lorebookStore.lorebook?.books || [])
    .filter(book => !isReservedPromptPresetBook(book))
    .map(book => ({ id: book.id, title: book.name || '未命名世界书', icon: book.icon || '📖' })))

  const stickerGroupOptions = computed(() => (stickersStore.stickerGroups || []).map(group => ({
    id: group.id,
    title: group.name || '未命名分组',
    subtitle: `${(stickersStore.stickers || []).filter(sticker => Array.isArray(sticker?.groupIds) && sticker.groupIds.includes(group.id)).length} 张贴纸`,
    icon: '🏷️'
  })))

  const mcpOptions = computed(() => listAvailableMcpServers(settingsStore.toolCallingConfig).map(server => ({
    id: server.id,
    title: server.name || server.id,
    subtitle: mcpServerSubtitle(server),
    icon: '🧰'
  })))

  const personaOptions = computed(() => personasStore.personas.map(persona => ({
    id: persona.id,
    title: persona.name || '未命名面具',
    icon: persona.avatarType === 'image' ? '' : (persona.avatar || '🙂'),
    image: persona.avatarType === 'image' ? persona.avatar : ''
  })))

  const boundLorebookIds = computed(() => {
    const valid = new Set(lorebookOptions.value.map(item => item.id))
    return (Array.isArray(contact.value?.boundLorebooks) ? contact.value.boundLorebooks : []).filter(id => valid.has(id))
  })
  const stickerGroupIds = computed(() => (Array.isArray(contact.value?.stickerGroupIds) ? contact.value.stickerGroupIds : []))
  const mcpServerIds = computed(() => normalizeMcpServerIds(contact.value?.mcpServerIds))

  const summaries = computed(() => {
    const c = contact.value || {}
    const persona = c.personaId ? personasStore.personas.find(item => item.id === c.personaId) : null
    const config = c.configId ? configsStore.getModelConfig?.(c.configId) : null
    const hasVoice = !!(String(c.edgeVoiceId || '').trim() || String(c.minimaxVoiceId || '').trim())
    return {
      model: config?.modelLabel || '跟随默认',
      persona: persona?.name || '全局默认',
      lorebooks: boundLorebookIds.value.length > 0 ? `${boundLorebookIds.value.length} 本` : '未绑定',
      stickers: stickerGroupIds.value.length > 0 ? `${stickerGroupIds.value.length} 组` : '全部',
      mcp: mcpServerIds.value.length > 0 ? `${mcpServerIds.value.length} 个` : '不使用',
      voice: hasVoice ? '自定义' : '默认音色',
      retention: MESSAGE_RETENTION_OPTIONS.find(item => item.id === Number(c.maxMessages || 0))?.title || `${c.maxMessages} 条`
    }
  })

  const defaultModelHint = computed(() => (configsStore.getConfig?.id ? `当前：${configsStore.getConfig.name}` : '尚未设置默认模型'))

  function saveProfile({ name, prompt, avatar, avatarType }) {
    const trimmed = String(name || '').trim()
    if (!trimmed) {
      showToast('请输入名称')
      return false
    }
    update({
      name: trimmed,
      prompt: String(prompt || '').trim(),
      avatar: avatar || '🤖',
      avatarType: avatarType === 'image' ? 'image' : 'emoji'
    })
    showToast('已更新')
    return true
  }

  function saveVoice({ edgeVoiceId, minimaxVoiceId }) {
    update({
      edgeVoiceId: String(edgeVoiceId || '').trim(),
      minimaxVoiceId: sanitizeMiniMaxVoiceId(minimaxVoiceId)
    })
  }

  async function clearHistory() {
    const target = findStoredContact()
    if (!target) return
    const count = Array.isArray(target.msgs) ? target.msgs.length : 0
    const confirmed = await showConfirm({
      message: `确定清空 ${count} 条聊天记录？角色记忆不会随之删除。`,
      destructive: true
    })
    if (!confirmed) return
    update({ msgs: [] })
    showToast('已清空')
  }

  async function deleteContact() {
    const target = findStoredContact()
    if (!target) return false
    const confirmed = await showConfirm({ message: `确定删除「${target.name || '联系人'}」？`, destructive: true })
    if (!confirmed) return false
    if (typeof window === 'undefined' || typeof window.prompt !== 'function') return false
    const input = window.prompt('请输入 delete 以确认删除联系人')
    if (input === null) return false
    if (input.trim() !== 'delete') {
      showToast('输入错误，已取消删除')
      return false
    }
    contactsStore.contacts = contactsStore.contacts.filter(item => item.id !== target.id)
    if (contactsStore.activeChat?.id === target.id) contactsStore.activeChat = null
    scheduleSave()
    showToast('已删除')
    return true
  }

  return {
    update,
    summaries,
    defaultModelHint,
    lorebookOptions,
    stickerGroupOptions,
    mcpOptions,
    personaOptions,
    boundLorebookIds,
    stickerGroupIds,
    mcpServerIds,
    saveProfile,
    saveVoice,
    clearHistory,
    deleteContact
  }
}
