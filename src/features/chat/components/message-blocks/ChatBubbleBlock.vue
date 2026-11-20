<template>
  <div
    :class="[
      'chat-message-row',
      block.isUser ? 'chat-message-user' : 'chat-message-ai',
      wrapClass(block),
      { 'chat-row-has-reactions': hasReactions }
    ]"
    :data-msg-id="block.msgId"
    :data-msg-part="block.msgPartKey || 'message'"
    @click="handleRootClick"
  >
    <ChatMultiSelectCheckbox :visible="multiSelectMode" :selected="isSelected" />

    <div
      class="avatar-slot avatar-left shrink-0 mr-2 self-end"
      :class="{
        'avatar-visible': !block.isUser && block.showAvatar,
        'avatar-placeholder': !block.isUser && !block.showAvatar && (block.isGroupChat || showChatAvatars)
      }"
    >
      <div class="chat-avatar chat-avatar-ai w-8 h-8 rounded-full chat-avatar-bg flex items-center justify-center text-sm overflow-hidden">
        <img v-if="block.senderAvatarType === 'image'" :src="block.senderAvatar" class="w-full h-full object-cover">
        <span v-else>{{ block.isUser ? (block.senderAvatar || '😊') : (block.senderAvatar || '🤖') }}</span>
      </div>
    </div>

    <div class="chat-bubble-wrapper flex flex-col max-w-[75%]" :class="block.isUser ? 'items-end' : 'items-start'">
      <div v-if="block.senderName" class="chat-sender-name text-[12px] mb-1 ml-3">{{ block.senderName }}</div>
      <!-- iMessage 式引用：气泡上方缩小的描边气泡 + 连接线，点按跳到原消息 -->
      <div
        v-if="block.replyText"
        class="reply-context"
        :class="[block.replyFromUser ? 'is-from-user' : 'is-from-ai', { 'is-before-jumbo': isJumbo, 'is-linked': !!block.replyToMsgId }]"
        @click="handleQuoteClick"
      >
        <span class="reply-context-text">{{ block.replyText }}</span>
      </div>
      <div class="flex items-center gap-1" :class="block.isUser ? 'flex-row-reverse' : ''">
        <div v-if="block.fromOffline" class="w-0.5 h-full rounded-full bg-[var(--primary-color)] opacity-30 shrink-0"></div>
        <div class="chat-reaction-anchor">
          <!-- 纯 emoji（1~3 个）：放大、去掉气泡，新消息带入场动画，点按再播一次 -->
          <div
            v-if="isJumbo"
            class="chat-emoji-jumbo"
            :class="[`is-count-${block.jumboEmoji}`, block.isUser ? 'is-user' : 'is-ai', block.animClass]"
            @contextmenu.prevent="emit('context-menu', $event, block)"
            @click="handleEmojiTap"
          >
            <span class="chat-emoji-jumbo-pop" :class="{ 'is-entering': entering }">
              <span :key="emojiPlayKey" class="chat-emoji-jumbo-glyph" :class="emojiAnimClass">{{ jumboText }}</span>
            </span>
            <span
              v-for="particle in particles"
              :key="particle.id"
              class="chat-emoji-particle"
              :style="particle.style"
              aria-hidden="true"
            >{{ particle.glyph }}</span>
          </div>
          <div
            v-else
            class="bubble"
            :class="[block.bubbleClass, block.animClass]"
            @contextmenu.prevent="emit('context-menu', $event, block)"
            @dblclick="handleDoubleTap"
          >
            <template v-if="block.imageUrl">
              <img :src="block.imageUrl" class="bubble-image max-w-[220px] rounded-[12px]">
              <div v-if="block.text && block.text !== '[图片]'" class="bubble-caption mt-2 text-[15px]">{{ block.text }}</div>
            </template>
            <span v-else class="bubble-text" v-html="renderText(block.text)"></span>
          </div>
          <ChatReactionBadges v-if="hasReactions" :reactions="block.reactions" :is-user="block.isUser" />
        </div>
      </div>
      <div v-if="block.fromOffline" class="text-[10px] text-[var(--text-secondary)] opacity-40 mt-0.5" :class="block.isUser ? 'mr-2' : 'ml-2'">线下</div>
      <div v-if="block.metaText" class="msg-meta" :class="block.isUser ? 'user-meta' : 'ai-meta'">
        {{ block.metaText }}
      </div>
    </div>

    <div
      class="avatar-slot avatar-right shrink-0 ml-2 self-end"
      :class="{
        'avatar-visible': block.isUser && block.showAvatar,
        'avatar-placeholder': block.isUser && !block.showAvatar && showChatAvatars
      }"
    >
      <div class="chat-avatar chat-avatar-user w-8 h-8 rounded-full chat-avatar-bg flex items-center justify-center text-sm overflow-hidden">
        <img v-if="block.senderAvatarType === 'image'" :src="block.senderAvatar" class="w-full h-full object-cover">
        <span v-else>{{ block.isUser ? (block.senderAvatar || '😊') : (block.senderAvatar || '🤖') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { getJumboEmojiGlyphs } from '../../../../utils/emoji'
import { haptic } from '../../../../utils/haptic'
import ChatMultiSelectCheckbox from './ChatMultiSelectCheckbox.vue'
import ChatReactionBadges from './ChatReactionBadges.vue'
import './chatEmoji.css'

const PARTICLE_COUNT = 9
const PARTICLE_LIFETIME_MS = 1100

const props = defineProps({
  block: { type: Object, required: true },
  multiSelectMode: { type: Boolean, default: false },
  selected: { type: Boolean, default: false },
  showChatAvatars: { type: Boolean, default: false }
})

const emit = defineEmits(['toggle-select', 'context-menu'])

const isSelected = computed(() => props.multiSelectMode && props.selected)
const hasReactions = computed(() => Array.isArray(props.block.reactions) && props.block.reactions.length > 0)
const isJumbo = computed(() => !props.block.imageUrl && Number(props.block.jumboEmoji) > 0)
const jumboText = computed(() => String(props.block.text || '').trim())

// 只有刚发出/刚收到的那条带入场动画；历史消息打开聊天时保持安静
const entering = ref(String(props.block.animClass || '').includes('bubble-appear'))
const emojiPlayKey = ref(0)
const particles = ref([])
let particleSeq = 0
const particleTimers = new Set()

const emojiAnimClass = computed(() => {
  if (!isJumbo.value || (!entering.value && emojiPlayKey.value === 0)) return ''
  return `is-anim-${props.block.emojiAnim || 'jelly'}`
})

function handleRootClick() {
  if (!props.multiSelectMode) return
  emit('toggle-select', props.block.key)
}

function handleDoubleTap(event) {
  // iMessage：双击气泡直接调出回应面板
  if (props.multiSelectMode) return
  emit('context-menu', event, props.block)
}

function spawnParticles() {
  const glyphs = getJumboEmojiGlyphs(jumboText.value)
  if (glyphs.length === 0) return
  const batch = Array.from({ length: PARTICLE_COUNT }, (_, index) => {
    const angle = (-90 + (index - (PARTICLE_COUNT - 1) / 2) * 22 + (Math.random() - 0.5) * 14) * Math.PI / 180
    const distance = 46 + Math.random() * 42
    particleSeq += 1
    return {
      id: particleSeq,
      glyph: glyphs[index % glyphs.length],
      style: {
        '--dx': `${Math.cos(angle) * distance}px`,
        '--dy': `${Math.sin(angle) * distance - 12}px`,
        '--rot': `${(Math.random() - 0.5) * 70}deg`,
        '--scale': (0.55 + Math.random() * 0.4).toFixed(2),
        animationDelay: `${Math.round(Math.random() * 90)}ms`
      }
    }
  })
  particles.value = [...particles.value, ...batch].slice(-PARTICLE_COUNT * 3)
  const ids = new Set(batch.map(item => item.id))
  const timer = setTimeout(() => {
    particleTimers.delete(timer)
    particles.value = particles.value.filter(item => !ids.has(item.id))
  }, PARTICLE_LIFETIME_MS)
  particleTimers.add(timer)
}

function handleEmojiTap() {
  if (props.multiSelectMode) return
  entering.value = false
  emojiPlayKey.value += 1
  haptic(8)
  spawnParticles()
}

function handleQuoteClick(event) {
  if (props.multiSelectMode) return
  const targetId = String(props.block.replyToMsgId || '')
  if (!targetId) return
  event.stopPropagation()
  const container = event.currentTarget?.closest?.('.chat-messages')
  if (!container) return
  const targetPartKey = String(props.block.replyToPartKey ?? '')
  const messageNodes = Array.from(container.querySelectorAll('[data-msg-id]'))
    .filter(node => node.dataset.msgId === targetId)
  const target = (targetPartKey && messageNodes.find(node => node.dataset.msgPart === targetPartKey))
    || messageNodes[0]
  if (!target) return

  const containerRect = container.getBoundingClientRect()
  const targetRect = target.getBoundingClientRect()
  const top = container.scrollTop + targetRect.top - containerRect.top - (container.clientHeight - targetRect.height) / 2
  container.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  target.classList.remove('search-highlight-flash')
  void target.offsetWidth
  target.classList.add('search-highlight-flash')
  setTimeout(() => target.classList.remove('search-highlight-flash'), 2000)
}

function wrapClass(block) {
  const align = block.isUser ? 'justify-end' : 'justify-start'
  return `flex w-full ${block.mb} ${align} items-end select-none`
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderText(text) {
  if (!text || typeof text !== 'string') return ''
  return escapeHtml(text)
}

onBeforeUnmount(() => {
  particleTimers.forEach(timer => clearTimeout(timer))
  particleTimers.clear()
})
</script>

<style scoped>
.avatar-slot {
  display: none;
  width: 32px;
}

.avatar-slot.avatar-visible {
  display: flex;
}

.avatar-slot.avatar-placeholder {
  display: block;
}

.avatar-slot.avatar-placeholder .chat-avatar {
  visibility: hidden;
}

.chat-message-user {
  flex-direction: row;
}

.chat-message-ai {
  flex-direction: row;
}

.chat-message-user .avatar-left {
  display: none;
}

.chat-message-ai .avatar-right {
  display: none;
}
</style>
