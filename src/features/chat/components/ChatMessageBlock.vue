<template>
  <div v-if="block.type === 'timestamp'" class="chat-timestamp-row w-full">
    <div class="chat-timestamp">{{ block.text }}</div>
  </div>

  <div
    v-else-if="block.type === 'narration'"
    class="chat-narration-row w-full mb-1 relative"
    :data-msg-id="block.msgId"
    :data-msg-part="block.msgPartKey || 'message'"
    @click="multiSelectMode ? emit('toggle-select', block.key) : null"
  >
    <div v-if="multiSelectMode" class="absolute left-2 top-1/2 -translate-y-1/2 z-[1]">
      <ChatMultiSelectCheckbox :visible="true" :selected="isSelected" />
    </div>
    <div
      class="narration"
      :class="block.animClass"
      @contextmenu.prevent="multiSelectMode ? emit('toggle-select', block.key) : emit('narration-menu', $event, block)"
    >
      {{ block.text }}
    </div>
  </div>

  <ChatRecallBlock
    v-else-if="block.type === 'recall'"
    :block="block"
    :multi-select-mode="multiSelectMode"
    :selected="isSelected"
    @toggle-select="emit('toggle-select', $event)"
    @context-menu="forwardContextMenu"
  />

  <ChatMediaBlock
    v-else-if="isMediaType(block.type)"
    :block="block"
    :multi-select-mode="multiSelectMode"
    :selected="selected"
    :show-chat-avatars="showChatAvatars"
    @toggle-select="emit('toggle-select', $event)"
    @context-menu="forwardContextMenu"
  />

  <ChatImageGroupBlock v-else-if="block.type === 'imageGroup'" v-bind="{ block, multiSelectMode, selected, showChatAvatars }" @toggle-select="emit('toggle-select', $event)" @context-menu="forwardContextMenu" />
  <ChatActionBlock
    v-else-if="isActionType(block.type)"
    :block="block"
    :multi-select-mode="multiSelectMode"
    :selected="selected"
    :show-chat-avatars="showChatAvatars"
    @toggle-select="emit('toggle-select', $event)"
    @context-menu="forwardContextMenu"
    @open-call-history="emit('open-call-history', $event)"
    @accept-transfer="emit('accept-transfer', $event)"
    @reject-transfer="emit('reject-transfer', $event)"
    @accept-gift="emit('accept-gift', $event)"
    @reject-gift="emit('reject-gift', $event)"
    @accept-meet="emit('accept-meet', $event)"
    @reject-meet="emit('reject-meet', $event)"
    @open-transfer-detail="emit('open-transfer-detail', $event)"
  />

  <ChatFileBlock
    v-else-if="block.type === 'file'"
    v-bind="{ block, multiSelectMode, selected, showChatAvatars }"
    @toggle-select="emit('toggle-select', $event)" @context-menu="forwardContextMenu"
  />

  <ChatAgentTraceBlock
    v-else-if="block.type === 'toolLog' || block.type === 'reasoning'"
    :block="block"
    :show-chat-avatars="showChatAvatars"
  />

  <ChatSmartUIBlock
    v-else-if="block.type === 'smartUI'"
    :block="block"
    :multi-select-mode="multiSelectMode"
    :selected="selected"
    :show-chat-avatars="showChatAvatars"
    @toggle-select="emit('toggle-select', $event)"
    @context-menu="forwardContextMenu"
  />

  <div
    v-else-if="block.type === 'offlineCard'"
    class="flex justify-center my-3"
    @contextmenu.prevent="emit('context-menu', $event, block)"
    @touchstart.passive="onOfflineCardTouchStart($event, block)"
    @touchend="clearOfflineCardLongPress"
    @touchcancel="clearOfflineCardLongPress"
    @touchmove="clearOfflineCardLongPress"
  >
    <div class="bg-[var(--card-bg)] rounded-[12px] border border-[var(--border-color)] px-4 py-3 max-w-[80%] shadow-sm w-full">
      <div class="flex items-center justify-between gap-2 mb-1.5">
        <div class="flex items-center gap-2 min-w-0">
          <i class="ph ph-book-open text-[var(--primary-color)] text-lg"></i>
          <span class="text-[13px] font-medium text-[var(--text-primary)]">线下剧情</span>
        </div>
        <button
          class="offline-card-delete-btn"
          title="删除线下卡片"
          @touchstart.stop
          @click.stop="emit('delete-offline-card', block)"
        >
          <i class="ph ph-trash"></i>
        </button>
      </div>
      <div class="text-[12px] text-[var(--text-secondary)] mb-1">{{ block.summary }}</div>
      <div class="text-[10px] text-[var(--text-secondary)] opacity-60">
        {{ formatOfflineTime(block.startTime) }} - {{ formatOfflineTime(block.endTime) }}
      </div>
    </div>
  </div>

  <ChatBubbleBlock
    v-else-if="block.type === 'bubble'"
    :block="block"
    :multi-select-mode="multiSelectMode"
    :selected="selected"
    :show-chat-avatars="showChatAvatars"
    @toggle-select="emit('toggle-select', $event)"
    @context-menu="forwardContextMenu"
  />
</template>

<script setup>
import { computed, defineAsyncComponent, onBeforeUnmount, ref } from 'vue'
import ChatAgentTraceBlock from './message-blocks/ChatAgentTraceBlock.vue'
import ChatActionBlock from './message-blocks/ChatActionBlock.vue'
import ChatBubbleBlock from './message-blocks/ChatBubbleBlock.vue'
import ChatFileBlock from './message-blocks/ChatFileBlock.vue'
import ChatImageGroupBlock from './message-blocks/ChatImageGroupBlock.vue'
import ChatMediaBlock from './message-blocks/ChatMediaBlock.vue'
import ChatMultiSelectCheckbox from './message-blocks/ChatMultiSelectCheckbox.vue'
import ChatRecallBlock from './message-blocks/ChatRecallBlock.vue'
// 智能界面渲染器体积较大，只在聊天里真正出现 <ui> 时才加载
const ChatSmartUIBlock = defineAsyncComponent(() => import('./message-blocks/ChatSmartUIBlock.vue'))
import { formatBeijingLocale } from '../../../utils/beijingTime'
import './ChatMessageBlock.css'

const MEDIA_BLOCK_TYPES = Object.freeze(['image', 'mockImage', 'imageRendering', 'stickerMessage', 'sticker'])
const ACTION_BLOCK_TYPES = Object.freeze(['transfer', 'gift', 'meet', 'voice', 'call', 'callRecord', 'music'])

const props = defineProps({
  block: { type: Object, required: true },
  multiSelectMode: { type: Boolean, default: false },
  selected: { type: Boolean, default: false },
  showChatAvatars: { type: Boolean, default: false }
})

const emit = defineEmits([
  'toggle-select',
  'context-menu',
  'narration-menu',
  'open-call-history',
  'delete-offline-card',
  'accept-transfer',
  'reject-transfer',
  'accept-gift',
  'reject-gift',
  'accept-meet',
  'reject-meet',
  'open-transfer-detail'
])

const isSelected = computed(() => props.multiSelectMode && props.selected)
const offlineCardLongPressTimer = ref(null)

function isMediaType(type) {
  return MEDIA_BLOCK_TYPES.includes(type)
}

function isActionType(type) {
  return ACTION_BLOCK_TYPES.includes(type)
}

function forwardContextMenu(event, block) {
  emit('context-menu', event, block)
}

function clearOfflineCardLongPress() {
  if (!offlineCardLongPressTimer.value) return
  clearTimeout(offlineCardLongPressTimer.value)
  offlineCardLongPressTimer.value = null
}

function onOfflineCardTouchStart(event, block) {
  if (props.multiSelectMode) return

  clearOfflineCardLongPress()

  const touch = event?.touches?.[0]
  if (!touch) return

  offlineCardLongPressTimer.value = setTimeout(() => {
    emit('context-menu', {
      currentTarget: event.currentTarget,
      clientX: touch.clientX,
      clientY: touch.clientY
    }, block)
    clearOfflineCardLongPress()
  }, 430)
}

function formatOfflineTime(ts) {
  if (!ts) return ''
  return formatBeijingLocale(new Date(ts), {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onBeforeUnmount(() => {
  clearOfflineCardLongPress()
})
</script>
