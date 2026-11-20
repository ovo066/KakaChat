<template>
  <div class="kk-card" @click="onTap">
    <div class="wx-top">
      <span class="wx-temp">{{ tempText }}</span>
      <i class="wx-ic" :class="[icon, { cool: isCool }]"></i>
    </div>
    <div class="wx-city">{{ cityText }}</div>
    <div class="wx-note">
      {{ tip }}<template v-if="signer"><br><em>—— {{ signer }}</em></template>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '../../../../stores/settings'
import { getWeatherContextSnapshot } from '../../../../composables/useWeatherContext'
import { getHour } from '../../../../utils/beijingTime'
import { useHomeCompanion } from '../../composables/useHomeCompanion'

const props = defineProps({
  item: { type: Object, required: true },
  companionId: { type: String, default: '' },
  preview: { type: Boolean, default: false }
})

const router = useRouter()
const settingsStore = useSettingsStore()
const { contact, name } = useHomeCompanion(computed(() => props.companionId))

const snapshot = ref(null)
const loading = ref(false)
let refreshTimer = null

const enabled = computed(() => !!settingsStore.enableWeatherContext)

async function load() {
  if (!enabled.value) {
    snapshot.value = null
    return
  }
  loading.value = true
  try {
    snapshot.value = await getWeatherContextSnapshot(settingsStore, { allowPrompt: false, returnStaleOnError: true })
  } finally {
    loading.value = false
  }
}

const ICONS = [
  [/雷/, 'ph-duotone ph-cloud-lightning'],
  [/雪/, 'ph-duotone ph-snowflake'],
  [/雨/, 'ph-duotone ph-cloud-rain'],
  [/雾/, 'ph-duotone ph-cloud-fog'],
  [/阴/, 'ph-duotone ph-cloud'],
  [/晴夜/, 'ph-duotone ph-moon-stars'],
  [/多云/, 'ph-duotone ph-cloud-sun'],
  [/晴/, 'ph-duotone ph-sun']
]

const condition = computed(() => snapshot.value?.condition || '')
const temp = computed(() => {
  const t = snapshot.value?.temperatureC
  return Number.isFinite(t) ? Math.round(t) : null
})

const icon = computed(() => {
  if (!snapshot.value) return 'ph-duotone ph-cloud-sun'
  const hit = ICONS.find(([re]) => re.test(condition.value))
  if (hit && !snapshot.value.isDay && hit[1].endsWith('cloud-sun')) return 'ph-duotone ph-cloud-moon'
  return hit ? hit[1] : 'ph-duotone ph-thermometer'
})
const isCool = computed(() => /雨|雪|雾|阴|夜/.test(condition.value))

const tempText = computed(() => (temp.value == null ? '--°' : `${temp.value}°`))

const cityText = computed(() => {
  if (!enabled.value) return '天气没打开'
  if (!snapshot.value) return loading.value ? '正在看天…' : '暂时拿不到天气'
  return `${snapshot.value.city || '当前位置'} · ${condition.value}`
})

const tip = computed(() => {
  if (!enabled.value) return '点一下，去设置里打开天气。'
  if (!snapshot.value) return '过会儿再看看。'
  const c = condition.value
  const t = temp.value
  const hour = getHour(new Date())
  if (/雷/.test(c)) return '打雷了，别在外面待太久。'
  if (/雨/.test(c)) return '出门带把伞。'
  if (/雪/.test(c)) return '下雪了，手别冻着。'
  if (/雾/.test(c)) return '有雾，路上慢点。'
  if (t != null && t <= 8) return '有点冷，外套穿厚点。'
  if (t != null && t >= 30) return '好热，记得多喝水。'
  if (hour >= 18 && t != null && t < 20) return '晚上降温，外套带上。'
  if (hour >= 22 || hour < 5) return '不早了，早点睡。'
  return '天气不错，出去走走？'
})

const signer = computed(() => (enabled.value && snapshot.value && contact.value ? name.value : ''))

function onTap() {
  if (props.preview) return
  if (!enabled.value) router.push('/settings')
  else load()
}

watch(() => [settingsStore.enableWeatherContext, settingsStore.weatherLocationMode, settingsStore.weatherManualCity], load)

onMounted(() => {
  load()
  refreshTimer = setInterval(load, 15 * 60 * 1000)
})

onBeforeUnmount(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})
</script>
