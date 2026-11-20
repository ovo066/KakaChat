<template>
  <TransitionGroup
    tag="div"
    name="chat-reaction-pop"
    class="chat-reactions"
    :class="isUser ? 'is-user' : 'is-ai'"
    :aria-label="ariaLabel"
  >
    <span
      v-for="(item, index) in reactions"
      :key="item.key"
      class="chat-reaction"
      :class="[
        item.mine ? 'is-mine' : 'is-other',
        { 'has-tail': index === reactions.length - 1, 'has-count': item.count > 1 }
      ]"
      :style="{ zIndex: index + 1 }"
    >
      <span class="chat-reaction-dot is-lg"></span>
      <span class="chat-reaction-dot is-sm"></span>
      <span class="chat-reaction-body">
        <span class="tapback-emoji">{{ item.emoji }}</span>
        <span v-if="item.count > 1" class="chat-reaction-count">{{ item.count }}</span>
      </span>
    </span>
  </TransitionGroup>
</template>

<script setup>
import { computed } from 'vue'
import './chatReactions.css'

const props = defineProps({
  reactions: { type: Array, default: () => [] },
  isUser: { type: Boolean, default: false }
})

const ariaLabel = computed(() => props.reactions
  .map(item => `${item.mine ? '你' : (item.names[0] || '对方')}回应了 ${item.emoji}`)
  .join('，'))
</script>
