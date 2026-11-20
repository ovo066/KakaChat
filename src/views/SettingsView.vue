<template>
  <div class="absolute inset-0 z-20 bg-[var(--bg-color)] flex flex-col">
    <template v-if="currentPage === 'hub'">
      <div class="pt-app-lg pb-2 px-4 flex items-end justify-between">
        <h1 class="text-3xl font-bold text-[var(--text-primary)]">设置</h1>
        <button class="text-[var(--primary-color)] font-semibold text-[17px]" @click="handleDone">完成</button>
      </div>
    </template>
    <template v-else-if="currentPage !== 'api'">
      <div class="pt-app-lg pb-2 px-4 flex items-center justify-between relative">
        <button class="text-[var(--primary-color)] text-[17px] flex items-center gap-0.5" @click="goBack">
          <i class="ph ph-caret-left text-[20px]"></i>
          <span>设置</span>
        </button>
        <span class="text-[17px] font-semibold text-[var(--text-primary)] absolute left-1/2 -translate-x-1/2">{{ pageTitle }}</span>
        <button class="text-[var(--primary-color)] font-semibold text-[17px]" @click="handleDone">完成</button>
      </div>
    </template>

    <div v-show="currentPage !== 'api'" class="flex-1 overflow-y-auto p-4 no-scrollbar">
      <SettingsHub v-show="currentPage === 'hub'" @navigate="goTo" />
      <SettingsAppearance v-show="currentPage === 'appearance'" />
      <SettingsChat v-show="currentPage === 'chat'" />
      <SettingsAIFeatures v-show="currentPage === 'ai'" />
      <SettingsToolsMcp v-show="currentPage === 'toolsMcp'" />
      <SettingsSound v-show="currentPage === 'sound'" />
      <SettingsVoice v-show="currentPage === 'voice'" />
      <SettingsLiveness v-show="currentPage === 'liveness'" />
      <SettingsPlanner v-show="currentPage === 'planner'" />
      <SettingsAccessControl v-show="currentPage === 'access'" />
      <SettingsCloudSync v-show="currentPage === 'cloudSync'" />
    </div>
    <!-- 模型与 API 自带 iOS 26 导航栏和多级页面，占满整个设置页 -->
    <div v-show="currentPage === 'api'" class="relative flex-1">
      <SettingsApiConfig :active="currentPage === 'api'" @back="goBack" @done="handleDone" />
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SettingsAIFeatures from './settings/SettingsAIFeatures.vue'
import SettingsAccessControl from './settings/SettingsAccessControl.vue'
import SettingsApiConfig from './settings/SettingsApiConfig.vue'
import SettingsAppearance from './settings/SettingsAppearance.vue'
import SettingsChat from './settings/SettingsChat.vue'
import SettingsHub from './settings/SettingsHub.vue'
import SettingsLiveness from './settings/SettingsLiveness.vue'
import SettingsPlanner from './settings/SettingsPlanner.vue'
import SettingsSound from './settings/SettingsSound.vue'
import SettingsToolsMcp from './settings/SettingsToolsMcp.vue'
import SettingsVoice from './settings/SettingsVoice.vue'
import SettingsCloudSync from './settings/SettingsCloudSync.vue'

const router = useRouter()
const route = useRoute()
const currentPage = ref('hub')

const PAGE_TITLES = {
  hub: '设置',
  appearance: '外观与显示',
  chat: '聊天',
  ai: 'AI 能力',
  toolsMcp: '工具与 MCP',
  sound: '声音与提示音',
  voice: '语音与通话',
  liveness: '拟真互动',
  api: '模型与 API',
  planner: '日程管理',
  access: '访问验证',
  cloudSync: '云同步'
}

const pageTitle = computed(() => PAGE_TITLES[currentPage.value] || '设置')

function goTo(page) {
  currentPage.value = page
}

// 支持 /settings?page=api 直接打开某个子页（例如模型选择面板里的“去添加”）
watch(() => route.query.page, (page) => {
  if (typeof page === 'string' && page in PAGE_TITLES) goTo(page)
}, { immediate: true })

function goBack() {
  currentPage.value = 'hub'
}

function handleDone() {
  router.push('/')
}
</script>
