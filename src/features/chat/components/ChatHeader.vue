<template>
  <div
    class="chat-header glass-panel flex flex-col sticky top-0 z-30"
    :class="[
      'chat-header-' + headerStyle,
      isGroup ? 'is-group' : ''
    ]"
  >
    <div class="chat-header-inner flex items-center justify-between w-full h-full relative pt-app pb-2 px-2">
      <!-- 返回按钮 -->
      <button class="chat-header-back flex items-center z-20 active:opacity-50 transition-opacity" @click="$emit('back')">
        <i class="ph-bold ph-caret-left text-[26px]"></i>
        <span
          v-if="badgeCount > 0"
          class="chat-header-badge ml-1 bg-[var(--primary-color)] text-white rounded-full min-w-[20px] h-[20px] text-[12px] font-medium flex items-center justify-center px-1 shadow-sm"
        >
          {{ badgeCount }}
        </span>
      </button>

      <!-- 中间区域 -->
      <div class="chat-header-center flex-1 flex flex-col items-center justify-center cursor-pointer z-10" @click="onCenterClick">
        <!-- 头像（单聊） -->
        <div v-if="!isGroup" class="chat-header-avatar w-[42px] h-[42px] flex-shrink-0 rounded-full bg-[var(--avatar-bg)] overflow-hidden shadow-sm mb-1 flex items-center justify-center text-2xl ring-2 ring-white/20 dark:ring-white/10"
          style="touch-action: manipulation; -webkit-touch-callout: none;"
          @click.stop="onAvatarClick"
          @pointerdown="onAvatarDown" @pointerup="onAvatarUp" @pointercancel="onAvatarUp" @contextmenu.prevent
        >
          <img v-if="contact?.avatarType === 'image'" :src="contact?.avatar" class="w-full h-full object-cover">
          <template v-else>{{ contact?.avatar || '🤖' }}</template>
        </div>
        <!-- 头像（群聊） -->
        <div v-else class="chat-header-avatar chat-header-avatar-group w-[42px] h-[42px] flex-shrink-0 rounded-full overflow-hidden shadow-sm mb-1 flex items-center justify-center ring-2 ring-white/20 dark:ring-white/10 relative" style="background-color: var(--avatar-bg, #E9E9EB); touch-action: manipulation; -webkit-touch-callout: none;"
          @click.stop="onAvatarClick"
          @pointerdown="onAvatarDown" @pointerup="onAvatarUp" @pointercancel="onAvatarUp" @contextmenu.prevent
        >
          <template v-if="contact?.members && contact.members.length > 0">
            <div
              v-for="(member, idx) in contact.members.slice(0, 4)"
              :key="idx"
              class="absolute flex items-center justify-center bg-[var(--avatar-bg)] overflow-hidden"
              :style="getGroupAvatarStyle(idx, Math.min(contact.members.length, 4))"
            >
              <img v-if="member.avatarType === 'image'" :src="member.avatar" class="w-full h-full object-cover">
              <span v-else class="text-[10px]">{{ member.avatar }}</span>
            </div>
          </template>
          <span v-else class="text-lg">👥</span>
        </div>
        <!-- 名称 -->
        <div class="chat-header-name flex items-center gap-1 opacity-90">
          <span class="chat-header-name-text text-[13px] font-semibold text-[var(--text-primary)] leading-tight tracking-wide">{{ contact?.name || 'Bot' }}</span>
          <i class="chat-header-name-arrow ph-bold ph-caret-right text-[10px] text-[var(--text-secondary)] mt-[1px]"></i>
          <button
            v-if="threadCount > 1"
            type="button"
            class="chat-header-thread-pill"
            @click.stop="$emit('openThreads')"
          >
            <i class="ph-fill ph-chats-circle text-[10px]"></i>
            <span class="truncate">{{ contact?.currentThread?.title || threadCount + ' 段对话' }}</span>
          </button>
        </div>
        <!-- 副标题/成员数 -->
        <div v-if="isGroup && contact?.members" class="chat-header-subtitle text-[10px] text-[var(--text-secondary)] font-normal opacity-65 mt-[2px]">
          {{ contact.members.length }} 位成员
        </div>
      </div>

      <!-- 右侧操作区 -->
      <div class="chat-header-actions flex items-center gap-4 z-20 pr-1">
        <button v-if="showVideo" class="chat-header-action w-8 h-8 rounded-full flex items-center justify-center active:bg-black/5 dark:active:bg-white/10 transition-colors" @click="$emit('startCall')">
          <i class="ph-fill ph-video-camera text-[22px]"></i>
        </button>
        <button v-if="showPhone" class="chat-header-action w-8 h-8 rounded-full flex items-center justify-center active:bg-black/5 dark:active:bg-white/10 transition-colors" @click="$emit('startCall', 'voice')">
          <i class="ph-fill ph-phone text-[20px]"></i>
        </button>
        <button v-if="showMore" class="chat-header-action w-8 h-8 rounded-full flex items-center justify-center active:bg-black/5 dark:active:bg-white/10 transition-colors" @click="$emit('editContact')">
          <i class="ph ph-dots-three text-[24px]"></i>
        </button>
        <button v-if="showList" class="chat-header-action w-8 h-8 rounded-full flex items-center justify-center active:bg-black/5 dark:active:bg-white/10 transition-colors" @click="$emit('editContact')">
          <i class="ph ph-list text-[20px]"></i>
        </button>
      </div>
    </div>
    <ChatContactCard
      :visible="contactCardVisible"
      :contact="contact"
      :is-group="isGroup"
      @close="contactCardVisible = false"
      @edit="emit('editContact')"
      @call="mode => { contactCardVisible = false; emit('startCall', mode) }"
      @search="contactCardVisible = false; emit('openSearch')"
      @memory="contactCardVisible = false; emit('openMemory')"
      @threads="contactCardVisible = false; emit('openThreads')"
      @deleted="contactCardVisible = false; router.push('/messages')"
    />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '../../../stores/settings'
import { haptic } from '../../../utils/haptic'
import { isIos26ThemeActive } from '../../../utils/themeDefaults'
import ChatContactCard from './ChatContactCard.vue'

const props = defineProps({
  contact: { type: Object, default: null },
  badgeCount: { type: Number, default: 0 },
  isGroup: { type: Boolean, default: false }
})

const emit = defineEmits(['back', 'editContact', 'toggleNarrations', 'startCall', 'openThreads', 'openSearch', 'openMemory'])

// 当前对话 + 已存档对话；只有真的开过新对话才显示胶囊
const threadCount = computed(() => (
  Array.isArray(props.contact?.chatThreads) ? props.contact.chatThreads.length + 1 : 1
))

const store = useSettingsStore()
const router = useRouter()

// 从主题配置读取
const headerStyle = computed(() => store.theme.headerStyle || 'default')
const headerActions = computed(() => {
  const actions = store.theme.headerActions
  // 如果没有配置，默认显示 video
  return Array.isArray(actions) && actions.length > 0 ? actions : ['video']
})

// 判断各按钮是否显示
const showVideo = computed(() => headerActions.value.includes('video'))
const showPhone = computed(() => headerActions.value.includes('phone'))
const showMore = computed(() => headerActions.value.includes('more'))
const showList = computed(() => headerActions.value.includes('list'))

function getGroupAvatarStyle(idx, total) {
  const size = total === 1 ? '100%' : '50%'
  let top = '0', left = '0'

  if (total === 2) {
    left = idx === 0 ? '0' : '50%'
  } else if (total === 3) {
    if (idx === 0) {
      top = '25%'
      left = '0'
    } else {
      top = idx === 1 ? '0' : '50%'
      left = '50%'
    }
  } else if (total === 4) {
    top = idx < 2 ? '0' : '50%'
    left = idx % 2 === 0 ? '0' : '50%'
  }

  return {
    width: size,
    height: total === 2 ? '100%' : size,
    top,
    left
  }
}

// 长按头像切换旁白
let longPressTimer = null
const avatarLongPressed = ref(false)
const contactCardVisible = ref(false)

function onAvatarDown() {
  avatarLongPressed.value = false
  longPressTimer = setTimeout(() => {
    avatarLongPressed.value = true
    emit('toggleNarrations')
    haptic()
  }, 500)
}

function onAvatarUp() {
  clearTimeout(longPressTimer)
}

function onCenterClick() {
  if (avatarLongPressed.value) {
    avatarLongPressed.value = false
    return
  }
  // iOS 26 主题：像 iMessage 一样先打开联系人卡片，编辑入口在卡片里
  if (isIos26ThemeActive(store)) {
    contactCardVisible.value = true
    return
  }
  emit('editContact')
}

function onAvatarClick() {
  onCenterClick()
}
</script>

<style scoped>
/* 默认样式 (iMessage 风格) */
.chat-header {
  min-height: calc(var(--app-pt) + 64px);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.chat-header.is-group {
  min-height: calc(var(--app-pt) + 78px);
}
.chat-header-back {
  color: var(--primary-color, #007AFF);
  padding-left: 4px;
}
.chat-header-center {
  position: absolute;
  inset: 0;
  padding-top: var(--app-pt);
  padding-bottom: 6px;
  pointer-events: auto;
}
.chat-header.is-group .chat-header-avatar-group {
  width: 38px;
  height: 38px;
  margin-bottom: 2px;
}
.chat-header-subtitle {
  line-height: 1.2;
}
.chat-header-actions {
  color: var(--primary-color, #007AFF);
}
.chat-header-name-arrow {
  display: inline;
}
.chat-header-thread-pill {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  max-width: 96px;
  margin-left: 2px;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  line-height: 14px;
  color: var(--primary-color, #007AFF);
  background: color-mix(in srgb, var(--primary-color, #007AFF) 12%, transparent);
}
.chat-header-thread-pill:active {
  opacity: 0.6;
}

/* Glass effect enhancement */
.glass-panel {
  background-color: var(--navbar-bg, rgba(255, 255, 255, 0.85));
  backdrop-filter: blur(var(--navbar-blur, 25px)) saturate(180%);
  -webkit-backdrop-filter: blur(var(--navbar-blur, 25px)) saturate(180%);
  border-bottom: 0.5px solid var(--navbar-border, rgba(0,0,0,0.1));
  box-shadow: 0 4px 20px rgba(0,0,0,0.06);
}

.dark .glass-panel {
  box-shadow: 0 6px 20px rgba(0,0,0,0.35);
}
</style>
