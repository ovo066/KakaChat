<template>
  <div class="kk-polaroid" @click="openMoment">
    <span class="kk-tape t-sage"></span>
    <div class="mo-photo">
      <template v-if="moment">
        <img v-if="image" :src="image" alt="" draggable="false">
        <div v-else class="mo-text"><span>{{ moment.content || (moment.voiceText ? '[语音]' : '…') }}</span></div>
        <span class="mo-who">{{ moment.authorName }} · {{ timeText }}</span>
      </template>
      <div v-else class="mo-ph"><i class="ph-duotone ph-shooting-star"></i></div>
    </div>
    <div class="mo-foot">
      <span class="mo-cap">{{ caption }}</span>
      <span v-if="moment" class="mo-acts">
        <button class="mo-like" :class="{ on: moment.isLiked }" type="button" @click.stop="like">
          <i :class="moment.isLiked ? 'ph-fill ph-heart' : 'ph ph-heart'"></i>{{ moment.likes || 0 }}
        </button>
        <span><i class="ph ph-chat-circle"></i>{{ moment.replies?.length || 0 }}</span>
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useMomentsStore } from '../../../../stores/moments'
import { useStorage } from '../../../../composables/useStorage'
import { formatRelativeTime } from '../../../../utils/relativeTime'
import { useHomeNow } from '../../composables/useHomeCompanion'

const props = defineProps({
  item: { type: Object, required: true },
  preview: { type: Boolean, default: false }
})

const router = useRouter()
const momentsStore = useMomentsStore()
const { scheduleSave } = useStorage()
const now = useHomeNow()

const moment = computed(() => {
  const list = momentsStore.sortedMoments || []
  const selfId = momentsStore.forumUser?.id
  return list.find(m => m.authorId !== 'user' && m.authorId !== selfId) || list[0] || null
})

const image = computed(() => {
  const first = moment.value?.images?.[0]
  return typeof first === 'string' ? first : (first?.url || '')
})

const timeText = computed(() => formatRelativeTime(moment.value?.time, { now: now.value }))

const caption = computed(() => {
  const m = moment.value
  if (!m) return '还没有动态'
  const text = String(m.content || '').replace(/\s+/g, ' ').trim()
  if (!image.value) return m.tags?.[0] ? `#${m.tags[0]}` : `${m.authorName} 的动态`
  return text ? (text.length > 10 ? text.slice(0, 10) + '…' : text) : '无题'
})

function like() {
  if (props.preview || !moment.value) return
  momentsStore.likeMoment(moment.value.id)
  scheduleSave()
}

function openMoment() {
  if (props.preview) return
  router.push(moment.value ? '/moments/' + moment.value.id : '/moments')
}
</script>
