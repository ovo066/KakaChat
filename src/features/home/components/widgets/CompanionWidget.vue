<template>
  <div class="kk-card" @click="openChat()">
    <div class="kk-polaroid ava-pola">
      <span class="kk-tape t-pink stripe"></span>
      <div class="ava-photo">
        <img v-if="avatar.kind === 'image'" :src="avatar.value" alt="" draggable="false">
        <span v-else>{{ avatar.value }}</span>
      </div>
      <div class="pola-cap">{{ name }} ♡</div>
    </div>
    <span v-if="unread" class="kk-unread">{{ unread > 99 ? '99+' : unread }} 条新消息</span>

    <template v-if="contact">
      <div class="c-head">
        <b>{{ name }}</b>
        <span class="online" :class="{ busy: activity && !activity.interruptible }"><i></i>{{ statusText }}</span>
        <span v-if="moodLabel" :key="moodLabel" class="mood-tag">{{ moodLabel }}</span>
      </div>
      <div :key="lastMessage?.time || 0" class="kk-bubble" :class="{ me: lastMessage?.fromUser }">
        <template v-if="lastMessage">
          <em v-if="lastMessage.fromUser">你：</em>{{ lastMessage.text }}
        </template>
        <em v-else>还没聊过天，打个招呼吧。</em>
      </div>
      <div class="kk-chips">
        <button
          v-for="chip in chips"
          :key="chip"
          class="kk-chip"
          type="button"
          @click.stop="openChat(chip)"
        >{{ chip }}</button>
      </div>
    </template>
    <template v-else>
      <div class="c-head"><b>还没有角色</b></div>
      <div class="kk-bubble"><em>去「消息」里添加一个角色，TA 会出现在这里。</em></div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  avatarOf,
  quickRepliesFor,
  useHomeCompanion,
  useHomeNow
} from '../../composables/useHomeCompanion'
import { getHour } from '../../../../utils/beijingTime'

const props = defineProps({
  item: { type: Object, required: true },
  preview: { type: Boolean, default: false }
})

const router = useRouter()
const now = useHomeNow()
const { contact, name, lastMessage, unread, activity, moodLabel } = useHomeCompanion(computed(() => props.item.config?.contactId))

const avatar = computed(() => avatarOf(contact.value))
const chips = computed(() => quickRepliesFor(getHour(new Date(now.value))))
const statusText = computed(() => {
  const act = activity.value
  if (act?.activity) return act.activity.length > 6 ? act.activity.slice(0, 6) + '…' : act.activity
  return '在线'
})

/** 快捷回复：带着这句话进聊天，由聊天页发出并请求回复 */
function openChat(quick = '') {
  if (props.preview) return
  const c = contact.value
  if (!c) {
    router.push('/messages')
    return
  }
  router.push(quick ? { path: '/chat/' + c.id, query: { quick } } : '/chat/' + c.id)
}
</script>
