import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useStickersStore = defineStore('stickers', () => {
  const stickers = ref([])
  const stickerGroups = ref([])
  const showStickerPanel = ref(false)
  const showStickerManager = ref(false)
  const editingStickerId = ref(null)

  function normalizeStickerName(name) {
    return String(name ?? '').trim().toLowerCase()
  }

  // 消息解析每次重建都会按名字查贴纸，建索引避免 O(消息数 × 贴纸数) 的线性查找；同名时保留第一个
  const stickerUrlIndex = computed(() => {
    const index = new Map()
    for (const sticker of stickers.value) {
      const key = normalizeStickerName(sticker?.name)
      if (key && !index.has(key)) index.set(key, sticker.url)
    }
    return index
  })

  function getStickerUrl(name) {
    const target = normalizeStickerName(name)
    if (!target) return null
    return stickerUrlIndex.value.get(target) ?? null
  }

  return {
    stickers,
    stickerGroups,
    showStickerPanel,
    showStickerManager,
    editingStickerId,
    getStickerUrl
  }
})
