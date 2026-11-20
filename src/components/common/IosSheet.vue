<template>
  <Teleport :to="teleportTarget">
    <Transition name="ios26-sheet" @after-leave="$emit('closed')">
      <div v-if="visible" class="ios26 ios26-sheet-layer">
        <div class="ios26-sheet-backdrop" @click="requestClose"></div>
        <section
          class="ios26-sheet"
          :class="{ 'is-tall': tall }"
          :style="dragOffset ? { transform: `translateY(${dragOffset}px)`, transition: 'none' } : null"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
        >
          <div class="ios26-sheet-grabber"></div>
          <header
            class="ios26-sheet-header"
            @pointerdown="onDragStart"
            @pointermove="onDragMove"
            @pointerup="onDragEnd"
            @pointercancel="onDragEnd"
          >
            <button type="button" class="ios26-glass-btn is-sm" aria-label="关闭" @click="requestClose">
              <i class="ph-bold ph-x"></i>
            </button>
            <div class="ios26-sheet-title">
              {{ title }}
              <small v-if="subtitle">{{ subtitle }}</small>
            </div>
            <button
              v-if="confirmable"
              type="button"
              class="ios26-glass-btn is-sm is-tint"
              :disabled="confirmDisabled"
              :aria-label="confirmLabel"
              @click="$emit('confirm')"
            >
              <i class="ph-bold ph-check"></i>
            </button>
            <span v-else></span>
          </header>
          <div v-if="$slots.toolbar" class="px-[14px] pb-2 shrink-0">
            <slot name="toolbar"></slot>
          </div>
          <div class="ios26-sheet-body">
            <slot></slot>
          </div>
          <footer v-if="$slots.footer" class="ios26-sheet-footer">
            <slot name="footer"></slot>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'
import '../../styles/ios26.css'

defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  tall: { type: Boolean, default: false },
  confirmable: { type: Boolean, default: false },
  confirmDisabled: { type: Boolean, default: false },
  confirmLabel: { type: String, default: '完成' }
})

const emit = defineEmits(['close', 'confirm', 'closed'])

// 手机壳模式下挂到 #screen，面板不会溢出到模拟手机外
const teleportTarget = typeof document !== 'undefined' && document.getElementById('screen') ? '#screen' : 'body'

const dragOffset = ref(0)
let dragStartY = null

function requestClose() {
  emit('close')
}

function onDragStart(event) {
  if (event.target.closest('button')) return
  dragStartY = event.clientY
  event.currentTarget.setPointerCapture?.(event.pointerId)
}

function onDragMove(event) {
  if (dragStartY === null) return
  dragOffset.value = Math.max(0, event.clientY - dragStartY)
}

function onDragEnd() {
  if (dragStartY === null) return
  const shouldClose = dragOffset.value > 90
  dragStartY = null
  dragOffset.value = 0
  if (shouldClose) requestClose()
}
</script>
