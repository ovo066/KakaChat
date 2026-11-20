<template>
  <div class="kk-card">
    <button class="td-h" type="button" @click="openPlanner">今天要做<small>{{ doneCount }}/{{ events.length }}</small></button>
    <template v-if="events.length">
      <button
        v-for="evt in events.slice(0, 4)"
        :key="evt.id"
        class="td-row"
        :class="{ done: evt.completed }"
        type="button"
        @click="toggle(evt.id)"
      >
        <span class="td-box"><i class="ph-bold ph-check"></i></span>
        <span>{{ evt.title || '未命名' }}</span>
      </button>
    </template>
    <p v-else class="kk-empty" @click="openPlanner">今天没有待办。点这里去日程里加几件。</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { usePlannerStore } from '../../../../stores/planner'
import { useStorage } from '../../../../composables/useStorage'
import { useHomeNow } from '../../composables/useHomeCompanion'
import { todayKey } from '../../homeDates'

const props = defineProps({
  item: { type: Object, required: true },
  preview: { type: Boolean, default: false }
})

const router = useRouter()
const plannerStore = usePlannerStore()
const { scheduleSave } = useStorage()
const now = useHomeNow()

// 只按时间排，勾掉的条目留在原位，免得一勾就跳走
const events = computed(() => plannerStore
  .getEventsForDate(todayKey(now.value))
  .slice()
  .sort((a, b) => String(a.startTime || a.dueTime || '').localeCompare(String(b.startTime || b.dueTime || ''))))

const doneCount = computed(() => events.value.filter(e => e.completed).length)

function toggle(id) {
  if (props.preview) return
  plannerStore.toggleComplete(id)
  scheduleSave()
}

function openPlanner() {
  if (!props.preview) router.push('/planner')
}
</script>
