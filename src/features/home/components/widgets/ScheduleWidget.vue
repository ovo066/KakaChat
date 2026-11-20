<template>
  <div class="kk-card" @click="openPlanner">
    <div class="sch-h"><span>{{ contact ? `${name} 的今天` : 'TA 的今天' }}</span><small>PLANNER</small></div>
    <template v-if="rows.length">
      <div
        v-for="row in rows"
        :key="row.startTime + row.activity"
        class="sch-row"
        :class="row.state"
      >
        <span class="num">{{ row.startTime }}</span><span>{{ row.activity }}</span>
      </div>
    </template>
    <p v-else class="kk-empty">{{ emptyText }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { usePlannerStore } from '../../../../stores/planner'
import { useSettingsStore } from '../../../../stores/settings'
import { toLocalDateKey } from '../../../../utils/dateKey'
import { getTimeHHMM } from '../../../../utils/beijingTime'
import { useHomeCompanion, useHomeNow } from '../../composables/useHomeCompanion'

const props = defineProps({
  item: { type: Object, required: true },
  companionId: { type: String, default: '' },
  preview: { type: Boolean, default: false }
})

const router = useRouter()
const plannerStore = usePlannerStore()
const settingsStore = useSettingsStore()
const now = useHomeNow()
const { contact, name } = useHomeCompanion(computed(() => props.item.config?.contactId || props.companionId))

const slots = computed(() => {
  const c = contact.value
  if (!c) return []
  const schedule = plannerStore.getCharacterSchedule(c.id, toLocalDateKey(new Date(now.value)))
  return Array.isArray(schedule?.slots)
    ? [...schedule.slots].sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)))
    : []
})

const rows = computed(() => {
  const list = slots.value
  if (!list.length) return []
  const hhmm = getTimeHHMM(new Date(now.value))
  let focus = list.findIndex(s => s.endTime > hhmm)
  if (focus < 0) focus = list.length - 1
  const start = Math.max(0, Math.min(focus - 1, list.length - 4))
  return list.slice(start, start + 4).map(s => ({
    ...s,
    state: s.endTime <= hhmm ? 'done' : (s.startTime <= hhmm ? 'now' : '')
  }))
})

const emptyText = computed(() => {
  if (!contact.value) return '还没有角色。'
  if (!settingsStore.allowCharacterSchedule) return '在设置里打开「角色日程」，这里会写上 TA 一天在做什么。'
  return '今天还没排日程，点这里去「日程」给 TA 排一天。'
})

function openPlanner() {
  if (!props.preview) router.push('/planner')
}
</script>
