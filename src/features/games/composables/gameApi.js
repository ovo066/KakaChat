import { useConfigsStore } from '../../../stores/configs'
import { requestNonStreamingChatText } from '../../../composables/api/nonStreamingChat'
import { getTemplateVars, applyTemplateVars } from '../../../composables/api/prompts'
import { usePersonasStore } from '../../../stores/personas'

/** 解析模型配置：优先角色自己的，其次当前激活的。 */
export function resolveGameConfig(configId) {
  const configsStore = useConfigsStore()
  const list = Array.isArray(configsStore.configs) ? configsStore.configs : []
  return (configId && list.find(c => c.id === configId)) || configsStore.getConfig || null
}

/**
 * 非流式单次调用。走统一的 provider 封装，温度/思考/去除参数全部遵循模型配置，
 * 不在游戏里另设温度（Claude 开思考只认 1、部分模型不收温度，硬塞会报错）。
 * @param {any} cfg
 * @param {Array<{role:string, content:string}>} messages
 * @param {{ maxTokens?: number }} [opts]
 * @returns {Promise<string>}
 */
export async function requestGameCompletion(cfg, messages, opts = {}) {
  if (!cfg || !cfg.url || !cfg.model) throw new Error('未配置 API：请先在设置里添加模型')
  let result
  try {
    result = await requestNonStreamingChatText(cfg, messages, { maxTokens: opts.maxTokens })
  } catch (e) {
    throw new Error(`API 返回错误：${e?.message || e}`)
  }
  return String(result?.content || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
}

/** 从模型输出里抠出第一个 JSON 对象。 */
export function extractJson(text) {
  const raw = String(text || '').replace(/<think>[\s\S]*?<\/think>/gi, '')
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const src = fenced ? fenced[1] : raw
  const start = src.indexOf('{')
  const end = src.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    return JSON.parse(src.slice(start, end + 1))
  } catch {
    return null
  }
}

/** 角色的人设提示词（用于让联系人以自己的身份参与游戏）。 */
export function buildContactPersona(contact) {
  const personasStore = usePersonasStore()
  const store = {
    activeChat: contact,
    getPersonaForContact: id => personasStore.getPersonaForContact(id)
  }
  const vars = getTemplateVars(store, contact.name)
  return {
    vars,
    prompt: applyTemplateVars(contact.prompt || `你是${contact.name}。`, vars)
  }
}

/** 头像：图片或首字。 */
export function contactAvatar(contact) {
  if (!contact) return { kind: 'text', value: '?' }
  if (contact.avatarType === 'image' && contact.avatar) return { kind: 'image', value: contact.avatar }
  const raw = String(contact.avatar || '').trim()
  if (raw && raw.length <= 2) return { kind: 'text', value: raw }
  return { kind: 'text', value: Array.from(String(contact.name || 'TA'))[0] || 'TA' }
}
