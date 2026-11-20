import { computed, onBeforeUnmount, ref, unref } from 'vue'
import { useContactsStore } from '../../../stores/contacts'
import { useLivenessStore } from '../../../stores/liveness'
import { usePlannerStore } from '../../../stores/planner'
import { buildContactMessageSummary, readCachedContactMessageSummary } from '../../../utils/contactMessageSummary'
import { getDateParts, getHour, getWeekdayIndex } from '../../../utils/beijingTime'

// ---- 共享时钟：桌面上的多个小组件共用一个定时器 ----

const now = ref(Date.now())
let clockTimer = null
let clockUsers = 0

/** 每秒跳一次的当前时间戳（按需启动，没人用就停）。 */
export function useHomeNow() {
  clockUsers += 1
  if (!clockTimer) {
    now.value = Date.now()
    clockTimer = setInterval(() => { now.value = Date.now() }, 1000)
  }
  onBeforeUnmount(() => {
    clockUsers -= 1
    if (clockUsers <= 0 && clockTimer) {
      clearInterval(clockTimer)
      clockTimer = null
      clockUsers = 0
    }
  })
  return now
}

export const WEEKDAY_LABELS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
export const MONTH_LABELS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']

export function getHomeDate(ts = Date.now()) {
  const d = new Date(ts)
  return { ...getDateParts(d), weekday: getWeekdayIndex(d) }
}

export function greetingFor(hour) {
  if (hour < 6) return '夜深了'
  if (hour < 11) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

// ---- 快捷回复：按时段给三句 ----

const QUICK_REPLIES = [
  { until: 6, chips: ['还没睡', '睡不着', '陪我聊会儿'] },
  { until: 11, chips: ['早安', '起床啦', '在干嘛'] },
  { until: 14, chips: ['吃了吗', '午休中', '在干嘛'] },
  { until: 18, chips: ['好困', '想你了', '在干嘛'] },
  { until: 22, chips: ['下班啦', '想你了', '今天好累'] },
  { until: 24, chips: ['晚安', '再聊会儿', '明天见'] }
]

export function quickRepliesFor(hour) {
  return (QUICK_REPLIES.find(set => hour < set.until) || QUICK_REPLIES[QUICK_REPLIES.length - 1]).chips
}

// ---- 角色 ----

export function isSingleContact(contact) {
  return !!contact && contact.type !== 'group'
}

function lastActivityTime(contact) {
  return Number(readCachedContactMessageSummary(contact).lastMsgTime || 0)
}

/** 由拟真互动的状态推一个心情标签；没有状态时返回空。 */
export function moodLabelFromState(state) {
  if (!state) return ''
  if (state.loneliness > 0.6) return '有点想你'
  if (state.energy < 0.25) return '困了'
  if (state.mood >= 0.8) return '开心'
  if (state.mood <= 0.3) return '有点低落'
  if (state.affection >= 0.75) return '黏人'
  return '平静'
}

/**
 * 解析桌面上某个小组件绑定的角色：指定的 contactId 优先，否则取最近聊过的单聊角色。
 * @param {import('vue').Ref<string>|string} contactIdRef
 */
export function useHomeCompanion(contactIdRef) {
  const contactsStore = useContactsStore()
  const livenessStore = useLivenessStore()
  const plannerStore = usePlannerStore()

  const singles = computed(() => (contactsStore.contacts || []).filter(isSingleContact))

  const contact = computed(() => {
    const id = String(unref(contactIdRef) || '')
    if (id) {
      const picked = singles.value.find(c => c.id === id)
      if (picked) return picked
    }
    let best = null
    for (const c of singles.value) {
      if (!best || lastActivityTime(c) > lastActivityTime(best)) best = c
    }
    return best
  })

  const name = computed(() => contact.value?.name || 'TA')

  const summary = computed(() => (contact.value ? buildContactMessageSummary(contact.value) : null))

  const lastMessage = computed(() => {
    const s = summary.value
    if (!s || !s.lastMsgPreview) return null
    return {
      text: s.lastMsgPreview,
      fromUser: s.lastVisibleMessage?.role === 'user',
      time: s.lastMsgTime
    }
  })

  const unread = computed(() => Math.max(0, Number(contact.value?.unreadCount || 0)))

  const activity = computed(() => (contact.value ? plannerStore.getCharacterCurrentActivity(contact.value.id) : null))

  const moodLabel = computed(() => {
    const c = contact.value
    if (!c) return ''
    if (livenessStore.hasState(c.id)) return moodLabelFromState(livenessStore.states[c.id])
    return String(activity.value?.mood || '').trim().slice(0, 6)
  })

  /** 第一条消息的时间，算「认识多少天」用 */
  const firstMessageTime = computed(() => {
    const msgs = contact.value?.msgs
    if (!Array.isArray(msgs)) return 0
    for (const m of msgs) {
      const t = Number(m?.time || 0)
      if (t > 0) return t
    }
    return 0
  })

  return { contact, name, summary, lastMessage, unread, activity, moodLabel, firstMessageTime }
}

/** 头像：图片 / emoji / 名字首字 */
export function avatarOf(contact) {
  if (!contact) return { kind: 'text', value: 'TA' }
  if (contact.avatarType === 'image' && contact.avatar) return { kind: 'image', value: contact.avatar }
  const raw = String(contact.avatar || '').trim()
  if (raw && raw.length <= 4) return { kind: 'text', value: raw }
  return { kind: 'text', value: Array.from(String(contact.name || 'TA'))[0] || 'TA' }
}

export function currentHour() {
  return getHour(new Date())
}
