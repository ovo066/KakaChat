<template>
  <div class="kk-card" @click="onTap">
    <span class="an-n">{{ target ? (target.days === 0 ? '今' : target.days) : '—' }}</span>
    <span class="an-t">
      <b>{{ headline }}</b>
      <span>{{ target ? describeDateKey(target.date) : '日程里还没有安排' }}</span>
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { usePlannerStore } from '../../../../stores/planner'
import { useHomeNow } from '../../composables/useHomeCompanion'
import { daysBetweenKeys, describeDateKey, isDateKey, todayKey } from '../../homeDates'

const props = defineProps({
  item: { type: Object, required: true },
  preview: { type: Boolean, default: false }
})
const emit = defineEmits(['configure'])

const router = useRouter()
const plannerStore = usePlannerStore()
const now = useHomeNow()

/** 自己设的日子优先，否则取日程里最近一件没完成的事 */
const target = computed(() => {
  const today = todayKey(now.value)
  const cfg = props.item.config || {}
  if (isDateKey(cfg.date) && cfg.date >= today) {
    return { date: cfg.date, title: String(cfg.title || '').trim() || '那天', days: daysBetweenKeys(today, cfg.date), custom: true }
  }
  const next = (plannerStore.events || [])
    .filter(e => !e.completed && (e.startDate || e.dueDate) >= today)
    .sort((a, b) => (a.startDate || a.dueDate).localeCompare(b.startDate || b.dueDate) || String(a.startTime || '').localeCompare(String(b.startTime || '')))[0]
  if (!next) return null
  const date = next.startDate || next.dueDate
  return { date, title: next.title || '日程', days: daysBetweenKeys(today, date), custom: false }
})

const headline = computed(() => {
  const t = target.value
  if (!t) return '倒计时'
  return t.days === 0 ? `天 · ${t.title}` : `天后 · ${t.title}`
})

function onTap() {
  if (props.preview) return
  if (target.value && !target.value.custom) router.push('/planner')
  else emit('configure')
}
</script>
