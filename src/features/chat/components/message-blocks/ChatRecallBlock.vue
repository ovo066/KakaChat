<template>
  <div
    class="chat-recall-row w-full relative"
    :class="block.isUser ? 'is-user' : 'is-ai'"
    :data-msg-id="block.msgId"
    :data-msg-part="block.msgPartKey || 'message'"
    @click="handleClick"
  >
    <div v-if="multiSelectMode" class="absolute left-2 top-1/2 -translate-y-1/2 z-[1]">
      <ChatMultiSelectCheckbox :visible="true" :selected="selected" />
    </div>

    <!-- 新到达的撤回消息：先像正常气泡一样出现，停留片刻后"收回" -->
    <div v-if="phase !== 'notice'" class="chat-recall-bubble-wrap">
      <div
        class="bubble has-tail"
        :class="[block.isUser ? 'bubble-user' : 'bubble-ai', phase === 'poof' ? 'chat-recall-poof' : 'bubble-appear']"
      >
        <span class="bubble-text">{{ block.text }}</span>
      </div>
    </div>

    <template v-else>
      <div class="chat-recall-notice" @contextmenu.prevent="handleContextMenu">
        <span>{{ block.recallerName }}撤回了一条消息</span>
        <button
          v-if="!multiSelectMode && block.text"
          type="button"
          class="chat-recall-peek"
          @click.stop="revealed = !revealed"
        >
          {{ revealed ? '收起' : '查看' }}
        </button>
      </div>

      <Transition name="chat-recall-reveal">
        <div v-if="revealed && !multiSelectMode" class="chat-recall-bubble-wrap">
          <div class="chat-recall-ghost" :class="block.isUser ? 'is-user' : 'is-ai'">
            <span class="chat-recall-ghost-label"><i class="ph ph-eye"></i> 已撤回的原文</span>
            <span class="chat-recall-ghost-text">{{ block.text }}</span>
          </div>
        </div>
      </Transition>
    </template>
  </div>
</template>

<script setup>
import { onBeforeUnmount, ref } from 'vue'
import ChatMultiSelectCheckbox from './ChatMultiSelectCheckbox.vue'

const RECALL_LINGER_MS = 1600
const RECALL_POOF_MS = 360

const props = defineProps({
  block: { type: Object, required: true },
  multiSelectMode: { type: Boolean, default: false },
  selected: { type: Boolean, default: false }
})

const emit = defineEmits(['toggle-select', 'context-menu'])

const revealed = ref(false)
const phase = ref(props.block.animate ? 'bubble' : 'notice')
const timers = []

if (phase.value === 'bubble') {
  timers.push(setTimeout(() => {
    phase.value = 'poof'
    timers.push(setTimeout(() => { phase.value = 'notice' }, RECALL_POOF_MS))
  }, RECALL_LINGER_MS))
}

function handleContextMenu(event) {
  if (props.multiSelectMode) {
    emit('toggle-select', props.block.key)
    return
  }
  emit('context-menu', event, props.block)
}

function handleClick() {
  if (props.multiSelectMode) emit('toggle-select', props.block.key)
}

onBeforeUnmount(() => {
  timers.forEach(timer => clearTimeout(timer))
})
</script>

<style scoped>
.chat-recall-row {
  margin: 2px 0 6px;
}

.chat-recall-bubble-wrap {
  display: flex;
  padding: 0 8px;
}

.chat-recall-row.is-ai .chat-recall-bubble-wrap {
  justify-content: flex-start;
}

.chat-recall-row.is-user .chat-recall-bubble-wrap {
  justify-content: flex-end;
}

.chat-recall-notice {
  display: flex;
  width: fit-content;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: 4px auto;
  font-size: 12px;
  line-height: 18px;
  color: var(--meta-color, #8E8E93);
  -webkit-touch-callout: none;
  user-select: none;
}

.chat-recall-peek {
  font-size: 12px;
  font-weight: 600;
  color: var(--primary-color, #007AFF);
  padding: 0 2px;
}

.chat-recall-peek:active {
  opacity: 0.5;
}

.chat-recall-ghost {
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
  max-width: min(280px, 78vw);
  padding: 7px 12px 8px;
  border-radius: var(--bubble-radius, 18px);
  border: 1px dashed rgba(142, 142, 147, 0.55);
  background: rgba(142, 142, 147, 0.08);
  white-space: pre-wrap;
  overflow-wrap: break-word;
}

.chat-recall-ghost.is-ai {
  margin-left: 6px;
}

.chat-recall-ghost.is-user {
  margin-right: 6px;
}

.chat-recall-ghost-label {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  letter-spacing: 0.02em;
  color: var(--meta-color, #8E8E93);
}

.chat-recall-ghost-text {
  font-size: calc(var(--font-size, 17px) - 2px);
  line-height: 1.3;
  color: var(--text-secondary, #6b6b70);
}

.chat-recall-poof {
  animation: chatRecallPoof 0.36s ease-in forwards;
}

@keyframes chatRecallPoof {
  0% { opacity: 1; transform: scale(1); filter: blur(0); }
  40% { opacity: 0.85; transform: scale(1.04); }
  100% { opacity: 0; transform: scale(0.6) translateY(6px); filter: blur(4px); }
}

.chat-recall-reveal-enter-active,
.chat-recall-reveal-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.chat-recall-reveal-enter-from,
.chat-recall-reveal-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
