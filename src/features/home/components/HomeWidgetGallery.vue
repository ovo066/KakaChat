<template>
  <div class="kk-sheet-dim" :class="{ open }" @click="emit('close')"></div>
  <section class="kk-sheet tall" :class="{ open }" aria-label="添加小组件">
    <div class="kk-sheet-grab"></div>
    <div class="kk-sheet-head">
      <h2>添加小组件</h2>
      <button class="kk-sheet-x" type="button" aria-label="关闭" @click="emit('close')"><i class="ph-bold ph-x"></i></button>
    </div>
    <p class="kk-sheet-sub">点一下就贴到当前页，放不下会自己开新的一页。</p>
    <div class="kk-sheet-body">
      <template v-if="missingApps.length">
        <h3>收起来的应用</h3>
        <div class="kk-app-row">
          <HomeAppIcon v-for="app in missingApps" :key="app.key" :app="app" @open="emit('add-app', app.key)" />
        </div>
        <h3>小组件</h3>
      </template>
      <div v-if="rendered" class="kk-gallery">
        <div
          v-for="entry in HOME_WIDGET_CATALOG"
          :key="entry.type"
          class="g-item"
          role="button"
          tabindex="0"
          @click="emit('add', entry)"
          @keydown.enter="emit('add', entry)"
        >
          <span class="g-prev">
            <span class="g-mini" :style="miniStyle(entry.size)">
              <div class="kk-item" :class="['s-' + entry.size, 'w-' + entry.type]">
                <HomeWidget :item="previewItem(entry)" :companion-id="companionId" preview />
              </div>
            </span>
          </span>
          <span class="g-name">{{ entry.name }}<span class="g-size">{{ entry.size.replace('x', '×') }}</span></span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, watch } from 'vue'
import { HOME_WIDGET_CATALOG, getDefaultWidgetConfig } from '../homeLayout'
import HomeAppIcon from './HomeAppIcon.vue'
import HomeWidget from './HomeWidget.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  missingApps: { type: Array, default: () => [] },
  companionId: { type: String, default: '' }
})
const emit = defineEmits(['close', 'add', 'add-app'])

// 第一次打开才挂预览，之后留着，收起动画时内容不会突然消失
const rendered = ref(false)
watch(() => props.open, (open) => { if (open) rendered.value = true }, { immediate: true })

// 按 390 宽屏幕上一格的真实尺寸画，再缩到预览框里
const GAP = 14
const COL = (350 - 3 * GAP) / 4
const ROW = COL * 1.1

function miniStyle(size) {
  const [cw, ch] = size.split('x').map(Number)
  const w = cw * COL + (cw - 1) * GAP
  const h = ch * ROW + (ch - 1) * GAP
  const scale = Math.min(136 / w, 100 / h, 0.62)
  return { width: w + 'px', height: h + 'px', transform: `translate(-50%, -50%) scale(${scale})` }
}

function previewItem(entry) {
  return { id: 'preview_' + entry.type, type: entry.type, size: entry.size, config: getDefaultWidgetConfig(entry.type) }
}
</script>
