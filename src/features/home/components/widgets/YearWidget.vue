<template>
  <div class="kk-card">
    <span class="yr-ring">
      <svg viewBox="0 0 36 36">
        <circle class="bg" cx="18" cy="18" r="15.9" fill="none" stroke-width="3" />
        <circle class="fg" cx="18" cy="18" r="15.9" fill="none" stroke-width="3" pathLength="100" :stroke-dasharray="`${progress.pct} 100`" />
      </svg>
      <span>{{ progress.pct }}</span>
    </span>
    <span class="an-t"><b>{{ progress.year }} 年</b><span>还剩 {{ progress.left }} 天</span></span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useHomeNow } from '../../composables/useHomeCompanion'
import { daysBetweenKeys, todayKey } from '../../homeDates'

defineProps({
  item: { type: Object, required: true }
})

const now = useHomeNow()

const progress = computed(() => {
  const today = todayKey(now.value)
  const year = Number(today.slice(0, 4))
  const total = daysBetweenKeys(`${year}-01-01`, `${year + 1}-01-01`)
  const passed = daysBetweenKeys(`${year}-01-01`, today)
  return {
    year,
    pct: Math.floor((passed / total) * 100),
    left: total - passed
  }
})
</script>
