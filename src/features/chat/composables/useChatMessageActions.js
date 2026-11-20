import { computed, getCurrentInstance, onBeforeUnmount, ref } from 'vue'
import { useSoundEffects } from '../../../composables/useSoundEffects'
import { provideSmartUIHost } from '../smartUI/host'

export function useChatMessageActions({
  albumStore,
  callAPI,
  callGroupAPI,
  checkAssistantCallInvite,
  cleanupOfflineLinksForRemovedMessages,
  closePlusMenu,
  contextMenuContent,
  contextMenuMsgId,
  contextMenuPartIndex,
  hideContextMenu,
  invalidateRoundVectors,
  isGroupChat,
  makeId,
  onAcceptedMeet,
  onAssistantReplied,
  onMessageSent,
  parseMessageContent,
  processAssistantFavoriteTokens,
  processAssistantPlannerActions,
  processAssistantImageTokens,
  rerollImageMessage,
  rebuildMessageContent,
  scheduleSave,
  scrollToBottom,
  showConfirm,
  showToast,
  store
}) {
  const inputText = ref('')
  const editingPartIndex = ref(null)
  // 编辑弹窗的草稿，独立于主输入框，避免打开编辑时覆盖正在输入的内容
  const editDraft = ref('')
  const soundEffects = useSoundEffects()
  const assistantReplyInFlight = ref(0)

  function cancelReply() {
    store.replyingToId = null
    store.replyingToText = null
  }

  function cancelEdit() {
    store.editingMsgId = null
    editingPartIndex.value = null
    editDraft.value = ''
  }

  // 编辑状态存在全局 store，而草稿/partIndex 是组件级的；
  // 离开聊天页时必须一并清掉，否则重进任意聊天会弹出空白编辑弹窗
  if (getCurrentInstance()) {
    onBeforeUnmount(() => {
      cancelEdit()
    })
  }

  function saveEdit(text) {
    const txt = String(text ?? '').trim()
    if (!txt || !store.editingMsgId || !store.activeChat) return
    const msg = store.activeChat.msgs.find(m => m.id === store.editingMsgId)
    if (msg) {
      if (editingPartIndex.value !== null && editingPartIndex.value !== undefined) {
        const baseContent = msg.displayContent != null ? msg.displayContent : msg.content
        const parts = parseMessageContent(String(baseContent ?? ''), true)
        if (editingPartIndex.value < parts.length) {
          const part = parts[editingPartIndex.value]
          if (part.type === 'narration') {
            part.content = txt
          } else if (part.type === 'sticker') {
            const stickerMatch = txt.match(/^(?:\(|（|\[|【)\s*(?:stickers?|sticker|表情包|贴纸)\s*[:：]\s*([^\)\]）】]+?)\s*(?:\)|）|\]|】)$/i)
            if (stickerMatch) {
              part.name = stickerMatch[1].trim()
            } else {
              part.type = 'normal'
              part.content = txt
              delete part.name
            }
          } else if (part.type === 'mockImage') {
            const mockMatch = txt.match(/^(?:\(|（|\[|【)\s*(?:camera|相机|mockimage|mock|模拟图片)\s*[:：]\s*([^\)\]）】]+?)\s*(?:\)|）|\]|】)$/i)
            if (mockMatch) {
              part.text = mockMatch[1].trim()
            } else {
              part.text = txt
            }
          } else {
            part.content = txt
          }
          const newContent = rebuildMessageContent(parts)
          msg.content = newContent
          if (msg.displayContent != null) {
            msg.displayContent = newContent
          }
          delete msg.giftPartSnapshots
        } else {
          msg.content = txt
          if (msg.displayContent != null) {
            msg.displayContent = txt
          }
          delete msg.giftPartSnapshots
        }
      } else {
        msg.content = txt
        if (msg.isMockImage) {
          msg.mockImageText = txt
        }
        if (msg.displayContent != null) {
          msg.displayContent = txt
        }
        delete msg.giftPartSnapshots
      }
    }
    cancelEdit()
    invalidateRoundVectors?.(store.activeChat)
    scheduleSave()
  }

  function setAssistantPendingState() {
    if (!store?.ui) return
    store.ui.isTyping = true
    store.ui.isThinking = false
  }

  function clearAssistantPendingState() {
    if (!store?.ui) return
    store.ui.isTyping = false
    store.ui.isThinking = false
  }

  function waitForNextPaint() {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(() => resolve())
        return
      }
      setTimeout(resolve, 0)
    })
  }

  async function requestAssistantReply(options = {}) {
    if (!store.activeChat) return
    assistantReplyInFlight.value += 1
    try {
      await runAssistantReply(options)
    } finally {
      assistantReplyInFlight.value = Math.max(0, assistantReplyInFlight.value - 1)
    }
  }

  async function runAssistantReply(options = {}) {
    const pendingStateAlreadySet = options.pendingStateAlreadySet === true
    const contact = store.activeChat
    if (!pendingStateAlreadySet) {
      setAssistantPendingState()
    }
    const previousMsgIds = new Set((contact.msgs || []).map(msg => msg?.id))
    let result = null

    try {
      if (isGroupChat.value) {
        if (store.activeChat.groupMode === 'multi' && !store.selectedMemberId) {
          clearAssistantPendingState()
          showToast('请先选择发言成员')
          return
        }
        result = await callGroupAPI(() => scrollToBottom())
      } else {
        result = await callAPI(() => scrollToBottom())
      }
    } catch (error) {
      clearAssistantPendingState()
      throw error
    }

    if (result?.success === false) {
      clearAssistantPendingState()
    }

    if (result && result.success === false && result.error) {
      showToast(result.error)
    }

    if (!result || result.success !== false) {
      await processAssistantFavoriteTokens?.(contact, result?.message)
      await processAssistantPlannerActions?.(contact, previousMsgIds)
      await processAssistantImageTokens(contact, previousMsgIds)
    }

    // 统一检测来电邀请（从消息队列中检测，不依赖 result.message）
    await checkAssistantCallInvite(contact)

    scheduleSave()
    if (result?.acceptedMeet && typeof onAcceptedMeet === 'function') {
      onAcceptedMeet(contact)
    }

    // AI 自主触发记忆/自动总结（后台执行，不阻塞 UI）
    void onAssistantReplied(contact, scheduleSave).then((res) => {
      const added = res?.autoMemories?.added?.length || 0
      const notify = contact?.memorySettings?.aiAutoMemoryNotify !== false
      if (!notify) return

      if (added === 1) {
        const mem = res.autoMemories.added[0]
        if (mem?.content) {
          const preview = mem.content.slice(0, 20) + (mem.content.length > 20 ? '...' : '')
          showToast('AI 建议记忆: ' + preview)
        }
        return
      }
      if (added > 1) {
        showToast(`AI 建议了 ${added} 条待整理记忆`)
        return
      }
    }).catch(() => {
      // silent
    })
  }

  function scheduleSaveForInputFlow() {
    const keyboardOpen = typeof document !== 'undefined' &&
      document.documentElement.classList.contains('keyboard-open')
    if (keyboardOpen) {
      window.setTimeout(() => {
        scheduleSave()
      }, 220)
      return
    }
    scheduleSave()
  }

  function isSingleImageRegenTarget(message) {
    if (!message || message.role === 'user') return false
    const imageSource = String(message.imageSource || '').trim().toLowerCase()
    return !!(
      message.isImage ||
      message.isImageRendering ||
      message.generatedByAIImage === true ||
      imageSource === 'ai-generated' ||
      imageSource === 'ai_generated' ||
      (typeof message.imagePrompt === 'string' && message.imagePrompt.trim()) ||
      (typeof message.imageSceneTags === 'string' && message.imageSceneTags.trim())
    )
  }

  async function sendMessage() {
    const txt = inputText.value.trim()
    closePlusMenu()
    if (!store.activeChat) return

    const hasImages = store.pendingImages.length > 0

    if (txt || hasImages) {
      inputText.value = ''

      if (hasImages) {
        const imgTime = Date.now()
        store.pendingImages.forEach((img) => {
          store.activeChat.msgs.push({
            id: makeId('msg'),
            role: 'user',
            content: '[图片]',
            time: imgTime,
            readStatus: 'unread',
            isImage: true,
            imageUrl: img
          })
          albumStore.addPhoto({
            url: img,
            contactId: store.activeChat.id,
            contactName: store.activeChat.name,
            contactAvatar: store.activeChat.avatar || null,
            source: 'chat'
          })
        })
        store.pendingImages = []
      }

      if (txt) {
        const newMsg = { id: makeId('msg'), role: 'user', content: txt, time: Date.now(), readStatus: 'unread' }
        if (store.replyingToId) {
          newMsg.replyTo = store.replyingToId
          newMsg.replyToText = store.replyingToText
          cancelReply()
        }
        store.activeChat.msgs.push(newMsg)
        store.ui.animateMsgId = newMsg.id

        // 记忆触发放到后台，避免与键盘动画抢主线程。
        void onMessageSent(store.activeChat, txt, scheduleSave).then((memResult) => {
          if (memResult?.type === 'keyword' && memResult.memory?.content) {
            const content = memResult.memory.content
            showToast('已记住: ' + content.slice(0, 20) + (content.length > 20 ? '...' : ''))
          }
        }).catch(() => {})
      }

      scheduleSaveForInputFlow()
      soundEffects.playEvent('messageSend')
    } else {
      // 先让按钮按下态和打字指示器有机会绘制，再启动较重的 AI 前置准备。
      setAssistantPendingState()
      await waitForNextPaint()
      await requestAssistantReply({ pendingStateAlreadySet: true })
    }
  }

  // 以用户身份发出这句话，并立刻请求角色回应（智能界面的 send 按钮、桌面角色卡的快捷回复）
  async function sendAndRequestReply(text, extra = {}) {
    const txt = String(text ?? '').trim().slice(0, 2000)
    if (!txt || !store.activeChat || assistantReplyInFlight.value > 0) return false
    if (isGroupChat.value && store.activeChat.groupMode === 'multi' && !store.selectedMemberId) {
      showToast('请先选择发言成员')
      return false
    }

    const newMsg = { id: makeId('msg'), role: 'user', content: txt, time: Date.now(), readStatus: 'unread', ...extra }
    store.activeChat.msgs.push(newMsg)
    store.ui.animateMsgId = newMsg.id
    void onMessageSent(store.activeChat, txt, scheduleSave).catch(() => {})
    soundEffects.playEvent('messageSend')
    scheduleSave()
    scrollToBottom?.()

    setAssistantPendingState()
    await waitForNextPaint()
    try {
      await requestAssistantReply({ pendingStateAlreadySet: true })
    } catch (error) {
      showToast(error?.message || '回复失败')
    }
    return true
  }

  function sendFromSmartUI(text) {
    return sendAndRequestReply(text, { fromSmartUI: true })
  }

  if (getCurrentInstance()) {
    provideSmartUIHost({
      store,
      scheduleSave,
      send: sendFromSmartUI,
      canSend: computed(() => assistantReplyInFlight.value === 0 && !store.ui?.isTyping && !store.ui?.isThinking)
    })
  }

  function handleReply() {
    store.replyingToId = contextMenuMsgId.value
    store.replyingToText = contextMenuContent.value
    hideContextMenu()
  }

  function handleCopy() {
    if (contextMenuContent.value) {
      navigator.clipboard.writeText(contextMenuContent.value).then(() => showToast('已复制'))
    }
    hideContextMenu()
  }

  function handleEdit() {
    store.editingMsgId = contextMenuMsgId.value
    editingPartIndex.value = contextMenuPartIndex.value
    editDraft.value = contextMenuContent.value || ''
    hideContextMenu()
  }

  async function handleRegen() {
    const idx = store.activeChat.msgs.findIndex(m => m.id === contextMenuMsgId.value)
    if (idx === -1) {
      hideContextMenu()
      return
    }

    hideContextMenu()
    const targetMessage = store.activeChat.msgs[idx]

    if (isSingleImageRegenTarget(targetMessage)) {
      const rerolled = await rerollImageMessage?.(store.activeChat, contextMenuMsgId.value)
      if (rerolled) {
        scheduleSave()
      } else {
        showToast('这张图片缺少重roll信息，暂时无法单独重试')
      }
      return
    }

    store.activeChat.msgs = store.activeChat.msgs.slice(0, idx)
    invalidateRoundVectors?.(store.activeChat)
    scheduleSave()
    setAssistantPendingState()
    await waitForNextPaint()
    await requestAssistantReply({ pendingStateAlreadySet: true })
  }

  async function handleDelete() {
    const confirmed = await showConfirm({ message: '确定删除?', destructive: true })
    if (!confirmed) {
      hideContextMenu()
      return
    }
    const removed = store.activeChat.msgs.find(m => m.id === contextMenuMsgId.value)
    store.activeChat.msgs = store.activeChat.msgs.filter(m => m.id !== contextMenuMsgId.value)
    if (removed) cleanupOfflineLinksForRemovedMessages([removed])
    invalidateRoundVectors?.(store.activeChat)
    scheduleSave()
    hideContextMenu()
    showToast('已删除')
  }

  async function handleDeleteOfflineCard(block) {
    const msgId = String(block?.msgId || '').trim()
    if (!msgId || !store.activeChat?.msgs) return
    const confirmed = await showConfirm({
      message: '删除线下卡片，并取消对应注入总结？',
      destructive: true
    })
    if (!confirmed) return

    const removed = store.activeChat.msgs.find(m => m.id === msgId)
    if (!removed) return
    store.activeChat.msgs = store.activeChat.msgs.filter(m => m.id !== msgId)
    cleanupOfflineLinksForRemovedMessages([removed])
    invalidateRoundVectors?.(store.activeChat)
    scheduleSave()
    showToast('线下卡片已删除')
  }

  return {
    cancelEdit,
    cancelReply,
    editDraft,
    editingPartIndex,
    handleCopy,
    handleDelete,
    handleDeleteOfflineCard,
    handleEdit,
    handleRegen,
    handleReply,
    inputText,
    requestAssistantReply,
    saveEdit,
    sendAndRequestReply,
    sendMessage
  }
}
