<template>
  <div class="kk-sheet-dim" :class="{ open }" @click="emit('close')"></div>
  <section class="kk-sheet" :class="{ open }" aria-label="小组件设置">
    <div class="kk-sheet-grab"></div>
    <div class="kk-sheet-head">
      <h2>{{ title }}</h2>
      <button class="kk-sheet-x" type="button" aria-label="关闭" @click="emit('close')"><i class="ph-bold ph-x"></i></button>
    </div>
    <div v-if="item" class="kk-sheet-body">
      <template v-if="item.type === 'image'">
        <h3>照片</h3>
        <div style="display: flex; gap: 10px; margin-bottom: 14px">
          <button class="kk-ghost" type="button" @click="fileInput?.click()">{{ cfg.src ? '换一张' : '选一张' }}</button>
          <button v-if="cfg.src" class="kk-ghost" type="button" @click="emit('config', { src: '', srcRef: '' })">拿掉</button>
        </div>
        <input ref="fileInput" type="file" accept="image/*" hidden @change="onPickImage">
        <label class="kk-field"><span>底下写一句</span><input :value="cfg.caption || ''" maxlength="16" placeholder="比如：那天的晚霞" @change="emit('config', { caption: $event.target.value.trim() })"></label>
      </template>

      <template v-if="item.type === 'anniv'">
        <label class="kk-field"><span>从哪天算起（不填就用第一条消息那天）</span><input type="date" :value="cfg.since || ''" @change="emit('config', { since: $event.target.value })"></label>
        <label class="kk-field"><span>写在数字旁边</span><input :value="cfg.label || ''" maxlength="12" placeholder="比如：在一起" @change="emit('config', { label: $event.target.value.trim() })"></label>
      </template>

      <template v-if="item.type === 'countdown'">
        <p class="kk-sheet-sub">不填就自动数到「日程」里最近的一件事。</p>
        <label class="kk-field"><span>是什么日子</span><input :value="cfg.title || ''" maxlength="12" placeholder="比如：见面" @change="emit('config', { title: $event.target.value.trim() })"></label>
        <label class="kk-field"><span>哪一天</span><input type="date" :value="cfg.date || ''" @change="emit('config', { date: $event.target.value })"></label>
      </template>

      <template v-if="CONTACT_TYPES.has(item.type)">
        <h3>{{ item.type === 'companion' ? '贴谁的卡' : '看谁的' }}</h3>
        <button class="kk-pick" :class="{ on: !cfg.contactId }" type="button" @click="emit('config', { contactId: '' })">
          <span class="kk-pick-ava"><i class="ph ph-sparkle"></i></span>
          <span class="kk-pick-name">自动<br><span class="kk-pick-sub">最近聊过的那位</span></span>
        </button>
        <button
          v-for="c in contacts"
          :key="c.id"
          class="kk-pick"
          :class="{ on: cfg.contactId === c.id }"
          type="button"
          @click="emit('config', { contactId: c.id })"
        >
          <span class="kk-pick-ava">
            <img v-if="avatarOf(c).kind === 'image'" :src="avatarOf(c).value" alt="">
            <template v-else>{{ avatarOf(c).value }}</template>
          </span>
          <span class="kk-pick-name">{{ c.name || '未命名' }}</span>
        </button>
      </template>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useContactsStore } from '../../../stores/contacts'
import { compressImage } from '../../../composables/useImage'
import { HOME_CONTACT_WIDGET_TYPES as CONTACT_TYPES, HOME_WIDGET_CATALOG } from '../homeLayout'
import { avatarOf, isSingleContact } from '../composables/useHomeCompanion'

const props = defineProps({
  open: { type: Boolean, default: false },
  item: { type: Object, default: null }
})
const emit = defineEmits(['close', 'config'])

const contactsStore = useContactsStore()
const fileInput = ref(null)

const cfg = computed(() => props.item?.config || {})
const contacts = computed(() => (contactsStore.contacts || []).filter(isSingleContact))
const title = computed(() => HOME_WIDGET_CATALOG.find(c => c.type === props.item?.type)?.name || '小组件')

async function onPickImage(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  const src = await compressImage(file, 800)
  emit('config', { src, srcRef: '' })
}
</script>
