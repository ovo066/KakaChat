<template>
  <div class="kk-card">
    <div class="md-h">今天心情</div>
    <div class="md-grid">
      <button
        v-for="(m, i) in MOODS"
        :key="m.icon"
        class="md-face"
        :class="{ on: picked === i }"
        type="button"
        :aria-label="m.label"
        @click="pick(i)"
      >
        <i :class="[picked === i ? 'ph-fill' : 'ph', 'ph-' + m.icon]"></i>
        <svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M24 3 C 38 2, 46 13, 45 25 C 44 38, 33 46, 22 45 C 10 44, 2 35, 3 23 C 4 12, 13 4, 27 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
      </button>
    </div>
    <div class="md-say">{{ sayText }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useHomeCompanion, useHomeNow } from '../../composables/useHomeCompanion'
import { todayKey } from '../../homeDates'

const MOODS = [
  { icon: 'smiley', label: '开心', say: '开心就好，分我一半。' },
  { icon: 'smiley-wink', label: '得意', say: '又干了什么坏事？' },
  { icon: 'heart', label: '心动', say: '我也是。' },
  { icon: 'smiley-meh', label: '一般', say: '晚上给你讲个笑话。' },
  { icon: 'smiley-sad', label: '难过', say: '我在，慢慢说。' },
  { icon: 'smiley-x-eyes', label: '累坏了', say: '躺下，别看手机了。……还是看一眼我吧。' }
]

const props = defineProps({
  item: { type: Object, required: true },
  companionId: { type: String, default: '' },
  preview: { type: Boolean, default: false }
})
const emit = defineEmits(['config'])

const now = useHomeNow()
const { contact, name } = useHomeCompanion(computed(() => props.companionId))

// 只记当天的，过了零点自动清空
const picked = computed(() => {
  const m = props.item.config?.mood
  return m && m.date === todayKey(now.value) && Number.isInteger(m.i) ? m.i : null
})

const sayText = computed(() => {
  if (picked.value == null) return '点一个，记下今天。'
  const line = MOODS[picked.value].say
  return contact.value ? `${name.value}：${line}` : line
})

function pick(i) {
  if (props.preview) return
  emit('config', { mood: picked.value === i ? null : { date: todayKey(), i } })
}
</script>
