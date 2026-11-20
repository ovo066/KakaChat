<template>
  <div class="space-y-4">
    <div class="bg-[var(--card-bg)] rounded-[10px] overflow-hidden">
      <div class="px-4 py-3 flex justify-between items-center border-b border-[var(--border-color)]">
        <div class="flex flex-col">
          <span class="text-[17px] text-[var(--text-primary)]">AI 收藏消息</span>
          <span class="text-[12px] text-[var(--text-secondary)]">AI 可以在聊天中收藏你们的消息</span>
        </div>
        <IosToggle :model-value="store.allowAIFavorite" @update:modelValue="handleAllowAIFavoriteChange" />
      </div>
      <div class="px-4 py-3 flex justify-between items-center border-b border-[var(--border-color)]">
        <div class="flex flex-col">
          <span class="text-[17px] text-[var(--text-primary)]">AI 表情回应</span>
          <span class="text-[12px] text-[var(--text-secondary)]">AI 可以像 iMessage 一样给你的消息点 ❤️ 👍 😂 等回应</span>
        </div>
        <IosToggle v-model="store.allowAIReaction" @update:modelValue="scheduleSave" />
      </div>
    <div class="px-4 py-3 flex justify-between items-center border-b border-[var(--border-color)]">
      <div class="flex flex-col">
        <span class="text-[17px] text-[var(--text-primary)]">AI发送转账</span>
        <span class="text-[12px] text-[var(--text-secondary)]">AI 可以在聊天中向你发送转账红包</span>
      </div>
      <IosToggle v-model="store.allowAITransfer" @update:modelValue="scheduleSave" />
    </div>
    <div class="px-4 py-3 flex justify-between items-center border-b border-[var(--border-color)]">
      <div class="flex flex-col">
        <span class="text-[17px] text-[var(--text-primary)]">AI发送礼物</span>
        <span class="text-[12px] text-[var(--text-secondary)]">AI 可以在聊天中送你礼物</span>
      </div>
      <IosToggle v-model="store.allowAIGift" @update:modelValue="scheduleSave" />
    </div>
    <div class="px-4 py-3 flex justify-between items-center border-b border-[var(--border-color)]">
      <div class="flex flex-col">
        <span class="text-[17px] text-[var(--text-primary)]">AI邀约线下见面</span>
        <span class="text-[12px] text-[var(--text-secondary)]">AI 可以约你线下见面，同意后进入沉浸式场景</span>
      </div>
      <IosToggle v-model="store.allowAIMeet" @update:modelValue="scheduleSave" />
    </div>
    <div v-if="store.allowAIMeet" class="px-4 py-3 flex justify-between items-center border-b border-[var(--border-color)]">
      <div class="flex flex-col">
        <span class="text-[17px] text-[var(--text-primary)]">邀约开场使用线下预设</span>
        <span class="text-[12px] text-[var(--text-secondary)]">同意邀约后，使用你设定的线下模式风格来生成开场</span>
      </div>
      <IosToggle v-model="store.meetOpeningUseOfflinePreset" @update:modelValue="scheduleSave" />
    </div>
    <div class="px-4 py-3 flex justify-between items-center border-b border-[var(--border-color)]">
      <div class="flex flex-col">
        <span class="text-[17px] text-[var(--text-primary)]">AI发送语音</span>
        <span class="text-[12px] text-[var(--text-secondary)]">AI 可以发送语音消息给你</span>
      </div>
      <IosToggle v-model="store.allowAIVoice" @update:modelValue="scheduleSave" />
    </div>
    <div class="px-4 py-3 flex justify-between items-center border-b border-[var(--border-color)]">
      <div class="flex flex-col">
        <span class="text-[17px] text-[var(--text-primary)]">AI发送表情包</span>
        <span class="text-[12px] text-[var(--text-secondary)]">AI 可以在聊天中发送表情包贴纸</span>
      </div>
      <IosToggle v-model="store.allowAIStickers" @update:modelValue="scheduleSave" />
    </div>
    <div class="px-4 py-3 flex justify-between items-center border-b border-[var(--border-color)]">
      <div class="flex flex-col">
        <span class="text-[17px] text-[var(--text-primary)]">AI主动发送图片</span>
        <span class="text-[12px] text-[var(--text-secondary)]">AI 可以根据对话情境自动生成并发送图片</span>
      </div>
      <IosToggle v-model="store.allowAIImageGeneration" class="shrink-0" @update:modelValue="scheduleSave" />
    </div>
    <div class="px-4 py-3 flex justify-between items-center border-b border-[var(--border-color)] gap-3">
      <div class="flex flex-col flex-1 min-w-0">
        <span class="text-[17px] text-[var(--text-primary)]">同步动态内容到AI</span>
        <span class="text-[12px] text-[var(--text-secondary)]">AI 在聊天时可以自然地发布朋友圈动态</span>
      </div>
      <IosToggle v-model="store.syncForumToAI" class="shrink-0" @update:modelValue="scheduleSave" />
    </div>
    <div class="px-4 py-3 flex justify-between items-center border-b border-[var(--border-color)]">
      <div class="flex flex-col">
        <span class="text-[17px] text-[var(--text-primary)]">AI情绪标签</span>
        <span class="text-[12px] text-[var(--text-secondary)]">AI 的语音会带有情绪变化，不会显示在聊天中</span>
      </div>
      <IosToggle v-model="store.allowAIEmotionTag" @update:modelValue="scheduleSave" />
    </div>
    <div class="px-4 py-3 flex justify-between items-center border-b border-[var(--border-color)]">
      <div class="flex flex-col">
        <span class="text-[17px] text-[var(--text-primary)]">AI发送模拟图片</span>
        <span class="text-[12px] text-[var(--text-secondary)]">AI 可以发送模拟拍摄的照片消息</span>
      </div>
      <IosToggle v-model="store.allowAIMockImage" @update:modelValue="scheduleSave" />
    </div>
    <div class="px-4 py-3 flex justify-between items-center border-b border-[var(--border-color)]">
      <div class="flex flex-col">
        <span class="text-[17px] text-[var(--text-primary)]">AI发起通话</span>
        <span class="text-[12px] text-[var(--text-secondary)]">AI 可以主动发起语音或视频通话</span>
      </div>
      <IosToggle v-model="store.allowAICall" @update:modelValue="scheduleSave" />
    </div>
    <div class="px-4 py-3 flex justify-between items-center border-b border-[var(--border-color)]">
      <div class="flex flex-col">
        <span class="text-[17px] text-[var(--text-primary)]">AI撤回消息</span>
        <span class="text-[12px] text-[var(--text-secondary)]">AI 可以撤回说漏嘴的话，点开"撤回了一条消息"能偷看原文</span>
      </div>
      <IosToggle v-model="store.allowAIRecall" @update:modelValue="scheduleSave" />
    </div>
    <div class="px-4 py-3 flex justify-between items-center border-b border-[var(--border-color)]">
      <div class="flex flex-col">
        <span class="text-[17px] text-[var(--text-primary)]">AI发送文件</span>
        <span class="text-[12px] text-[var(--text-secondary)]">AI 需要时可以把清单、计划、代码等整理成文件发给你</span>
      </div>
      <IosToggle v-model="store.allowAIFile" @update:modelValue="scheduleSave" />
    </div>
    <div class="px-4 py-3 flex justify-between items-center">
      <div class="flex flex-col">
        <span class="text-[17px] text-[var(--text-primary)]">AI推荐音乐</span>
        <span class="text-[12px] text-[var(--text-secondary)]">AI 可以在聊天中向你推荐歌曲</span>
      </div>
      <IosToggle v-model="store.allowAIMusicRecommend" @update:modelValue="scheduleSave" />
    </div>
    <div v-if="store.allowAIMusicRecommend" class="flex items-center px-4 py-3 border-t border-[var(--border-color)]">
      <span class="w-28 text-[16px] text-[var(--text-primary)] shrink-0">音乐搜索</span>
      <input v-model="store.musicSearchApiUrl" class="flex-1 text-right text-[var(--text-primary)] bg-transparent outline-none min-w-0 text-[14px]" placeholder="留空使用内置音源" @change="scheduleSave" />
    </div>
    <div class="px-4 py-3 flex justify-between items-center border-t border-[var(--border-color)]">
      <div class="flex flex-col pr-3">
        <span class="text-[17px] text-[var(--text-primary)]">智能界面</span>
        <span class="text-[12px] text-[var(--text-secondary)]">单聊中 AI 可在合适时发送可交互的卡片：滑块计算、图表、选项、小游戏等</span>
      </div>
      <IosToggle v-model="store.allowAIIntelligentUI" @update:modelValue="scheduleSave" />
    </div>
    <div class="flex items-center px-4 py-3 border-t border-[var(--border-color)]">
      <span class="w-28 text-[16px] text-[var(--text-primary)] shrink-0">时区设置</span>
      <select v-model="store.timeZoneMode" class="flex-1 text-[var(--primary-color)] bg-transparent outline-none text-right" @change="handleTimeZoneModeChange">
        <option v-for="opt in TIME_ZONE_MODE_OPTIONS" :key="`timezone-mode-${opt.value}`" :value="opt.value">{{ opt.label }}</option>
      </select>
    </div>
    <div v-if="store.timeZoneMode === TIME_ZONE_MODE_CUSTOM" class="flex items-center px-4 py-3 border-t border-[var(--border-color)]">
      <span class="w-28 text-[16px] text-[var(--text-primary)] shrink-0">自定义时区</span>
      <input v-model="store.customTimeZone" class="flex-1 min-w-0 text-[15px] outline-none text-right bg-transparent text-[var(--text-primary)]" placeholder="例如 Asia/Shanghai" @change="handleCustomTimeZoneChange" />
    </div>
    <div v-else class="flex items-center px-4 py-3 border-t border-[var(--border-color)]">
      <span class="w-28 text-[16px] text-[var(--text-primary)] shrink-0">当前时区</span>
      <span class="flex-1 text-right text-[14px] text-[var(--text-secondary)]">{{ activeTimeZoneLabel }}</span>
    </div>
    <div class="px-4 py-3 flex justify-between items-center border-t border-[var(--border-color)] gap-3">
      <div class="flex flex-col flex-1 min-w-0">
        <span class="text-[17px] text-[var(--text-primary)]">注入天气上下文</span>
        <span class="text-[12px] text-[var(--text-secondary)]">AI 聊天时会了解你所在地的天气情况</span>
      </div>
      <IosToggle v-model="store.enableWeatherContext" class="shrink-0" @update:modelValue="handleWeatherContextToggle" />
    </div>
      <template v-if="store.enableWeatherContext">
      <div class="flex items-center px-4 py-3 border-t border-[var(--border-color)]">
        <span class="w-28 text-[16px] text-[var(--text-primary)] shrink-0">位置来源</span>
        <select v-model="store.weatherLocationMode" class="flex-1 text-[var(--primary-color)] bg-transparent outline-none text-right" @change="handleWeatherModeChange">
          <option value="auto">自动定位</option>
          <option value="manual">手动城市</option>
        </select>
      </div>
      <div v-if="store.weatherLocationMode === 'manual'" class="flex items-center px-4 py-3 border-t border-[var(--border-color)]">
        <span class="w-28 text-[16px] text-[var(--text-primary)] shrink-0">城市</span>
        <input v-model="store.weatherManualCity" class="flex-1 min-w-0 text-[15px] outline-none text-right bg-transparent text-[var(--text-primary)]" placeholder="例如：上海" @change="handleWeatherManualCityChange" />
      </div>
      <div v-else class="flex items-center px-4 py-3 border-t border-[var(--border-color)]">
        <span class="w-28 text-[16px] text-[var(--text-primary)] shrink-0">定位权限</span>
        <span class="flex-1 text-right text-[14px] text-[var(--text-secondary)]">{{ geolocationPermissionLabel }}</span>
      </div>
      <div class="flex items-center px-4 py-3 border-t border-[var(--border-color)]">
        <span class="w-28 text-[16px] text-[var(--text-primary)] shrink-0">刷新间隔</span>
        <select v-model.number="store.weatherRefreshMinutes" class="flex-1 text-[var(--primary-color)] bg-transparent outline-none text-right" @change="handleWeatherRefreshIntervalChange">
          <option v-for="opt in WEATHER_REFRESH_OPTIONS" :key="`weather-interval-${opt.value}`" :value="opt.value">{{ opt.label }}</option>
        </select>
      </div>
      <div class="flex items-center px-4 py-3 border-t border-[var(--border-color)] gap-3">
        <span class="w-28 text-[16px] text-[var(--text-primary)] shrink-0">当前天气</span>
        <div class="flex items-center justify-end gap-2 flex-1 min-w-0">
          <span class="text-[12px] text-[var(--text-secondary)] truncate">{{ weatherStatus }}</span>
          <button class="px-3 py-1 rounded-md border border-[var(--border-color)] text-[14px] text-[var(--primary-color)] disabled:opacity-60" :disabled="weatherBusy" @click="handleRefreshWeatherNow">{{ weatherRefreshButtonLabel }}</button>
        </div>
      </div>
      <div v-if="weatherError" class="px-4 pb-3 text-[12px] text-red-500 break-all">{{ weatherError }}</div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { useSettingsStore } from '../../stores/settings'
import { useStorage } from '../../composables/useStorage'
import { useToast } from '../../composables/useToast'
import IosToggle from '../../components/common/IosToggle.vue'
import { useWeatherSettings } from './composables/useWeatherSettings'

const store = useSettingsStore()
const { flushSaveNow, scheduleSave } = useStorage()
const { showToast } = useToast()
const {
  activeTimeZoneLabel,
  geolocationPermissionLabel,
  handleCustomTimeZoneChange,
  handleRefreshWeatherNow,
  handleTimeZoneModeChange,
  handleWeatherContextToggle,
  handleWeatherManualCityChange,
  handleWeatherModeChange,
  handleWeatherRefreshIntervalChange,
  TIME_ZONE_MODE_CUSTOM,
  TIME_ZONE_MODE_OPTIONS,
  weatherBusy,
  weatherError,
  WEATHER_REFRESH_OPTIONS,
  weatherRefreshButtonLabel,
  weatherStatus
} = useWeatherSettings({ scheduleSave, showToast, store })

function handleAllowAIFavoriteChange(nextValue) {
  store.allowAIFavorite = !!nextValue
  void flushSaveNow()
}
</script>
