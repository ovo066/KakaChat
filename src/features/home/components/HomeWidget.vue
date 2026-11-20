<template>
  <HomeAppIcon
    v-if="item.type === 'app' && app"
    :app="app"
    :badge="app.key === 'messages' ? messageBadge : 0"
    @open="emit('open-app', $event)"
  />
  <button v-else-if="item.type === 'add'" class="kk-app kk-add-tile" type="button" @click="emit('gallery')">
    <span class="kk-app-ic"><i class="ph ph-plus"></i></span>
    <span class="kk-app-name">小组件</span>
  </button>
  <component :is="widget" v-else-if="widget" v-bind="widgetBindings" />
</template>

<script setup>
import { computed } from 'vue'
import { DESKTOP_APPS } from '../../../data/homeApps'
import HomeAppIcon from './HomeAppIcon.vue'
import AnnivWidget from './widgets/AnnivWidget.vue'
import BatteryWidget from './widgets/BatteryWidget.vue'
import ClockWidget from './widgets/ClockWidget.vue'
import CompanionWidget from './widgets/CompanionWidget.vue'
import CountdownWidget from './widgets/CountdownWidget.vue'
import HeroWidget from './widgets/HeroWidget.vue'
import MomentWidget from './widgets/MomentWidget.vue'
import MoodWidget from './widgets/MoodWidget.vue'
import MusicWidget from './widgets/MusicWidget.vue'
import PhotoWidget from './widgets/PhotoWidget.vue'
import QuoteWidget from './widgets/QuoteWidget.vue'
import ScheduleWidget from './widgets/ScheduleWidget.vue'
import StickyWidget from './widgets/StickyWidget.vue'
import TodoWidget from './widgets/TodoWidget.vue'
import WeatherWidget from './widgets/WeatherWidget.vue'
import YearWidget from './widgets/YearWidget.vue'

const WIDGETS = {
  hero: HeroWidget,
  companion: CompanionWidget,
  weather: WeatherWidget,
  schedule: ScheduleWidget,
  music: MusicWidget,
  moment: MomentWidget,
  anniv: AnnivWidget,
  year: YearWidget,
  countdown: CountdownWidget,
  battery: BatteryWidget,
  todo: TodoWidget,
  quote: QuoteWidget,
  sticky: StickyWidget,
  mood: MoodWidget,
  clock: ClockWidget,
  image: PhotoWidget
}

const props = defineProps({
  item: { type: Object, required: true },
  companionId: { type: String, default: '' },
  preview: { type: Boolean, default: false },
  messageBadge: { type: Number, default: 0 }
})
const emit = defineEmits(['open-app', 'gallery', 'config', 'configure'])

const app = computed(() => (props.item.type === 'app' ? DESKTOP_APPS.find(a => a.key === props.item.config?.appKey) : null))
const widget = computed(() => WIDGETS[props.item.type] || null)

// 只把小组件自己声明过的 props / 事件传下去，免得多余的值落到根元素上变成 DOM 属性
const widgetBindings = computed(() => {
  const declaredProps = widget.value?.props || {}
  const declaredEmits = widget.value?.emits || []
  const all = {
    item: props.item,
    companionId: props.companionId,
    preview: props.preview,
    onConfig: patch => emit('config', patch),
    onConfigure: () => emit('configure')
  }
  return Object.fromEntries(Object.entries(all).filter(([key]) => {
    if (key === 'onConfig') return declaredEmits.includes('config')
    if (key === 'onConfigure') return declaredEmits.includes('configure')
    return key in declaredProps
  }))
})
</script>
