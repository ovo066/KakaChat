<template>
  <Teleport to="body">
    <Transition name="tapback-panel">
      <div
        v-if="visible"
        class="tapback-emoji-panel no-scrollbar"
        :style="panelStyle"
        role="dialog"
        aria-label="选择表情回应"
        @click.stop
      >
        <template v-if="recent.length > 0">
          <div class="tapback-emoji-title">最近使用</div>
          <div class="tapback-emoji-grid">
            <button
              v-for="emoji in recent"
              :key="'recent-' + emoji"
              type="button"
              class="tapback-emoji-cell"
              :class="{ 'is-active': isCurrent(emoji) }"
              @click="choose(emoji)"
            >{{ emoji }}</button>
          </div>
        </template>
        <div class="tapback-emoji-title">常用表情</div>
        <div class="tapback-emoji-grid">
          <button
            v-for="emoji in EMOJI_CHOICES"
            :key="emoji"
            type="button"
            class="tapback-emoji-cell"
            :class="{ 'is-active': isCurrent(emoji) }"
            @click="choose(emoji)"
          >{{ emoji }}</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { reactionKey } from '../composables/reactionTokens'
import './message-blocks/chatReactions.css'

const RECENT_KEY = 'kk_recent_reactions'
const RECENT_LIMIT = 16
const PANEL_WIDTH = 300
const MENU_WIDTH = 200

const EMOJI_CHOICES = [
  '😂', '🤣', '😭', '🥹', '😍', '🥰', '😘', '😊',
  '😉', '😎', '🤩', '🥳', '😏', '😳', '🥺', '😢',
  '😤', '😡', '🤯', '😱', '🤔', '🫣', '🤭', '🙄',
  '😴', '🤤', '😵‍💫', '🫠', '😇', '🤗', '🙃', '😮‍💨',
  '👍', '👎', '👏', '🙌', '🙏', '🤝', '👌', '✌️',
  '🤞', '🫶', '💪', '👋', '🤙', '👀', '🫡', '🤌',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
  '💔', '💕', '💯', '✨', '🔥', '🎉', '🌹', '☕',
  '🍻', '🐶', '🐱', '🌟', '💤', '💢', '💩', '🤡'
]

const props = defineProps({
  visible: { type: Boolean, default: false },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  maxHeight: { type: Number, default: 0 },
  isUser: { type: Boolean, default: false },
  current: { type: String, default: null }
})

const emit = defineEmits(['select'])

const recent = ref([])

function readRecent() {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
    return Array.isArray(list) ? list.filter(item => typeof item === 'string' && item).slice(0, RECENT_LIMIT) : []
  } catch {
    return []
  }
}

watch(() => props.visible, (visible) => {
  if (visible) recent.value = readRecent()
}, { immediate: true })

// 菜单的位置给 200px 宽，这里更宽：用户气泡右对齐、对方气泡左对齐，再夹在屏幕内
const panelStyle = computed(() => {
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : PANEL_WIDTH
  const preferred = props.isUser ? props.x + MENU_WIDTH - PANEL_WIDTH : props.x
  const left = Math.min(Math.max(8, preferred), Math.max(8, viewportWidth - PANEL_WIDTH - 8))
  const maxHeight = Math.min(Math.max(180, props.maxHeight || 0), 340)
  return { left: `${left}px`, top: `${props.y}px`, maxHeight: `${maxHeight}px` }
})

function isCurrent(emoji) {
  return !!props.current && reactionKey(props.current) === reactionKey(emoji)
}

function choose(emoji) {
  const next = [emoji, ...readRecent().filter(item => reactionKey(item) !== reactionKey(emoji))].slice(0, RECENT_LIMIT)
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    // 存储不可用时只是不记最近使用
  }
  emit('select', emoji)
}
</script>

<style scoped>
.tapback-panel-enter-active {
  transition: opacity 0.18s ease, transform 0.3s cubic-bezier(0.2, 1.2, 0.4, 1);
}

.tapback-panel-leave-active {
  transition: opacity 0.14s ease, transform 0.14s ease;
}

.tapback-panel-enter-from,
.tapback-panel-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.96);
}
</style>
