<template>
  <Teleport to="body">
    <Transition name="tapback-pop">
      <div
        v-if="visible"
        class="tapback-picker"
        :class="isUser ? 'is-user' : 'is-ai'"
        :style="{ left: x + 'px', top: y + 'px' }"
        role="toolbar"
        aria-label="表情回应"
        @click.stop
      >
        <span class="tapback-picker-dot is-lg"></span>
        <span class="tapback-picker-dot is-sm"></span>
        <button
          v-for="(option, index) in TAPBACK_OPTIONS"
          :key="option.key"
          type="button"
          class="tapback-option"
          :class="{ 'is-active': activeKey === reactionKey(option.emoji) }"
          :style="{ '--i': index }"
          :aria-label="option.label"
          :aria-pressed="activeKey === reactionKey(option.emoji)"
          @click="$emit('react', option.emoji)"
        >
          <span class="tapback-emoji">{{ option.emoji }}</span>
        </button>
        <button
          type="button"
          class="tapback-option tapback-more"
          :class="{ 'is-active': !!customEmoji, 'is-open': pickingEmoji }"
          :style="{ '--i': TAPBACK_OPTIONS.length }"
          aria-label="更多表情"
          @click="$emit('more')"
        >
          <span v-if="customEmoji" class="tapback-emoji">{{ customEmoji }}</span>
          <span v-else class="tapback-more-icon">
            <i class="ph ph-smiley"></i>
            <i class="ph-bold ph-plus tapback-more-plus"></i>
          </span>
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { TAPBACK_OPTIONS, getTapbackKind, reactionKey } from '../composables/reactionTokens'
import './message-blocks/chatReactions.css'

const props = defineProps({
  visible: { type: Boolean, default: false },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  isUser: { type: Boolean, default: false },
  current: { type: String, default: null },
  pickingEmoji: { type: Boolean, default: false }
})

defineEmits(['react', 'more'])

const activeKey = computed(() => (props.current ? reactionKey(props.current) : ''))
// 当前回应不是那 6 个常用的，就把它显示在「+」的位置（和 iOS 18 一样）
const customEmoji = computed(() => (props.current && !getTapbackKind(props.current) ? props.current : null))
</script>

<style scoped>
.tapback-more-icon {
  position: relative;
  display: inline-flex;
  font-size: 23px;
  color: #8E8E93;
}

.tapback-more-plus {
  position: absolute;
  top: -3px;
  right: -5px;
  font-size: 10px;
  padding: 1px;
  border-radius: 50%;
  background: var(--tapback-picker-bg, #fff);
}

.tapback-more.is-open .tapback-more-icon {
  color: var(--primary-color, #007AFF);
}
</style>
