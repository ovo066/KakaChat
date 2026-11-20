<template>
  <div class="bg-[var(--card-bg)] rounded-[10px] overflow-hidden">
    <div class="px-4 py-3 border-b border-[var(--border-color)]">
      <div class="flex justify-between items-center gap-3">
        <div class="flex flex-col min-w-0">
          <span class="text-[17px] text-[var(--text-primary)]">外观</span>
          <span class="text-[12px] text-[var(--text-secondary)]">{{ appearanceHint }}</span>
        </div>
        <div class="appearance-segment shrink-0">
          <button
            v-for="option in APPEARANCE_OPTIONS"
            :key="option.value"
            type="button"
            :class="{ 'is-active': activeAppearance === option.value }"
            @click="selectAppearance(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>
      <div v-if="isAuto" class="mt-3 flex items-center justify-between gap-3">
        <span class="text-[14px] text-[var(--text-secondary)]">自动方式</span>
        <div class="appearance-segment is-small">
          <button type="button" :class="{ 'is-active': store.appearanceMode === 'system' }" @click="setMode('system')">跟随系统</button>
          <button type="button" :class="{ 'is-active': store.appearanceMode === 'schedule' }" @click="setMode('schedule')">定时</button>
        </div>
      </div>
      <div v-if="store.appearanceMode === 'schedule'" class="mt-3 flex items-center justify-between gap-3">
        <span class="text-[14px] text-[var(--text-secondary)]">深色时段</span>
        <div class="flex items-center gap-2 text-[var(--text-primary)]">
          <input
            type="time"
            class="appearance-time"
            :value="store.darkScheduleStart"
            @change="setScheduleTime('darkScheduleStart', $event.target.value)"
          >
          <span class="text-[var(--text-secondary)]">至</span>
          <input
            type="time"
            class="appearance-time"
            :value="store.darkScheduleEnd"
            @change="setScheduleTime('darkScheduleEnd', $event.target.value)"
          >
        </div>
      </div>
    </div>
    <div class="px-4 py-3 flex justify-between items-center border-b border-[var(--border-color)]">
      <div class="flex flex-col">
        <span class="text-[17px] text-[var(--text-primary)]">聊天头像</span>
        <span class="text-[12px] text-[var(--text-secondary)]">显示用户和联系人头像</span>
      </div>
      <IosToggle v-model="store.showChatAvatars" @update:modelValue="scheduleSave" />
    </div>
    <div class="px-4 py-3 flex justify-between items-center border-b border-[var(--border-color)]">
      <div class="flex flex-col">
        <span class="text-[17px] text-[var(--text-primary)]">显示时间戳</span>
        <span class="text-[12px] text-[var(--text-secondary)]">间隔一段时间显示日期/时间</span>
      </div>
      <IosToggle v-model="store.showChatTimestamps" @update:modelValue="scheduleSave" />
    </div>
    <div class="px-4 py-3 flex justify-between items-center gap-3">
      <div class="flex flex-col flex-1 min-w-0">
        <span class="text-[17px] text-[var(--text-primary)]">Token 统计胶囊</span>
        <span class="text-[12px] text-[var(--text-secondary)]">聊天页面显示用量与陪伴天数</span>
      </div>
      <IosToggle v-model="store.showTokenCapsule" class="shrink-0" @update:modelValue="scheduleSave" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useSettingsStore } from '../../stores/settings'
import { useStorage } from '../../composables/useStorage'
import IosToggle from '../../components/common/IosToggle.vue'
import {
  APPEARANCE_MODE_MANUAL,
  APPEARANCE_MODE_SCHEDULE,
  APPEARANCE_MODE_SYSTEM,
  isAutoAppearanceMode,
  normalizeClockTime
} from '../../utils/appearance'

const APPEARANCE_OPTIONS = [
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
  { value: 'auto', label: '自动' }
]

const store = useSettingsStore()
const { scheduleSave } = useStorage()

const isAuto = computed(() => isAutoAppearanceMode(store.appearanceMode))
const activeAppearance = computed(() => {
  if (isAuto.value) return 'auto'
  return store.isDark ? 'dark' : 'light'
})
const appearanceHint = computed(() => {
  if (store.appearanceMode === APPEARANCE_MODE_SYSTEM) return `跟随系统，当前为${store.isDark ? '深色' : '浅色'}`
  if (store.appearanceMode === APPEARANCE_MODE_SCHEDULE) {
    return `${store.darkScheduleStart} – ${store.darkScheduleEnd} 使用深色`
  }
  return '浅色、深色或自动切换'
})

function setMode(mode) {
  store.appearanceMode = mode
  scheduleSave()
}

function selectAppearance(value) {
  if (value === 'auto') {
    if (!isAuto.value) setMode(APPEARANCE_MODE_SYSTEM)
    return
  }
  store.appearanceMode = APPEARANCE_MODE_MANUAL
  store.setDarkMode(value === 'dark')
  scheduleSave()
}

function setScheduleTime(key, value) {
  const fallback = key === 'darkScheduleStart' ? '19:00' : '07:00'
  store[key] = normalizeClockTime(value, store[key] || fallback)
  scheduleSave()
}
</script>

<style scoped>
.appearance-segment {
  display: inline-flex;
  padding: 2px;
  border-radius: 9px;
  background: rgba(118, 118, 128, 0.12);
}

.dark .appearance-segment {
  background: rgba(118, 118, 128, 0.24);
}

.appearance-segment button {
  min-width: 48px;
  padding: 5px 10px;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  transition: background-color 0.2s ease, box-shadow 0.2s ease;
}

.appearance-segment.is-small button {
  min-width: 0;
  padding: 4px 10px;
  font-size: 12.5px;
}

.appearance-segment button.is-active {
  font-weight: 600;
  background: var(--card-bg, #fff);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.12), 0 3px 1px rgba(0, 0, 0, 0.04);
}

.dark .appearance-segment button.is-active {
  background: #636366;
}

.appearance-time {
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 15px;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
  background: rgba(118, 118, 128, 0.12);
  border: none;
  outline: none;
}

.dark .appearance-time {
  background: rgba(118, 118, 128, 0.24);
  color-scheme: dark;
}
</style>

