<template>
  <div class="kk-card">
    <svg viewBox="-50 -50 100 100">
      <path class="face" d="M 0 -45 C 25 -46, 46 -24, 45 1 C 44 25, 24 45, -1 45 C -26 44, -46 24, -45 -1 C -44 -26, -24 -44, 3 -46" />
      <line v-for="deg in TICKS" :key="deg" class="tick" x1="0" y1="-37" x2="0" y2="-41" :transform="`rotate(${deg})`" />
      <text x="0" y="-32">12</text><text x="33" y="1">3</text><text x="0" y="33">6</text><text x="-33" y="1">9</text>
      <line class="hh" x1="0" y1="3" x2="0" y2="-19" :transform="`rotate(${angles.h})`" />
      <line class="mm" x1="0" y1="4" x2="0" y2="-29" :transform="`rotate(${angles.m})`" />
      <line class="ss" x1="0" y1="7" x2="0" y2="-33" :transform="`rotate(${angles.s})`" />
      <circle class="pin" r="3" />
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getDateParts } from '../../../../utils/beijingTime'
import { useHomeNow } from '../../composables/useHomeCompanion'

defineProps({
  item: { type: Object, required: true }
})

const TICKS = [30, 60, 120, 150, 210, 240, 300, 330]
const now = useHomeNow()

const angles = computed(() => {
  const { hour, minute } = getDateParts(new Date(now.value))
  const second = new Date(now.value).getSeconds()
  return {
    h: (hour % 12) * 30 + minute * 0.5,
    m: minute * 6 + second * 0.1,
    s: second * 6
  }
})
</script>
