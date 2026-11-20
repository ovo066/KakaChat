<template>
  <div class="kk-card" :class="{ playing: musicStore.isPlaying }">
    <div class="cassette" @click="openPlayer">
      <div class="cs-label"><b>{{ track ? track.title : '空白磁带' }}</b><em>side A</em></div>
      <div class="cs-win"><span class="reel"></span><span class="reel"></span></div>
      <div class="cs-holes"><i></i><i></i></div>
    </div>
    <div class="mu-info">
      <span class="mu-from">{{ fromText }}</span>
      <span class="mu-title">{{ track ? track.title : '还没有在放的歌' }}</span>
      <span class="mu-lyric">{{ lyricText }}</span>
      <div class="mu-bar"><i :style="{ width: progressPct + '%' }"></i></div>
      <div class="mu-row">
        <span class="mu-time">{{ fmt(musicStore.progress) }}</span>
        <span class="mu-ctl">
          <button type="button" aria-label="上一首" :disabled="!hasQueue" @click="musicStore.prevTrack()"><i class="ph-fill ph-skip-back"></i></button>
          <button class="mu-play" type="button" :aria-label="musicStore.isPlaying ? '暂停' : '播放'" @click="togglePlay"><i class="ph-fill" :class="musicStore.isPlaying ? 'ph-pause' : 'ph-play'"></i></button>
          <button type="button" aria-label="下一首" :disabled="!hasQueue" @click="musicStore.nextTrack()"><i class="ph-fill ph-skip-forward"></i></button>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useContactsStore } from '../../../../stores/contacts'
import { useMusicStore } from '../../../../stores/music'
import { useLyrics } from '../../../../composables/useLyrics'

const props = defineProps({
  item: { type: Object, required: true },
  preview: { type: Boolean, default: false }
})

const musicStore = useMusicStore()
const contactsStore = useContactsStore()
const { currentLineText } = useLyrics()

const track = computed(() => musicStore.currentTrack)
const hasQueue = computed(() => musicStore.queue.length > 0)

const fromText = computed(() => {
  if (musicStore.listenTogether && musicStore.listenContactId) {
    const c = contactsStore.contacts.find(x => x.id === musicStore.listenContactId)
    if (c) return `和 ${c.name} 一起听`
  }
  if (track.value) return track.value.artist || '未知歌手'
  return musicStore.library.length ? `歌单里有 ${musicStore.library.length} 首` : '歌单是空的'
})

const lyricText = computed(() => {
  if (!track.value) return musicStore.library.length ? '按播放，从歌单第一首开始' : '点磁带去搜一首'
  return currentLineText.value || '♪'
})

const progressPct = computed(() => {
  const d = Number(musicStore.duration || 0)
  if (!d) return 0
  return Math.min(100, (Number(musicStore.progress || 0) / d) * 100)
})

function fmt(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function togglePlay() {
  if (props.preview) return
  if (hasQueue.value) {
    musicStore.togglePlay()
    return
  }
  const first = musicStore.library[0]
  if (first) musicStore.playTrack({ ...first })
  else musicStore.libraryOpen = true
}

function openPlayer() {
  if (props.preview) return
  if (track.value) musicStore.playerOpen = true
  else musicStore.libraryOpen = true
}
</script>
