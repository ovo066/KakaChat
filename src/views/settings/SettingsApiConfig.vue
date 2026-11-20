<template>
  <div class="ios26 ios26-stack" @touchstart.passive="onTouchStart" @touchend="onTouchEnd">
    <TransitionGroup name="ios26-layer">
      <div
        v-for="(entry, index) in stack"
        :key="entry.key"
        class="ios26-layer"
        :class="{ 'is-under': index < stack.length - 1 }"
        :aria-hidden="index < stack.length - 1 ? 'true' : undefined"
      >
        <ApiProvidersPage
          v-if="entry.page === 'root'"
          @back="$emit('back')"
          @done="$emit('done')"
          @open-provider="openProvider"
        />
        <ApiProviderPage
          v-else-if="entry.page === 'provider'"
          :provider-id="entry.providerId"
          :is-new="entry.isNew"
          @back="pop"
          @open-model="openModel"
        />
        <ApiModelPage
          v-else
          :model-id="entry.modelId"
          @back="pop"
          @open-model="openModel"
        />
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import '../../styles/ios26.css'
import ApiProvidersPage from './api/ApiProvidersPage.vue'
import ApiProviderPage from './api/ApiProviderPage.vue'
import ApiModelPage from './api/ApiModelPage.vue'

const props = defineProps({
  active: { type: Boolean, default: false }
})

const emit = defineEmits(['back', 'done'])

// 页内导航栈：供应商列表 → 供应商 → 模型；每层常驻，返回时保留滚动位置
const stack = ref([createRootEntry()])
let seq = 0

function createRootEntry() {
  return { key: 'root', page: 'root' }
}

function push(entry) {
  seq += 1
  stack.value = [...stack.value, { ...entry, key: `${entry.page}-${seq}` }]
}

function pop() {
  if (stack.value.length > 1) {
    stack.value = stack.value.slice(0, -1)
    return
  }
  emit('back')
}

function openProvider(providerId, options = {}) {
  push({ page: 'provider', providerId, isNew: !!options.isNew })
}

function openModel(modelId, options = {}) {
  if (options.replace) {
    seq += 1
    stack.value = [...stack.value.slice(0, -1), { page: 'model', modelId, key: `model-${seq}` }]
    return
  }
  push({ page: 'model', modelId })
}

watch(() => props.active, (active) => {
  if (active) stack.value = [createRootEntry()]
})

// 从左边缘右滑返回上一层
let touchStart = null

function onTouchStart(event) {
  const touch = event.touches[0]
  const rect = event.currentTarget.getBoundingClientRect()
  touchStart = stack.value.length > 1 && touch.clientX - rect.left < 28
    ? { x: touch.clientX, y: touch.clientY }
    : null
}

function onTouchEnd(event) {
  if (!touchStart) return
  const touch = event.changedTouches[0]
  const dx = touch.clientX - touchStart.x
  const dy = Math.abs(touch.clientY - touchStart.y)
  touchStart = null
  if (dx > 70 && dy < 50) pop()
}
</script>
