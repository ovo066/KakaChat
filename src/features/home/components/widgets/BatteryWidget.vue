<template>
  <div class="kk-card">
    <span class="bt-shape" :class="{ low: isLow, unknown: pct == null }"><i :style="{ width: (pct ?? 100) + '%' }"></i></span>
    <span class="an-t">
      <b class="num" style="font-size: 26px; line-height: 1">{{ pct ?? '--' }}%</b>
      <span>{{ isLow && contact ? `${name}：快去充电` : '手机电量' }}</span>
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useBattery } from '../../../../composables/useBattery'
import { useHomeCompanion } from '../../composables/useHomeCompanion'

const props = defineProps({
  item: { type: Object, required: true },
  companionId: { type: String, default: '' }
})

const { batteryPct } = useBattery()
const { contact, name } = useHomeCompanion(computed(() => props.companionId))

const pct = computed(() => (typeof batteryPct.value === 'number' ? Math.max(0, Math.min(100, Math.round(batteryPct.value))) : null))
const isLow = computed(() => pct.value != null && pct.value < 30)
</script>
