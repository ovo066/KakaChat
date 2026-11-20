<template>
  <IosSheet :visible="visible" title="添加供应商" subtitle="选好后填写 API Key 即可" @close="$emit('close')">
    <div class="preset-grid">
      <button
        v-for="preset in presets"
        :key="preset.id"
        type="button"
        class="preset-card"
        @click="$emit('pick', preset.id)"
      >
        <BrandTile :brand="preset.brand" :icon="preset.icon" :tint="preset.tint" :glyph="preset.glyph" :size="46" />
        <span class="preset-name">{{ preset.name }}</span>
        <span v-if="preset.hint" class="preset-hint">{{ preset.hint }}</span>
      </button>
    </div>
    <p class="ios26-section-footer !px-2 !pt-4">列表外的服务商、中转站或自建服务选“自定义”，填写它提供的接口地址即可；Claude、Gemini 原生接口也能在模型里单独切换。</p>
  </IosSheet>
</template>

<script setup>
import IosSheet from '../../../components/common/IosSheet.vue'
import BrandTile from '../../../components/common/BrandTile.vue'
import { PROVIDER_PRESETS } from '../../../composables/api/providerPresets'

defineProps({
  visible: { type: Boolean, default: false }
})

defineEmits(['close', 'pick'])

const presets = PROVIDER_PRESETS
</script>

<style scoped>
.preset-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  padding-top: 6px;
}

.preset-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  min-height: 112px;
  padding: 14px 6px 12px;
  border: none;
  border-radius: 22px;
  background: var(--ios-card);
  color: var(--ios-label);
  text-align: center;
  transition: transform 0.18s ease, background-color 0.18s ease;
}

.preset-card:active {
  transform: scale(0.96);
  background: var(--ios-fill);
}

.preset-name {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 600;
}

.preset-hint {
  margin-top: -4px;
  font-size: 11px;
  line-height: 14px;
  color: var(--ios-secondary);
}
</style>
