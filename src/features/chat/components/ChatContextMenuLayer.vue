<template>
  <Teleport to="body">
    <Transition name="focus-overlay">
      <div
        v-if="visible"
        class="fixed inset-0 z-[1000] bg-black/30 backdrop-blur-[2px] transition-all duration-200"
        @click="$emit('hide')"
      ></div>
    </Transition>
  </Teleport>

  <Teleport to="body">
    <div
      v-if="visible && focusedBubble"
      class="fixed z-[1001] pointer-events-none focused-bubble-wrapper"
      :style="{
        top: focusedBubble.top + 'px',
        left: focusedBubble.left + 'px',
        '--focus-lift': (focusedBubble.shift || 0) + 'px'
      }"
    >
      <div :class="focusedBubble.className" v-html="focusedBubble.innerHTML"></div>
    </div>
  </Teleport>

  <!-- iMessage：长按时回应面板浮在气泡上方 -->
  <ChatReactionPicker
    :visible="visible && !!reactionMenu?.canReact"
    :x="reactionMenu?.x || 0"
    :y="reactionMenu?.y || 0"
    :is-user="isUser"
    :current="reactionMenu?.current || null"
    :picking-emoji="pickingEmoji"
    @react="$emit('react', $event)"
    @more="pickingEmoji = !pickingEmoji"
  />

  <ChatReactionEmojiPanel
    :visible="visible && pickingEmoji"
    :x="x"
    :y="y"
    :max-height="maxHeight"
    :is-user="isUser"
    :current="reactionMenu?.current || null"
    @select="$emit('react', $event)"
  />

  <ContextMenu
    :visible="visible && !pickingEmoji"
    :x="x"
    :y="y"
    :max-height="maxHeight"
    :anchor="anchor"
    :is-user="isUser"
    :favorited="favorited"
    @reply="$emit('reply')"
    @copy="$emit('copy')"
    @edit="$emit('edit')"
    @regen="$emit('regen')"
    @delete="$emit('delete')"
    @multi-select="$emit('multi-select')"
    @favorite="$emit('favorite')"
  />
</template>

<script setup>
import { ref, watch } from 'vue'
import ContextMenu from './ContextMenu.vue'
import ChatReactionEmojiPanel from './ChatReactionEmojiPanel.vue'
import ChatReactionPicker from './ChatReactionPicker.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  maxHeight: { type: Number, default: 0 },
  anchor: { type: String, default: 'top' },
  isUser: { type: Boolean, default: false },
  favorited: { type: Boolean, default: false },
  focusedBubble: { type: Object, default: null },
  reactionMenu: { type: Object, default: null }
})

defineEmits(['hide', 'reply', 'copy', 'edit', 'regen', 'delete', 'multi-select', 'favorite', 'react'])

// 点「+」后用 emoji 面板替换菜单，菜单关闭时复位
const pickingEmoji = ref(false)
watch(() => props.visible, (visible) => {
  if (!visible) pickingEmoji.value = false
})
</script>

<style>
/* 聚焦气泡克隆 - 隐藏小尾巴的伪元素 */
.focused-bubble-wrapper .bubble::before,
.focused-bubble-wrapper .bubble::after {
  display: none !important;
}
.focused-bubble-wrapper .bubble {
  border-radius: var(--bubble-radius, 18px) !important;
  filter: drop-shadow(0 10px 30px rgba(0, 0, 0, 0.4));
  transform: scale(1.02);
}
/* 回应面板/菜单放不下时，克隆气泡和系统一样平滑挪进可视区 */
.focused-bubble-wrapper {
  animation: focused-bubble-lift 0.36s cubic-bezier(0.2, 1.15, 0.4, 1) forwards;
}
.focused-bubble-wrapper .chat-emoji-jumbo {
  filter: drop-shadow(0 10px 24px rgba(0, 0, 0, 0.28));
  transform: scale(1.06);
}
@keyframes focused-bubble-lift {
  from { transform: translateY(0); }
  to { transform: translateY(var(--focus-lift, 0px)); }
}
</style>

<style scoped>
.focus-overlay-enter-active,
.focus-overlay-leave-active {
  transition: opacity 0.25s ease;
}
.focus-overlay-enter-from,
.focus-overlay-leave-to {
  opacity: 0;
}
</style>
