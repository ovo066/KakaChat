<template>
  <IosSheet :visible="visible" :title="title" :subtitle="subtitle" @close="emit('close')">
    <section class="ios26-section">
      <div class="ios26-card">
        <button v-if="noneLabel" type="button" class="ios26-row has-icon" @click="chooseNone">
          <span class="ios26-row-glyph"><i class="ph-bold" :class="noneIcon"></i></span>
          <span class="ios26-row-main">
            <span class="ios26-row-title block">{{ noneLabel }}</span>
            <span v-if="noneSubtitle" class="ios26-row-subtitle block">{{ noneSubtitle }}</span>
          </span>
          <i v-if="isNoneSelected" class="ph-bold ph-check contact-option-check"></i>
        </button>
        <button
          v-for="option in options"
          :key="option.id"
          type="button"
          class="ios26-row has-icon"
          @click="choose(option.id)"
        >
          <span class="ios26-row-glyph contact-option-glyph">
            <img v-if="option.image" :src="option.image" alt="">
            <template v-else>{{ option.icon || '•' }}</template>
          </span>
          <span class="ios26-row-main">
            <span class="ios26-row-title block">{{ option.title }}</span>
            <span v-if="option.subtitle" class="ios26-row-subtitle block">{{ option.subtitle }}</span>
          </span>
          <i v-if="isSelected(option.id)" class="ph-bold ph-check contact-option-check"></i>
        </button>
      </div>
      <p v-if="options.length === 0 && emptyText" class="ios26-section-footer">{{ emptyText }}</p>
      <p v-else-if="footer" class="ios26-section-footer">{{ footer }}</p>
    </section>
  </IosSheet>
</template>

<script setup>
import { computed } from 'vue'
import IosSheet from '../../../../components/common/IosSheet.vue'

// 单选：modelValue 是 id（noneLabel 对应 null）；多选：modelValue 是 id 数组（noneLabel 对应空数组）
const props = defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  options: { type: Array, default: () => [] },
  modelValue: { type: [Array, String, Number], default: null },
  multiple: { type: Boolean, default: false },
  noneLabel: { type: String, default: '' },
  noneSubtitle: { type: String, default: '' },
  noneIcon: { type: String, default: 'ph-globe-simple' },
  emptyText: { type: String, default: '' },
  footer: { type: String, default: '' }
})

const emit = defineEmits(['close', 'update:modelValue'])

const selectedList = computed(() => {
  if (props.multiple) return Array.isArray(props.modelValue) ? props.modelValue : []
  return props.modelValue === null || props.modelValue === undefined || props.modelValue === '' ? [] : [props.modelValue]
})
const isNoneSelected = computed(() => selectedList.value.length === 0)

function isSelected(id) {
  return selectedList.value.includes(id)
}

function chooseNone() {
  emit('update:modelValue', props.multiple ? [] : null)
  if (!props.multiple) emit('close')
}

function choose(id) {
  if (!props.multiple) {
    emit('update:modelValue', id)
    emit('close')
    return
  }
  const next = isSelected(id) ? selectedList.value.filter(item => item !== id) : [...selectedList.value, id]
  emit('update:modelValue', next)
}
</script>

<style scoped>
.contact-option-glyph {
  overflow: hidden;
  font-size: 17px;
}

.contact-option-glyph > img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.contact-option-check {
  font-size: 18px;
  color: var(--ios-tint);
}
</style>
