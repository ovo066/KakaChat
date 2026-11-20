/**
 * 右键菜单相关的组合式函数
 */
import { ref } from 'vue'
import { haptic } from '../../../utils/haptic'

const MENU_WIDTH = 200
const MENU_GAP = 8
const MENU_MIN_VISIBLE_HEIGHT = 220
// 回应面板：6 个 tapback + 1 个 emoji 按钮
export const REACTION_BAR_WIDTH = 7 * 39 + 12
const REACTION_BAR_HEIGHT = 48
// 面板和气泡之间留出"思考泡泡"小尾巴的位置
const REACTION_BAR_GAP = 16
const ANIMATION_CLASS_RE = /\b(?:bubble-appear|narration-appear)\b/g

export function useContextMenu() {
  const contextMenuVisible = ref(false)
  const contextMenuX = ref(0)
  const contextMenuY = ref(0)
  const contextMenuMaxHeight = ref(0)
  const contextMenuAnchor = ref('top')
  // Useful for "multi-select" to preselect the exact bubble the user long-pressed.
  const contextMenuBlockKey = ref(null)
  const contextMenuMsgId = ref(null)
  const contextMenuPartIndex = ref(null)
  const contextMenuPartKey = ref('message')
  const contextMenuIsUser = ref(false)
  const contextMenuContent = ref('')
  const contextMenuCanReact = ref(false)
  const reactionBarX = ref(0)
  const reactionBarY = ref(0)
  // 聚焦气泡的位置和内容
  const focusedBubble = ref(null)

  function clamp(value, min, max) {
    if (max < min) return min
    return Math.min(Math.max(value, min), max)
  }

  function getViewportBounds() {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null
    const top = vv ? vv.offsetTop : 0
    const left = vv ? vv.offsetLeft : 0
    const width = vv ? vv.width : window.innerWidth
    const height = vv ? vv.height : window.innerHeight
    return {
      top,
      left,
      right: left + width,
      bottom: top + height
    }
  }

  function showContextMenu(e, block, options = {}) {
    const canReact = options.canReact === true
    contextMenuBlockKey.value = block?.key ?? null
    contextMenuMsgId.value = block.msgId
    contextMenuPartIndex.value = block.partIndex ?? null
    contextMenuPartKey.value = block.msgPartKey || 'message'
    contextMenuIsUser.value = block.isUser
    contextMenuContent.value = block.contextContent
    contextMenuCanReact.value = canReact

    const menuHeight = block.isUser ? 320 : 368
    const viewport = getViewportBounds()
    const safeTop = viewport.top + 10
    const safeBottom = viewport.bottom - 10
    const minX = viewport.left + 10
    const maxX = viewport.right - MENU_WIDTH - 10
    const barSpace = canReact ? REACTION_BAR_HEIGHT + REACTION_BAR_GAP : 0

    const bubbleEl = e.currentTarget
    if (!bubbleEl) {
      focusedBubble.value = null
      contextMenuAnchor.value = 'top'
      contextMenuX.value = clamp(e.clientX, minX, maxX)
      contextMenuY.value = clamp(e.clientY, safeTop, safeBottom - Math.min(menuHeight, MENU_MIN_VISIBLE_HEIGHT))
      contextMenuMaxHeight.value = Math.max(160, safeBottom - contextMenuY.value)
      reactionBarX.value = clamp(e.clientX - REACTION_BAR_WIDTH / 2, viewport.left + 8, viewport.right - REACTION_BAR_WIDTH - 8)
      reactionBarY.value = Math.max(safeTop, e.clientY - barSpace)
      contextMenuVisible.value = true
      haptic()
      return
    }

    const rect = bubbleEl.getBoundingClientRect()
    // iMessage：回应面板在气泡上方、菜单在下方；放不下时把聚焦的气泡整体挪进可视区
    let shift = 0
    const stackTop = rect.top - barSpace
    if (stackTop < safeTop) shift = safeTop - stackTop
    const stackBottom = rect.top + shift + rect.height + MENU_GAP + menuHeight
    if (stackBottom > safeBottom) {
      const roomUp = rect.top + shift - barSpace - safeTop
      shift -= Math.min(stackBottom - safeBottom, Math.max(0, roomUp))
    }
    const bubbleTop = rect.top + shift

    const styles = window.getComputedStyle(bubbleEl)
    focusedBubble.value = {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      shift,
      innerHTML: bubbleEl.innerHTML,
      // 去掉入场动画类，克隆体不要重播
      className: String(bubbleEl.className || '').replace(ANIMATION_CLASS_RE, '').trim(),
      backgroundColor: styles.backgroundColor,
      color: styles.color,
      isUser: block.isUser
    }

    // 菜单：气泡太高时允许压住气泡下部，保证至少露出一屏可滚动的菜单
    const menuX = block.isUser ? rect.left + rect.width - MENU_WIDTH : rect.left
    const preferredTop = bubbleTop + rect.height + MENU_GAP
    const menuTop = Math.min(preferredTop, safeBottom - Math.min(menuHeight, MENU_MIN_VISIBLE_HEIGHT))
    contextMenuAnchor.value = 'top'
    contextMenuX.value = clamp(menuX, minX, maxX)
    contextMenuY.value = Math.max(safeTop, menuTop)
    contextMenuMaxHeight.value = Math.max(160, safeBottom - contextMenuY.value)

    const barX = block.isUser ? rect.left + rect.width - REACTION_BAR_WIDTH + 6 : rect.left - 6
    reactionBarX.value = clamp(barX, viewport.left + 8, viewport.right - REACTION_BAR_WIDTH - 8)
    reactionBarY.value = Math.max(safeTop, bubbleTop - barSpace)

    contextMenuVisible.value = true
    haptic()
  }

  function hideContextMenu() {
    contextMenuVisible.value = false
    contextMenuMaxHeight.value = 0
    contextMenuAnchor.value = 'top'
    contextMenuBlockKey.value = null
    contextMenuCanReact.value = false
    focusedBubble.value = null
  }

  return {
    contextMenuVisible,
    contextMenuX,
    contextMenuY,
    contextMenuMaxHeight,
    contextMenuAnchor,
    contextMenuBlockKey,
    contextMenuMsgId,
    contextMenuPartIndex,
    contextMenuPartKey,
    contextMenuIsUser,
    contextMenuContent,
    contextMenuCanReact,
    reactionBarX,
    reactionBarY,
    focusedBubble,
    showContextMenu,
    hideContextMenu
  }
}
