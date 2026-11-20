import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { favoritePartIndexToKey } from '../../../utils/messageFavorites'

export function useChatViewLifecycle(options) {
  const {
    route,
    router,
    store,
    messageListRef,
    messageWindowLimit,
    initialMessageWindow,
    jumpToMessage,
    contextMenuVisible,
    hideContextMenu,
    narrationMenuVisible,
    hideNarrationMenu,
    onQuickSend
  } = options

  let scrollScheduled = false
  let scrollRafId = 0
  const handledRouteJumpKey = ref('')

  function getRouteJumpKey() {
    const contactId = String(route.params.contactId ?? '').trim()
    const msgId = String(route.query.jumpToMsg ?? '').trim()
    const partKey = favoritePartIndexToKey(route.query.jumpToPart)
    if (!contactId || !msgId) return ''
    return `${contactId}:${msgId}:${partKey}`
  }

  function hasUnhandledRouteJump() {
    const jumpKey = getRouteJumpKey()
    return !!jumpKey && handledRouteJumpKey.value !== jumpKey
  }

  function cancelScheduledScroll() {
    scrollScheduled = false
    if (scrollRafId) {
      cancelAnimationFrame(scrollRafId)
      scrollRafId = 0
    }
  }

  function syncActiveChatFromRoute() {
    const contactId = String(route.params.contactId ?? '').trim()
    if (!contactId) return null

    const contact = store.contacts.find(item => String(item?.id ?? '') === contactId) || null
    if (contact && store.activeChat?.id !== contact.id) {
      store.activeChat = contact
    }
    return contact
  }

  function scrollToBottom() {
    if (hasUnhandledRouteJump()) return
    if (scrollScheduled) return
    scrollScheduled = true
    nextTick(() => {
      scrollScheduled = false
      if (scrollRafId) cancelAnimationFrame(scrollRafId)
      scrollRafId = requestAnimationFrame(() => {
        scrollRafId = 0
        messageListRef.value?.scrollToBottom?.()
      })
    })
  }

  function handleDocumentClick() {
    if (contextMenuVisible.value) {
      hideContextMenu()
    }
    if (narrationMenuVisible.value) {
      hideNarrationMenu()
    }
  }

  // 桌面角色卡的快捷回复带着 ?quick= 进来：先把 query 清掉（返回时不会重发），再发出去并请求回复
  async function consumeQuickSend() {
    const text = String(route.query.quick ?? '').trim()
    if (!text || typeof onQuickSend !== 'function') return
    const { quick: _quick, ...rest } = route.query
    await router?.replace({ query: rest })
    onQuickSend(text)
  }

  onMounted(() => {
    document.addEventListener('click', handleDocumentClick)
    void consumeQuickSend()
  })

  watch(() => route.params.contactId, () => {
    syncActiveChatFromRoute()
  }, { immediate: true })

  // 切换联系人或切换同一角色的不同对话（currentThread）都视为换了一条时间线
  watch(() => [store.activeChat?.id, store.activeChat?.currentThread?.id], () => {
    messageWindowLimit.value = initialMessageWindow
  }, { immediate: true })

  watch(() => [store.activeChat?.id, store.activeChat?.currentThread?.id, store.activeChat?.msgs?.length || 0], () => {
    scrollToBottom()
  }, { immediate: true, flush: 'post' })

  watch(
    () => [route.params.contactId, route.query.jumpToMsg, route.query.jumpToPart, store.activeChat?.msgs?.length || 0],
    async ([routeContactId, jumpTarget, jumpPart]) => {
      const contact = syncActiveChatFromRoute()
      const contactId = String(routeContactId ?? '').trim()
      const msgId = String(jumpTarget ?? '').trim()
      const partKey = favoritePartIndexToKey(jumpPart)

      if (!contact || !contactId || !msgId) return
      if (String(contact.id) !== contactId) return

      const msgs = contact.msgs
      if (!Array.isArray(msgs) || !msgs.some(item => String(item?.id ?? '') === msgId)) return

      const jumpKey = getRouteJumpKey()
      if (handledRouteJumpKey.value === jumpKey) return

      cancelScheduledScroll()
      handledRouteJumpKey.value = jumpKey
      await jumpToMessage(msgId, partKey)
    },
    { immediate: true, flush: 'post' }
  )

  onBeforeUnmount(() => {
    document.removeEventListener('click', handleDocumentClick)
    if (scrollRafId) {
      cancelAnimationFrame(scrollRafId)
      scrollRafId = 0
    }
  })

  return {
    scrollToBottom
  }
}
