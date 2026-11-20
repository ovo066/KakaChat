<template>
  <button class="kk-app" type="button" @click="emit('open', app)">
    <span class="kk-app-ic" :style="{ '--bg': app.paperBackground }">
      <img v-if="customIcon" :src="customIcon" alt="" draggable="false">
      <i v-else :class="app.duoIcon"></i>
      <span v-if="badge" :key="badge" class="kk-badge">{{ badge > 99 ? '99+' : badge }}</span>
    </span>
    <span class="kk-app-name">{{ app.label }}</span>
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { useSettingsStore } from '../../../stores/settings'

const props = defineProps({
  app: { type: Object, required: true },
  badge: { type: Number, default: 0 }
})
const emit = defineEmits(['open'])

const settingsStore = useSettingsStore()
const customIcon = computed(() => settingsStore.theme?.appIcons?.[props.app.key] || '')
</script>
