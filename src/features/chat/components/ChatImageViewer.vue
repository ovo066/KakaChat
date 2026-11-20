<template>
  <Teleport to="body">
    <Transition name="chat-image-viewer-fade" appear>
      <div
        v-if="images.length > 0"
        class="chat-image-viewer"
        role="dialog"
        aria-modal="true"
        aria-label="查看图片"
      >
        <div class="chat-image-viewer-top">
          <button type="button" class="chat-image-viewer-btn" aria-label="关闭" @click="emit('close')">
            <i class="ph-bold ph-x"></i>
          </button>
          <span v-if="images.length > 1" class="chat-image-viewer-count">{{ current + 1 }} / {{ images.length }}</span>
          <button type="button" class="chat-image-viewer-btn" aria-label="保存图片" @click="saveCurrent">
            <i class="ph-bold ph-download-simple"></i>
          </button>
        </div>

        <!-- 横向分页：原生滚动吸附，手指左右滑就能翻页 -->
        <div ref="trackEl" class="chat-image-viewer-track" @scroll.passive="onTrackScroll">
          <div
            v-for="(url, idx) in images"
            :key="idx"
            class="chat-image-viewer-slide"
            @click.self="emit('close')"
          >
            <img :src="url" alt="" class="chat-image-viewer-img" draggable="false" :loading="Math.abs(idx - current) > 1 ? 'lazy' : 'eager'">
          </div>
        </div>

        <template v-if="images.length > 1">
          <button v-if="current > 0" type="button" class="chat-image-viewer-nav is-prev" aria-label="上一张" @click="goTo(current - 1)">
            <i class="ph-bold ph-caret-left"></i>
          </button>
          <button v-if="current < images.length - 1" type="button" class="chat-image-viewer-nav is-next" aria-label="下一张" @click="goTo(current + 1)">
            <i class="ph-bold ph-caret-right"></i>
          </button>

          <div ref="thumbsEl" class="chat-image-viewer-thumbs">
            <button
              v-for="(url, idx) in images"
              :key="idx"
              type="button"
              class="chat-image-viewer-thumb"
              :class="{ 'is-active': idx === current }"
              :aria-label="`第 ${idx + 1} 张`"
              :aria-current="idx === current ? 'true' : undefined"
              @click="goTo(idx)"
            >
              <img :src="url" alt="" loading="lazy" draggable="false">
            </button>
          </div>
        </template>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { downloadImageUrl } from '../../../utils/imageDownload'

const props = defineProps({
  images: { type: Array, default: () => [] },
  startIndex: { type: Number, default: 0 }
})

const emit = defineEmits(['close'])

const current = ref(0)
const trackEl = ref(null)
const thumbsEl = ref(null)
const currentUrl = computed(() => props.images[current.value] || '')

function clampIndex(index) {
  return Math.min(Math.max(0, index), Math.max(0, props.images.length - 1))
}

function scrollTrackTo(index, behavior = 'smooth') {
  const track = trackEl.value
  if (!track) return
  track.scrollTo({ left: index * track.clientWidth, behavior })
}

function goTo(index) {
  const next = clampIndex(index)
  current.value = next
  scrollTrackTo(next)
}

function onTrackScroll() {
  const track = trackEl.value
  if (!track || !track.clientWidth) return
  current.value = clampIndex(Math.round(track.scrollLeft / track.clientWidth))
}

// 缩略图条跟着当前页滚动，保证选中的那张可见
watch(current, (index) => {
  const thumb = thumbsEl.value?.children?.[index]
  thumb?.scrollIntoView?.({ behavior: 'smooth', inline: 'center', block: 'nearest' })
})

watch(() => [props.images, props.startIndex], async () => {
  current.value = clampIndex(props.startIndex)
  await nextTick()
  scrollTrackTo(current.value, 'auto')
}, { immediate: true })

function saveCurrent() {
  downloadImageUrl(currentUrl.value, current.value)
}

function onKeydown(event) {
  if (event.key === 'Escape') emit('close')
  else if (event.key === 'ArrowRight') goTo(current.value + 1)
  else if (event.key === 'ArrowLeft') goTo(current.value - 1)
}

onMounted(() => {
  if (typeof window !== 'undefined') window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') window.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.chat-image-viewer {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: #000;
}

.chat-image-viewer-top {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(var(--app-pt, 0px) + 10px) 14px 10px;
  pointer-events: none;
}

.chat-image-viewer-top > * {
  pointer-events: auto;
}

.chat-image-viewer-count {
  padding: 5px 12px;
  border-radius: 999px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  background: rgba(255, 255, 255, 0.14);
}

.chat-image-viewer-btn,
.chat-image-viewer-nav {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  background: rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.chat-image-viewer-track {
  position: absolute;
  inset: 0;
  display: flex;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  overscroll-behavior: contain;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.chat-image-viewer-track::-webkit-scrollbar {
  display: none;
}

.chat-image-viewer-slide {
  flex: 0 0 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(var(--app-pt, 0px) + 60px) 0 calc(var(--app-pb, 0px) + 92px);
  scroll-snap-align: center;
  scroll-snap-stop: always;
}

.chat-image-viewer-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
}

.chat-image-viewer-nav {
  position: absolute;
  top: 50%;
  z-index: 2;
  transform: translateY(-50%);
}

.chat-image-viewer-nav.is-prev { left: 10px; }
.chat-image-viewer-nav.is-next { right: 10px; }

.chat-image-viewer-thumbs {
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(var(--app-pb, 0px) + 18px);
  z-index: 2;
  display: flex;
  justify-content: safe center;
  gap: 4px;
  padding: 0 16px;
  overflow-x: auto;
  scrollbar-width: none;
}

.chat-image-viewer-thumbs::-webkit-scrollbar {
  display: none;
}

.chat-image-viewer-thumb {
  flex: none;
  width: 40px;
  height: 52px;
  border-radius: 8px;
  overflow: hidden;
  opacity: 0.5;
  transition: opacity 0.2s ease, transform 0.2s ease, width 0.2s ease;
}

.chat-image-viewer-thumb.is-active {
  width: 48px;
  opacity: 1;
  box-shadow: 0 0 0 2px #fff;
}

.chat-image-viewer-thumb > img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.chat-image-viewer-fade-enter-active,
.chat-image-viewer-fade-leave-active {
  transition: opacity 0.22s ease;
}

.chat-image-viewer-fade-enter-from,
.chat-image-viewer-fade-leave-to {
  opacity: 0;
}
</style>
