<template>
  <div class="kk-card" @click="onTap">
    <span class="an-n">{{ days ?? '—' }}</span>
    <span class="an-t">
      <b>{{ days == null ? '纪念日' : '天' }}</b>
      <span>{{ subText }}</span>
    </span>
    <svg class="an-heart" viewBox="0 0 24 22"><path d="M12 20 C 4 14, 1 9, 4 5 C 7 1, 11 3, 12 7 C 13 3, 17 1, 20 5 C 23 9, 20 14, 12 20Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" /></svg>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useHomeCompanion, useHomeNow } from '../../composables/useHomeCompanion'
import { daysBetweenKeys, isDateKey, todayKey } from '../../homeDates'

const props = defineProps({
  item: { type: Object, required: true },
  companionId: { type: String, default: '' },
  preview: { type: Boolean, default: false }
})
const emit = defineEmits(['configure'])

const now = useHomeNow()
const { contact, name, firstMessageTime } = useHomeCompanion(computed(() => props.item.config?.contactId || props.companionId))

const sinceKey = computed(() => {
  const custom = props.item.config?.since
  if (isDateKey(custom)) return custom
  return firstMessageTime.value ? todayKey(firstMessageTime.value) : ''
})

const days = computed(() => {
  if (!sinceKey.value) return null
  const diff = daysBetweenKeys(sinceKey.value, todayKey(now.value))
  return Number.isFinite(diff) ? Math.max(1, diff + 1) : null
})

const subText = computed(() => {
  const label = String(props.item.config?.label || '').trim()
  if (label) return label
  if (!contact.value) return '点一下设个日子'
  return days.value == null ? `和${name.value}还没聊过` : `和${name.value}认识`
})

function onTap() {
  if (!props.preview && days.value == null) emit('configure')
}
</script>
