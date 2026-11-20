<script setup>
import { computed } from 'vue'
import { useMusicStore } from '../../../stores/music'
import { useMusic } from '../composables/useMusic'
import { useLyrics } from '../../../composables/useLyrics'
import { useDynamicIsland } from '../../../composables/useDynamicIsland'

const musicStore = useMusicStore()
const { togglePlay } = useMusic()
const { currentLineText } = useLyrics()
// 灵动岛正在展示通知时先让位，通知收起后再回来
const { isExpanded: notificationOpen } = useDynamicIsland()

const track = computed(() => musicStore.currentTrack)
const expanded = computed(() => !!musicStore.islandExpanded)

const showingLyric = computed(() => !!currentLineText.value)

const displayText = computed(() => {
  if (currentLineText.value) return currentLineText.value
  if (!track.value) return ''
  return track.value.title + (track.value.artist ? ` · ${track.value.artist}` : '')
})

const toggleExpand = () => {
  musicStore.islandExpanded = !musicStore.islandExpanded
}

const handlePlayPause = (e) => {
  e.stopPropagation()
  togglePlay()
}

const openPlayer = (e) => {
  e.stopPropagation()
  musicStore.islandExpanded = false
  musicStore.playerOpen = true
}

const exitListenTogether = (e) => {
  e.stopPropagation()
  musicStore.exitListenTogether()
}

const formatTime = (seconds) => {
  if (!seconds) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const progressPercent = computed(() => {
  if (!musicStore.duration) return 0
  return (musicStore.progress / musicStore.duration) * 100
})
</script>

<template>
  <Teleport defer to="#screen">
    <div
      v-if="track"
      class="music-island"
      :class="[expanded ? 'is-expanded' : 'is-collapsed', { 'is-yielding': notificationOpen && !expanded }]"
      @click="!expanded && toggleExpand()"
    >
      <Transition name="mi-swap" mode="out-in">
        <!-- 紧凑态：左封面、右声波，中间滚动歌词 -->
        <div v-if="!expanded" key="compact" class="mi-compact">
          <div class="mi-art mi-art-sm">
            <img v-if="track.cover" :src="track.cover" alt="">
            <i v-else class="ph-fill ph-music-note"></i>
          </div>
          <div class="mi-compact-text">
            <Transition name="lyric-fade" mode="out-in">
              <div
                :key="displayText"
                class="mi-compact-line"
                :class="showingLyric ? 'island-lyric' : 'island-marquee'"
              >{{ displayText }}</div>
            </Transition>
          </div>
          <button class="mi-wave" :class="{ 'is-playing': musicStore.isPlaying }" aria-label="播放/暂停" @click="handlePlayPause">
            <span v-for="n in 4" :key="n"></span>
          </button>
        </div>

        <!-- 展开态：仿 iOS 音乐实时活动 -->
        <div v-else key="expanded" class="mi-expanded">
          <div class="mi-head">
            <div class="mi-head-main" @click="openPlayer">
              <div class="mi-art mi-art-lg">
                <img v-if="track.cover" :src="track.cover" alt="">
                <i v-else class="ph-fill ph-music-note"></i>
              </div>
              <div class="mi-meta">
                <div class="mi-title">{{ track.title }}</div>
                <div class="mi-artist">{{ track.artist || '未知歌手' }}</div>
              </div>
            </div>
            <div class="mi-wave mi-wave-lg" :class="{ 'is-playing': musicStore.isPlaying }" aria-hidden="true">
              <span v-for="n in 4" :key="n"></span>
            </div>
          </div>

          <div class="mi-progress">
            <span>{{ formatTime(musicStore.progress) }}</span>
            <div class="mi-track"><div class="mi-fill" :style="{ width: `${progressPercent}%` }"></div></div>
            <span>-{{ formatTime(Math.max(0, (musicStore.duration || 0) - (musicStore.progress || 0))) }}</span>
          </div>

          <div class="mi-controls">
            <button
              class="mi-ctrl mi-ctrl-side"
              :class="musicStore.listenTogether ? 'is-on' : ''"
              aria-label="一起听"
              @click.stop="musicStore.setListenTogether(musicStore.listenContactId, !musicStore.listenTogether)"
            >
              <i class="ph-fill ph-users"></i>
            </button>
            <button class="mi-ctrl" aria-label="上一首" @click.stop="musicStore.prevTrack()">
              <i class="ph-fill ph-rewind"></i>
            </button>
            <button class="mi-ctrl mi-ctrl-main" aria-label="播放/暂停" @click="handlePlayPause">
              <i :class="musicStore.isPlaying ? 'ph-fill ph-pause' : 'ph-fill ph-play'"></i>
            </button>
            <button class="mi-ctrl" aria-label="下一首" @click.stop="musicStore.nextTrack()">
              <i class="ph-fill ph-fast-forward"></i>
            </button>
            <button class="mi-ctrl mi-ctrl-side" aria-label="收起" @click.stop="toggleExpand">
              <i class="ph-bold ph-caret-up"></i>
            </button>
          </div>

          <button v-if="musicStore.listenTogether" class="mi-leave" @click="exitListenTogether">退出一起听</button>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<style scoped>
.music-island {
  --mi-spring: cubic-bezier(0.2, 1.18, 0.36, 1);
  position: absolute;
  top: 11px;
  left: 50%;
  z-index: 61;
  overflow: hidden;
  color: #fff;
  background: #000;
  transform: translateX(-50%);
  transition:
    width 0.55s var(--mi-spring),
    height 0.55s var(--mi-spring),
    border-radius 0.55s var(--mi-spring),
    opacity 0.2s ease,
    transform 0.3s ease,
    box-shadow 0.3s ease;
}

.is-collapsed {
  width: 212px;
  height: 36px;
  border-radius: 18px;
  cursor: pointer;
}

.is-collapsed:active {
  transform: translateX(-50%) scale(0.96);
}

.is-expanded {
  width: calc(100% - 22px);
  max-width: 368px;
  height: 168px;
  border-radius: 42px;
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.28);
}

.is-yielding {
  opacity: 0;
  pointer-events: none;
  transform: translateX(-50%) scale(0.9);
}

.mi-compact {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 100%;
  padding: 0 10px 0 6px;
}

.mi-art {
  flex-shrink: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.7);
  background: linear-gradient(135deg, #5e5ce6, #bf5af2);
}

.mi-art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mi-art-sm {
  width: 24px;
  height: 24px;
  border-radius: 7px;
  font-size: 13px;
}

.mi-art-lg {
  width: 52px;
  height: 52px;
  border-radius: 13px;
  font-size: 24px;
}

.mi-compact-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.mi-compact-line {
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  color: rgba(255, 255, 255, 0.92);
}

/* 声波：播放时跳动，暂停时收成小点 */
.mi-wave {
  flex-shrink: 0;
  height: 16px;
  display: flex;
  align-items: center;
  gap: 2px;
}

.mi-wave span {
  width: 3px;
  height: 4px;
  border-radius: 2px;
  background: var(--primary-color, #0a84ff);
  transition: height 0.25s ease;
}

.mi-wave.is-playing span {
  animation: mi-wave 0.9s ease-in-out infinite;
}

.mi-wave.is-playing span:nth-child(2) { animation-delay: -0.45s; }
.mi-wave.is-playing span:nth-child(3) { animation-delay: -0.2s; }
.mi-wave.is-playing span:nth-child(4) { animation-delay: -0.65s; }

.mi-wave-lg {
  height: 22px;
  gap: 3px;
}

.mi-wave-lg span {
  width: 3.5px;
}

@keyframes mi-wave {
  0%, 100% { height: 4px; }
  50% { height: 15px; }
}

.mi-expanded {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 18px 22px 14px;
}

.mi-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mi-head-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.mi-meta {
  min-width: 0;
}

.mi-title {
  font-size: 15px;
  font-weight: 600;
  line-height: 20px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mi-artist {
  font-size: 14px;
  line-height: 19px;
  color: rgba(235, 235, 245, 0.6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mi-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: rgba(235, 235, 245, 0.55);
}

.mi-track {
  flex: 1;
  height: 5px;
  border-radius: 3px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.22);
}

.mi-fill {
  height: 100%;
  border-radius: inherit;
  background: #fff;
  transition: width 0.3s linear;
}

.mi-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  padding: 0 4px;
}

.mi-ctrl {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  color: #fff;
  transition: transform 0.15s ease, background-color 0.2s ease;
}

.mi-ctrl:active {
  transform: scale(0.88);
  background: rgba(255, 255, 255, 0.12);
}

.mi-ctrl-main {
  font-size: 32px;
}

.mi-ctrl-side {
  font-size: 18px;
  color: rgba(235, 235, 245, 0.55);
}

.mi-ctrl-side.is-on {
  color: var(--primary-color, #0a84ff);
}

.mi-leave {
  align-self: center;
  margin-top: 6px;
  padding: 4px 14px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.75);
  background: rgba(255, 255, 255, 0.12);
}

.is-expanded:has(.mi-leave) {
  height: 196px;
}

.island-marquee {
  display: inline-block;
  padding-left: 100%;
  animation: island-scroll 9s linear infinite;
}

.island-lyric {
  display: block;
  text-overflow: ellipsis;
  overflow: hidden;
  max-width: 100%;
  text-align: center;
}

.lyric-fade-enter-active,
.lyric-fade-leave-active {
  transition: opacity 0.3s ease;
}

.lyric-fade-enter-from,
.lyric-fade-leave-to {
  opacity: 0;
}

.mi-swap-enter-active {
  transition: opacity 0.26s ease 0.12s, filter 0.26s ease 0.12s, transform 0.4s var(--mi-spring) 0.08s;
}

.mi-swap-leave-active {
  transition: opacity 0.12s ease, filter 0.12s ease;
}

.mi-swap-enter-from {
  opacity: 0;
  filter: blur(6px);
  transform: scale(0.92);
}

.mi-swap-leave-to {
  opacity: 0;
  filter: blur(4px);
}

@keyframes island-scroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-100%); }
}

@media (prefers-reduced-motion: reduce) {
  .music-island {
    transition-duration: 0.01s;
  }

  .mi-wave.is-playing span,
  .island-marquee {
    animation: none;
  }
}
</style>
