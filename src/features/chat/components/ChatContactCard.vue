<template>
  <Teleport :to="teleportTarget">
    <Transition name="contact-card" appear>
      <div
        v-if="visible"
        class="contact-card"
        :style="{ '--contact-tint': tint || DEFAULT_TINT }"
        role="dialog"
        aria-modal="true"
        :aria-label="`${contactName} 的联系人信息`"
      >
        <!-- 整屏底色：头像放大模糊铺满，再压一层取自头像的主色 -->
        <div class="cc-backdrop" aria-hidden="true">
          <div v-if="posterImage" class="cc-backdrop-photo" :style="{ backgroundImage: cssUrl(posterImage) }"></div>
        </div>

        <div ref="scrollEl" class="cc-scroll" @scroll.passive="onScroll">
          <!-- 联系人海报：照片头像整幅铺开、底部渐隐，名字压在海报上 -->
          <header class="cc-poster" :class="{ 'has-photo': !!posterImage, 'is-group': isGroup }">
            <div class="cc-poster-art" :style="posterArtStyle">
              <img v-if="posterImage" :src="posterImage" alt="" class="cc-poster-img" draggable="false">
              <div v-else-if="isGroup" class="cc-poster-cluster">
                <div
                  v-for="(member, idx) in heroMembers"
                  :key="member.id || idx"
                  class="cc-poster-member"
                  :class="'is-slot-' + idx"
                >
                  <img v-if="member.avatarType === 'image'" :src="member.avatar" alt="">
                  <span v-else>{{ member.avatar || '🙂' }}</span>
                </div>
              </div>
              <div v-else class="cc-poster-emoji">{{ contact?.avatar || '🤖' }}</div>
            </div>
            <div class="cc-poster-text" :style="{ opacity: String(1 - titleProgress) }">
              <h2 class="cc-name">{{ contactName }}</h2>
              <p class="cc-subtitle">{{ subtitle }}</p>
            </div>
          </header>

          <div class="cc-body">
            <!-- 圆形玻璃按钮，只放图标（同 iOS 26 联系人卡片） -->
            <div class="cc-actions">
              <button
                v-for="action in actions"
                :key="action.key"
                type="button"
                class="cc-glass cc-action"
                :aria-label="action.label"
                :title="action.label"
                @click="action.run"
              >
                <i :class="action.icon"></i>
              </button>
            </div>

            <ContactCardSettings v-if="!isGroup" ref="settingsRef" :contact="contact" @deleted="emit('deleted')">
              <section class="cc-glass cc-group">
                <button type="button" class="cc-row" @click="emit('memory')">
                  <span class="cc-row-icon" style="--icon-bg: #FF9F0A"><i class="ph-fill ph-brain"></i></span>
                  <span class="cc-row-title">记忆</span>
                  <span class="cc-row-value">{{ memoryCount > 0 ? memoryCount + ' 条' : '还没有' }}</span>
                  <i class="ph-bold ph-caret-right"></i>
                </button>
                <button v-if="threadCount > 1" type="button" class="cc-row" @click="emit('threads')">
                  <span class="cc-row-icon" style="--icon-bg: #64D2FF"><i class="ph-fill ph-chats-circle"></i></span>
                  <span class="cc-row-title">对话</span>
                  <span class="cc-row-value">{{ threadCount }} 段</span>
                  <i class="ph-bold ph-caret-right"></i>
                </button>
              </section>
              <ContactCardPhotos :photos="photos" @open="openPhotos" />
            </ContactCardSettings>

            <template v-else>
              <section v-if="members.length > 0" class="cc-glass cc-group">
                <div class="cc-label cc-group-label">{{ members.length }} 位成员</div>
                <div v-for="member in members" :key="member.id" class="cc-row is-static">
                  <span class="cc-member-avatar">
                    <img v-if="member.avatarType === 'image'" :src="member.avatar" alt="">
                    <span v-else>{{ member.avatar || '🙂' }}</span>
                  </span>
                  <span class="cc-row-title">{{ member.name }}</span>
                </div>
              </section>
              <section class="cc-glass cc-group">
                <button type="button" class="cc-row" @click="emit('memory')">
                  <span class="cc-row-icon" style="--icon-bg: #FF9F0A"><i class="ph-fill ph-brain"></i></span>
                  <span class="cc-row-title">记忆</span>
                  <span class="cc-row-value">{{ memoryCount > 0 ? memoryCount + ' 条' : '还没有' }}</span>
                  <i class="ph-bold ph-caret-right"></i>
                </button>
              </section>
              <ContactCardPhotos :photos="photos" @open="openPhotos" />
              <button type="button" class="cc-glass cc-edit-row" @click="emit('edit')">
                <i class="ph-bold ph-pencil-simple"></i>
                编辑群聊资料
              </button>
            </template>
          </div>
        </div>

        <!-- 悬浮导航：滚过海报后中间浮出带小头像的名字胶囊 -->
        <nav class="cc-nav" :style="{ '--cc-scrim': String(titleProgress) }">
          <button type="button" class="cc-glass cc-round" aria-label="返回聊天" @click="emit('close')">
            <i class="ph-bold ph-caret-left"></i>
          </button>
          <div class="cc-glass cc-title-pill" :style="{ opacity: titleProgress, transform: `translateY(${(1 - titleProgress) * 8}px) scale(${0.94 + titleProgress * 0.06})` }" :aria-hidden="titleProgress < 0.5">
            <span class="cc-title-avatar">
              <img v-if="miniAvatar.type === 'image'" :src="miniAvatar.value" alt="">
              <span v-else>{{ miniAvatar.value }}</span>
            </span>
            <span class="cc-title-name">{{ contactName }}</span>
          </div>
          <button type="button" class="cc-glass cc-pill" @click="onEdit">编辑</button>
        </nav>
      </div>
    </Transition>
  </Teleport>

  <ChatImageViewer v-if="viewerImages.length > 0" :images="viewerImages" :start-index="viewerIndex" @close="viewerImages = []" />
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { resolveMessageImageUrl } from '../../../utils/mediaUrl'
import { getImageTint } from '../../../utils/imageTint'
import ChatImageViewer from './ChatImageViewer.vue'
import ContactCardPhotos from './contactCard/ContactCardPhotos.vue'
import ContactCardSettings from './contactCard/ContactCardSettings.vue'
import './contactCard/contactCard.css'

const DEFAULT_TINT = 'hsl(214 82% 46%)'
const DAY_MS = 24 * 60 * 60 * 1000
// 手机壳模式下挂到 #screen（与 iOS 26 底部面板同一层），面板能盖在卡片上面
const teleportTarget = typeof document !== 'undefined' && document.getElementById('screen') ? '#screen' : '#app'

const props = defineProps({
  visible: { type: Boolean, default: false },
  contact: { type: Object, default: null },
  isGroup: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'edit', 'call', 'search', 'memory', 'threads', 'deleted'])

const tint = ref('')
const viewerImages = ref([])
const viewerIndex = ref(0)
const scrollEl = ref(null)
const scrollTop = ref(0)
const settingsRef = ref(null)

const contactName = computed(() => String(props.contact?.name || '').trim() || 'Bot')
const members = computed(() => (Array.isArray(props.contact?.members) ? props.contact.members : []))
const heroMembers = computed(() => members.value.slice(0, 3))
const memoryCount = computed(() => (Array.isArray(props.contact?.memory?.core) ? props.contact.memory.core.length : 0))
const threadCount = computed(() => (Array.isArray(props.contact?.chatThreads) ? props.contact.chatThreads.length + 1 : 1))
const posterImage = computed(() => (!props.isGroup && props.contact?.avatarType === 'image' ? props.contact.avatar : ''))
const miniAvatar = computed(() => {
  const source = props.isGroup ? members.value[0] : props.contact
  if (source?.avatarType === 'image' && source.avatar) return { type: 'image', value: source.avatar }
  return { type: 'text', value: source?.avatar || (props.isGroup ? '👥' : '🤖') }
})


// 新的在前，和 iMessage「照片」一致
const photos = computed(() => {
  const msgs = Array.isArray(props.contact?.msgs) ? props.contact.msgs : []
  const list = []
  for (let i = msgs.length - 1; i >= 0; i -= 1) {
    const msg = msgs[i]
    if (!msg?.isImage || msg.hideInChat || msg.hidden) continue
    const url = resolveMessageImageUrl(msg)
    if (url) list.push(url)
  }
  return list
})

const subtitle = computed(() => {
  if (props.isGroup) return `${members.value.length} 位成员`
  const msgs = Array.isArray(props.contact?.msgs) ? props.contact.msgs : []
  const firstTime = Number(msgs.find(msg => Number(msg?.time) > 0)?.time || 0)
  if (!firstTime) return '还没有聊过天'
  const days = Math.max(1, Math.ceil((Date.now() - firstTime) / DAY_MS))
  return `认识第 ${days} 天 · ${msgs.length} 条消息`
})

const actions = computed(() => [
  { key: 'message', label: '信息', icon: 'ph-fill ph-chat-circle', run: () => emit('close') },
  { key: 'voice', label: '语音', icon: 'ph-fill ph-phone', run: () => emit('call', 'voice') },
  { key: 'video', label: '视频', icon: 'ph-fill ph-video-camera', run: () => emit('call', 'video') },
  { key: 'search', label: '搜索', icon: 'ph-bold ph-magnifying-glass', run: () => emit('search') }
])

// 海报随滚动慢半拍上移并渐暗（视差）；下拉越界时放大
const posterArtStyle = computed(() => {
  const top = scrollTop.value
  if (top < 0) return { transform: `scale(${1 + Math.min(0.25, -top / 400)})` }
  return { transform: `translateY(${top * 0.4}px)`, opacity: String(Math.max(0.2, 1 - top / 420)) }
})
// 名字滚到导航下方之前开始淡出，同时浮出导航里的名字胶囊
const titleThreshold = computed(() => (posterImage.value ? 300 : 200))
const titleProgress = computed(() => Math.min(1, Math.max(0, (scrollTop.value - titleThreshold.value) / 70)))

watch(() => [props.visible, props.contact?.avatar, props.contact?.avatarType], async ([visible]) => {
  if (!visible) {
    scrollTop.value = 0
    return
  }
  const source = props.isGroup ? members.value[0] : props.contact
  tint.value = source ? await getImageTint({ avatar: source.avatar, avatarType: source.avatarType }) : ''
}, { immediate: true })

function onScroll() {
  scrollTop.value = scrollEl.value?.scrollTop || 0
}

function cssUrl(url) {
  // 引号、反斜杠、空白会截断 CSS url()，转成百分号编码
  return `url("${String(url || '').replace(/["\\\s]/g, encodeURIComponent)}")`
}

// 单聊：资料就地编辑；群聊仍走群聊编辑面板
function onEdit() {
  if (!props.isGroup && settingsRef.value) settingsRef.value.openProfile()
  else emit('edit')
}

function openPhotos(index) {
  viewerIndex.value = index
  viewerImages.value = photos.value.slice()
}
</script>

<style scoped>
.contact-card {
  position: absolute;
  inset: 0;
  z-index: 40;
  overflow: hidden;
  color: #fff;
  background: var(--contact-tint);
}

.cc-backdrop {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(120% 55% at 50% 0%, color-mix(in srgb, var(--contact-tint) 65%, #fff 35%) 0%, transparent 72%),
    linear-gradient(180deg, var(--contact-tint) 0%, color-mix(in srgb, var(--contact-tint) 72%, #000 28%) 100%);
}

.cc-backdrop-photo {
  position: absolute;
  inset: -80px;
  background-size: cover;
  background-position: center;
  filter: blur(60px) saturate(1.7);
  opacity: 0.55;
  mix-blend-mode: soft-light;
}

.cc-scroll {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

/* ===== 海报 ===== */
.cc-poster {
  position: relative;
  height: 380px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  padding: 0 24px 22px;
  text-align: center;
}

.cc-poster.has-photo {
  height: min(68vh, 520px);
}

.cc-poster-art {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transform-origin: 50% 0;
  will-change: transform;
}

.cc-poster-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  -webkit-mask-image: linear-gradient(180deg, #000 0%, #000 58%, transparent 100%);
  mask-image: linear-gradient(180deg, #000 0%, #000 58%, transparent 100%);
}

.cc-poster-emoji {
  margin-top: 10px;
  font-size: 128px;
  line-height: 1;
  filter: drop-shadow(0 18px 30px rgba(0, 0, 0, 0.25));
}

.cc-poster-cluster {
  position: relative;
  width: 210px;
  height: 190px;
  margin-top: 10px;
}

.cc-poster-member {
  position: absolute;
  border-radius: 999px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.6), 0 10px 26px rgba(0, 0, 0, 0.22);
  font-size: 44px;
}

.cc-poster-member > img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cc-poster-member.is-slot-0 { width: 112px; height: 112px; top: 4px; left: 12px; z-index: 2; }
.cc-poster-member.is-slot-1 { width: 84px; height: 84px; top: 46px; right: 4px; z-index: 1; }
.cc-poster-member.is-slot-2 { width: 70px; height: 70px; bottom: 2px; left: 92px; z-index: 3; }

.cc-poster-text {
  position: relative;
  max-width: 100%;
}

.cc-name {
  font-size: 40px;
  font-weight: 800;
  line-height: 1.08;
  letter-spacing: -0.02em;
  overflow-wrap: anywhere;
  text-shadow: 0 2px 18px rgba(0, 0, 0, 0.28);
}

.cc-subtitle {
  margin-top: 6px;
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.84);
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.2);
}

/* ===== 内容 ===== */
.cc-body {
  position: relative;
  padding: 4px 16px calc(var(--app-pb, 0px) + 32px);
}

.cc-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 18px;
}

.cc-action {
  width: 62px;
  height: 62px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cc-action > i {
  font-size: 26px;
}

/* ===== 悬浮导航 ===== */
.cc-nav {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: calc(var(--app-pt, 0px) + 6px) 16px 0;
  pointer-events: none;
}

.cc-nav::before {
  content: "";
  position: absolute;
  inset: 0 0 -28px;
  z-index: -1;
  opacity: var(--cc-scrim, 0);
  background: linear-gradient(180deg, var(--contact-tint) 0%, color-mix(in srgb, var(--contact-tint) 70%, transparent) 60%, transparent 100%);
  pointer-events: none;
}

.cc-nav > * {
  pointer-events: auto;
}

.cc-round {
  flex: none;
  width: 44px;
  height: 44px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

.cc-pill {
  flex: none;
  height: 44px;
  padding: 0 18px;
  border-radius: 999px;
  font-size: 16px;
  font-weight: 600;
}

.cc-title-pill {
  min-width: 0;
  height: 40px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px 0 5px;
  border-radius: 999px;
  transition: opacity 0.12s linear;
}

.cc-title-pill[aria-hidden="true"] {
  pointer-events: none;
}

.cc-title-avatar {
  flex: none;
  width: 30px;
  height: 30px;
  border-radius: 999px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  font-size: 17px;
}

.cc-title-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cc-title-name {
  font-size: 15px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .cc-poster-art { transform: none !important; }
}

.contact-card-enter-active,
.contact-card-leave-active {
  transition: opacity 0.3s cubic-bezier(0.32, 0.72, 0, 1), transform 0.46s cubic-bezier(0.32, 0.72, 0, 1);
}

.contact-card-enter-from,
.contact-card-leave-to {
  opacity: 0;
  transform: scale(0.92);
  border-radius: 40px;
}
</style>
