<template>
  <div
    class="di"
    :class="{ 'is-resident': resident, 'is-open': open, 'is-closing': isCollapsing && !open }"
    role="status"
    aria-live="polite"
    @click="onTap"
  >
    <Transition name="di-content">
      <div v-if="open" class="di-content">
        <div class="di-avatar">
          <img v-if="notification.avatar && notification.avatarType === 'image'" :src="notification.avatar" alt="">
          <span v-else>{{ notification.avatar || (isMoment ? '📝' : '💬') }}</span>
        </div>
        <div class="di-text">
          <div class="di-title-row">
            <span class="di-name">{{ notification.name || (isMoment ? '朋友圈' : '新消息') }}</span>
            <span class="di-time">现在</span>
          </div>
          <div class="di-preview">{{ notification.preview || (isMoment ? '发布了新动态' : '发来一条消息') }}</div>
        </div>
        <div class="di-app" :class="isMoment ? 'is-moment' : 'is-chat'" aria-hidden="true">
          <i :class="isMoment ? 'ph-fill ph-aperture' : 'ph-fill ph-chat-circle'"></i>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useDynamicIsland } from '../../composables/useDynamicIsland'
import { useContactsStore } from '../../stores/contacts'

defineProps({
  // 常驻：空闲时也显示黑色胶囊；否则只在有通知时从顶部"长"出来
  resident: { type: Boolean, default: false }
})

const router = useRouter()
const store = useContactsStore()
const { isExpanded, isCollapsing, notification, handleTap } = useDynamicIsland()

const open = computed(() => isExpanded.value && !!notification.value)
const isMoment = computed(() => notification.value?.type !== 'chat' && !!notification.value?.momentId)

function onTap() {
  if (!isExpanded.value) return
  const notif = handleTap()
  if (!notif) return
  if (notif.type === 'chat' && notif.contactId) {
    const target = store.contacts?.find(c => c.id === notif.contactId)
    if (target) {
      store.activeChat = target
      target.unreadCount = 0
    }
    router.push('/chat/' + notif.contactId)
  } else if (notif.momentId) {
    router.push('/moments/' + notif.momentId)
  }
}
</script>

<style scoped>
/* 尺寸按 iPhone 15 Pro 灵动岛（126×37pt，距顶 11pt）等比到 390 宽的小手机 */
.di {
  --di-spring: cubic-bezier(0.2, 1.22, 0.36, 1);
  --di-ease: cubic-bezier(0.32, 0.72, 0, 1);
  position: absolute;
  left: 50%;
  top: 11px;
  z-index: 60;
  width: 124px;
  height: 36px;
  border-radius: 18px;
  background: #000;
  overflow: hidden;
  pointer-events: none;
  opacity: 0;
  transform: translateX(-50%) scale(0.9);
  transition:
    width 0.42s var(--di-ease),
    height 0.42s var(--di-ease),
    border-radius 0.42s var(--di-ease),
    transform 0.42s var(--di-ease),
    box-shadow 0.3s ease,
    opacity 0.2s ease 0.3s;
}

.di.is-resident {
  opacity: 1;
  transform: translateX(-50%) scale(1);
}

.di.is-open {
  width: calc(100% - 22px);
  max-width: 368px;
  height: 76px;
  border-radius: 38px;
  opacity: 1;
  transform: translateX(-50%) scale(1);
  pointer-events: auto;
  cursor: pointer;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.24);
  transition:
    width 0.6s var(--di-spring),
    height 0.6s var(--di-spring),
    border-radius 0.6s var(--di-spring),
    transform 0.5s var(--di-spring),
    box-shadow 0.4s ease,
    opacity 0.1s ease;
}

.di.is-open:active {
  transform: translateX(-50%) scale(0.97);
  transition-duration: 0.18s;
}

/* 收回胶囊时轻轻回弹一下，和系统一样"落座" */
.di.is-resident.is-closing {
  animation: di-settle 0.62s var(--di-ease) 0.3s;
}

@keyframes di-settle {
  0% { transform: translateX(-50%) scale(1); }
  35% { transform: translateX(-50%) scale(1.06, 0.94); }
  70% { transform: translateX(-50%) scale(0.98, 1.02); }
  100% { transform: translateX(-50%) scale(1); }
}

.di-content {
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  height: 100%;
  padding: 0 14px 0 13px;
  color: #fff;
}

.di-avatar {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  line-height: 1;
  background: #2c2c2e;
}

.di-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.di-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.di-title-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.di-name {
  flex: 1;
  min-width: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 20px;
  letter-spacing: -0.2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.di-time {
  flex-shrink: 0;
  font-size: 12px;
  color: rgba(235, 235, 245, 0.5);
}

.di-preview {
  font-size: 14px;
  line-height: 19px;
  color: rgba(235, 235, 245, 0.68);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.di-app {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  color: #fff;
}

.di-app.is-chat {
  background: linear-gradient(180deg, #5cf777, #0dbf2f);
}

.di-app.is-moment {
  background: linear-gradient(135deg, #ff9f0a, #ff375f);
}

/* 形状先撑开，内容再从模糊里浮出来 */
.di-content-enter-active {
  transition:
    opacity 0.32s ease 0.16s,
    transform 0.5s var(--di-spring, ease) 0.12s,
    filter 0.32s ease 0.16s;
}

.di-content-leave-active {
  transition: opacity 0.16s ease, transform 0.2s ease, filter 0.16s ease;
}

.di-content-enter-from {
  opacity: 0;
  transform: scale(0.86);
  filter: blur(6px);
}

.di-content-leave-to {
  opacity: 0;
  transform: scale(0.9);
  filter: blur(4px);
}

@media (prefers-reduced-motion: reduce) {
  .di,
  .di.is-open {
    transition-duration: 0.01s;
  }

  .di.is-resident.is-closing {
    animation: none;
  }
}
</style>
