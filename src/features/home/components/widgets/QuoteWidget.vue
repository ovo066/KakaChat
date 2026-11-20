<template>
  <div class="kk-card" @click="next">
    <span class="qt-mark">"</span>
    <p :key="current?.key || 'empty'" class="qt-txt">{{ current ? `「${current.text}」` : '还没有收藏的句子。在聊天里长按一条消息，点「收藏」，就会贴到这里。' }}</p>
    <div class="qt-foot">
      <span v-if="current"><i class="ph-fill ph-star"></i>{{ current.contactName }} · 收藏于 {{ current.dateText }}</span>
      <span v-else><i class="ph-fill ph-star"></i>收藏</span>
      <span v-if="quotes.length > 1" class="qt-next">换一句 →</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useContactsStore } from '../../../../stores/contacts'
import { collectFavorites } from '../../../../utils/favorites'

const props = defineProps({
  item: { type: Object, required: true },
  preview: { type: Boolean, default: false }
})
const emit = defineEmits(['config'])

const contactsStore = useContactsStore()

const quotes = computed(() => collectFavorites(contactsStore.contacts)
  .filter(f => f.role !== 'user' && !f.imageUrl)
  .map((f) => {
    const text = String(f.detailContent || f.snippet || '').replace(/\s+/g, ' ').trim()
    const d = f.time ? new Date(f.time) : null
    return {
      key: f.key,
      text,
      contactName: f.contactName,
      dateText: d ? `${d.getMonth() + 1} 月 ${d.getDate()} 日` : ''
    }
  })
  .filter(q => q.text && !/^\[[^\]]+\]$/.test(q.text)))

const current = computed(() => {
  const list = quotes.value
  if (!list.length) return null
  const qi = Math.abs(Number(props.item.config?.qi || 0)) % list.length
  return list[qi]
})

function next() {
  if (props.preview || quotes.value.length < 2) return
  emit('config', { qi: (Number(props.item.config?.qi || 0) + 1) % quotes.value.length })
}
</script>
