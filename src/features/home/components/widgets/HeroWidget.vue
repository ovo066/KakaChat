<template>
  <div class="w-hero">
    <div class="hero-day">{{ date.day }}</div>
    <div class="hero-txt">
      <span class="hero-meta">{{ MONTH_LABELS[date.month - 1] }} · {{ WEEKDAY_LABELS[date.weekday] }}</span>
      <span class="hero-greet">{{ greeting }}<svg viewBox="0 0 100 9" preserveAspectRatio="none"><path d="M2 6 C 25 2, 50 8, 98 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg></span>
    </div>
    <button v-if="unread" class="hero-note" type="button" @click="openChat">
      {{ name }} 来消息了
      <svg viewBox="0 0 34 30"><path d="M26 3 C 30 14, 22 23, 7 26 M 13 20 L 7 26 L 14 29" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { usePersonasStore } from '../../../../stores/personas'
import {
  MONTH_LABELS,
  WEEKDAY_LABELS,
  getHomeDate,
  greetingFor,
  useHomeCompanion,
  useHomeNow
} from '../../composables/useHomeCompanion'

const props = defineProps({
  item: { type: Object, required: true },
  companionId: { type: String, default: '' }
})

const router = useRouter()
const personasStore = usePersonasStore()
const now = useHomeNow()
const { contact, name, unread } = useHomeCompanion(computed(() => props.companionId))

const date = computed(() => getHomeDate(now.value))

const userName = computed(() => {
  const persona = contact.value
    ? personasStore.getPersonaForContact(contact.value.id)
    : personasStore.personas.find(p => p.id === personasStore.defaultPersonaId)
  return String(persona?.name || '').trim()
})

const greeting = computed(() => {
  const base = greetingFor(date.value.hour)
  return userName.value ? `${base}，${userName.value}` : base
})

function openChat() {
  const c = contact.value
  if (c) router.push('/chat/' + c.id)
}
</script>
