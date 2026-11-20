import { computed } from 'vue'
import { isMessagePartFavorited } from '../../../utils/messageFavorites'
import { haptic } from '../../../utils/haptic'
import { getUserReaction, toggleUserReaction } from './messageReactions'

// 系统行、线下卡片、智能界面不挂回应
const REACTION_DISABLED_BLOCK_TYPES = new Set(['offlineCard', 'recall', 'smartUI', 'narration', 'timestamp'])

export function useChatContextActions({
  store,
  multiSelectMode,
  showContextMenuBase,
  contextMenuBlockKey,
  contextMenuMsgId,
  contextMenuPartIndex,
  contextMenuPartKey,
  hideContextMenu,
  scheduleSave,
  showCallHistoryModal,
  enterMultiSelect,
  toggleFavorite,
  favoriteSelectedBlocks,
  getSelectedBlocks,
  exitMultiSelect
}) {
  function showContextMenu(event, block) {
    if (multiSelectMode.value) return
    const canReact = !!block?.msgId && !REACTION_DISABLED_BLOCK_TYPES.has(block?.type)
    showContextMenuBase(event, block, { canReact })
  }

  function findContextMessage() {
    const msgId = contextMenuMsgId.value
    const msgs = store.activeChat?.msgs
    if (msgId == null || msgId === '' || !Array.isArray(msgs)) return null
    // 气泡上的 msgId 统一是字符串，旧数据/示例消息的 id 可能是数字
    const target = String(msgId)
    return msgs.find(m => m && String(m.id) === target) || null
  }

  const contextMenuReaction = computed(() => getUserReaction(findContextMessage(), contextMenuPartKey?.value))

  function handleReact(emoji) {
    const msg = findContextMessage()
    if (msg && emoji) {
      toggleUserReaction(msg, contextMenuPartKey?.value, emoji)
      haptic(12)
      scheduleSave?.()
    }
    hideContextMenu()
  }

  function openCallHistoryFromBubble() {
    if (multiSelectMode.value) return
    showCallHistoryModal.value = true
  }

  function handleEnterMultiSelect() {
    enterMultiSelect(contextMenuBlockKey.value)
    hideContextMenu()
  }

  const contextMenuFavorited = computed(() => {
    const msg = findContextMessage()
    return msg ? isMessagePartFavorited(msg, contextMenuPartIndex.value) : false
  })

  function handleFavorite() {
    const msgId = contextMenuMsgId.value
    if (msgId) toggleFavorite(msgId, contextMenuPartIndex.value)
    hideContextMenu()
  }

  function handleFavoriteSelectedBlocks() {
    const targetBlocks = getSelectedBlocks()
    if (favoriteSelectedBlocks(targetBlocks)) {
      exitMultiSelect()
    }
  }

  return {
    showContextMenu,
    openCallHistoryFromBubble,
    handleEnterMultiSelect,
    contextMenuFavorited,
    contextMenuReaction,
    handleFavorite,
    handleFavoriteSelectedBlocks,
    handleReact
  }
}
