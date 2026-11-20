<template>
  <button type="button" class="model-field" @click="open = true">
    <BrandTile v-if="current" v-bind="visual" variant="tinted" :size="34" />
    <span v-else class="model-field-glyph"><i class="ph-bold ph-arrows-clockwise"></i></span>
    <span class="min-w-0 flex-1 text-left">
      <span class="block truncate text-[16px] text-[var(--text-primary)]">{{ current ? current.modelLabel : followLabel }}</span>
      <span class="block truncate text-[12.5px] text-[var(--text-secondary)]">{{ current ? current.providerName : followHint }}</span>
    </span>
    <i class="ph-bold ph-caret-up-down text-[14px] text-[var(--text-secondary)] opacity-60"></i>
  </button>
  <ModelPickerSheet
    :visible="open"
    :model-value="modelValue"
    :title="title"
    :allow-follow="allowFollow"
    :follow-label="followLabel"
    :follow-hint="followHint"
    @update:model-value="$emit('update:modelValue', $event)"
    @close="open = false"
  />
</template>

<script setup>
import { computed, ref } from 'vue'
import BrandTile from './BrandTile.vue'
import ModelPickerSheet from './ModelPickerSheet.vue'
import { useConfigsStore } from '../../stores/configs'
import { getModelVisual } from '../../composables/api/providerPresets'

const props = defineProps({
  modelValue: { type: String, default: null },
  title: { type: String, default: '选择模型' },
  allowFollow: { type: Boolean, default: true },
  followLabel: { type: String, default: '跟随默认模型' },
  followHint: { type: String, default: '' }
})

defineEmits(['update:modelValue'])

const configsStore = useConfigsStore()
const open = ref(false)
const current = computed(() => configsStore.getModelConfig(props.modelValue))
const visual = computed(() => getModelVisual(current.value?.model))
</script>

<style scoped>
.model-field {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 14px;
  border: none;
  background: transparent;
}
.model-field:active { background: rgba(120, 120, 128, 0.12); }
.model-field-glyph {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: color-mix(in srgb, var(--primary-color) 14%, transparent);
  color: var(--primary-color);
  font-size: 17px;
}
</style>
