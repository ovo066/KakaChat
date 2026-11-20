/**
 * 贴纸预热：进入聊天后趁空闲
 * 1) 预取贴纸面板的代码块，第一次打开面板不再等网络；
 * 2) 低优先级预载角色可用的贴纸和面板首屏贴纸，AI 发贴纸/打开面板时直接命中浏览器缓存。
 * 本地导入的贴纸是 blob/data 地址，本来就秒开，不参与预热。
 */
import { onBeforeUnmount, onMounted } from 'vue'
import { useContactsStore } from '../../../stores/contacts'
import { filterStickersByGroupIds, sanitizeStickerGroupSelection } from '../../../utils/stickerGroups'

const MAX_WARM_PER_CHAT = 48
const PANEL_FIRST_SCREEN = 32
const CONCURRENCY = 3
const warmedUrls = new Set()
let panelChunkRequested = false

function isRemoteUrl(url) {
  return /^https?:\/\//i.test(String(url || '').trim())
}

function isConstrainedNetwork() {
  const connection = typeof navigator !== 'undefined' ? navigator.connection : null
  if (!connection) return false
  return !!connection.saveData || /(^|-)2g$/.test(String(connection.effectiveType || ''))
}

function runWhenIdle(callback, timeout = 1500) {
  if (typeof window === 'undefined') return () => {}
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(callback, { timeout })
    return () => window.cancelIdleCallback?.(id)
  }
  const id = window.setTimeout(callback, 400)
  return () => window.clearTimeout(id)
}

function preloadImage(url) {
  return new Promise((resolve) => {
    const img = new Image()
    img.decoding = 'async'
    if ('fetchPriority' in img) img.fetchPriority = 'low'
    img.onload = img.onerror = () => resolve()
    img.src = url
  })
}

/**
 * @param {{ stickers: Array, stickerGroups: Array, contact?: object | null }} input
 * @returns {string[]}
 */
export function pickStickerWarmupUrls({ stickers, stickerGroups, contact }) {
  const list = Array.isArray(stickers) ? stickers : []
  const groups = Array.isArray(stickerGroups) ? stickerGroups : []
  const allowedGroupIds = sanitizeStickerGroupSelection(contact?.stickerGroupIds, groups)
  const aiScoped = allowedGroupIds.length > 0 ? filterStickersByGroupIds(list, allowedGroupIds) : list

  const urls = []
  const seen = new Set()
  const push = (sticker) => {
    const url = String(sticker?.url || '').trim()
    if (!isRemoteUrl(url) || seen.has(url) || warmedUrls.has(url)) return
    seen.add(url)
    urls.push(url)
  }
  list.slice(0, PANEL_FIRST_SCREEN).forEach(push)
  aiScoped.forEach(push)
  return urls.slice(0, MAX_WARM_PER_CHAT)
}

/**
 * @param {{ getStickers: () => Array, getStickerGroups: () => Array, loadPanel?: () => Promise<unknown> }} options
 */
export function useStickerWarmup({ getStickers, getStickerGroups, loadPanel }) {
  const contactsStore = useContactsStore()
  let cancelIdle = () => {}
  let stopped = false

  async function warm() {
    if (!panelChunkRequested && typeof loadPanel === 'function') {
      panelChunkRequested = true
      loadPanel().catch(() => { panelChunkRequested = false })
    }
    if (isConstrainedNetwork()) return

    const queue = pickStickerWarmupUrls({
      stickers: getStickers(),
      stickerGroups: getStickerGroups(),
      contact: contactsStore.activeChat
    })
    const worker = async () => {
      while (!stopped && queue.length > 0) {
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
        const url = queue.shift()
        warmedUrls.add(url)
        await preloadImage(url)
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  }

  onMounted(() => {
    cancelIdle = runWhenIdle(() => { void warm() })
  })

  onBeforeUnmount(() => {
    stopped = true
    cancelIdle()
  })
}
