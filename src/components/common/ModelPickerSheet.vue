<template>
  <IosSheet
    :visible="visible"
    :title="title"
    :subtitle="subtitle"
    tall
    @close="$emit('close')"
  >
    <template #toolbar>
      <label class="ios26-search">
        <i class="ph ph-magnifying-glass"></i>
        <input v-model="query" type="search" placeholder="搜索模型或供应商" autocomplete="off" enterkeyhint="search">
        <button v-if="query" type="button" class="ios26-icon-btn !w-[22px] !h-[22px] !text-[11px]" aria-label="清除" @click="query = ''">
          <i class="ph-bold ph-x"></i>
        </button>
      </label>
    </template>

    <section v-if="allowFollow && !query" class="ios26-section">
      <div class="ios26-card">
        <button type="button" class="ios26-row has-icon" @click="choose(null)">
          <span class="ios26-row-glyph"><i class="ph-bold ph-arrows-clockwise"></i></span>
          <span class="ios26-row-main">
            <span class="ios26-row-title block">{{ followLabel }}</span>
            <span class="ios26-row-subtitle block">{{ followHint || defaultHint }}</span>
          </span>
          <i v-if="!modelValue" class="ph-bold ph-check text-[18px] text-[var(--ios-tint)]"></i>
        </button>
      </div>
    </section>

    <section v-for="group in visibleGroups" :key="group.provider.id" class="ios26-section">
      <div class="ios26-card">
        <button
          type="button"
          class="ios26-row has-large-icon"
          :aria-expanded="isExpanded(group.provider.id)"
          @click="toggleGroup(group.provider.id)"
        >
          <BrandTile v-bind="providerVisual(group.provider)" :size="36" />
          <span class="ios26-row-main">
            <span class="ios26-row-title block font-semibold">{{ group.provider.name }}</span>
            <span class="ios26-row-subtitle block">
              {{ groupSummary(group) }}
            </span>
          </span>
          <i class="ph-bold ph-caret-right ios26-chevron ios26-collapse-caret" :class="{ 'is-open': isExpanded(group.provider.id) }"></i>
        </button>

        <template v-if="isExpanded(group.provider.id)">
          <button
            v-for="model in group.models"
            :key="model.id"
            type="button"
            class="ios26-row has-icon !pl-[22px]"
            style="--sep-inset: 66px"
            @click="choose(model.id)"
          >
            <BrandTile v-bind="modelVisual(model.model)" variant="tinted" :size="30" />
            <span class="ios26-row-main">
              <span class="flex items-center gap-1.5 min-w-0">
                <span class="ios26-row-title">{{ model.modelLabel }}</span>
                <span v-if="model.id === configsStore.activeConfigId" class="ios26-chip is-tint">默认</span>
              </span>
              <span class="ios26-row-subtitle flex items-center gap-1.5">
                <span class="ios26-chip" :style="{ '--chip-color': formatOption(model.apiFormat).color }">{{ formatOption(model.apiFormat).short }}</span>
                <span v-if="model.modelLabel !== model.model" class="truncate">{{ model.model }}</span>
              </span>
            </span>
            <i v-if="model.id === modelValue" class="ph-bold ph-check text-[18px] text-[var(--ios-tint)]"></i>
          </button>
        </template>
      </div>
    </section>

    <div v-if="visibleGroups.length === 0" class="ios26-empty">
      <i class="ph ph-cube"></i>
      <template v-if="query">没有找到“{{ query }}”</template>
      <template v-else>
        还没有可用的模型
        <span class="text-[13px]">在 设置 › 模型与 API 里添加供应商和模型</span>
        <button type="button" class="ios26-glass-pill mt-3" @click="openSettings">去添加</button>
      </template>
    </div>
  </IosSheet>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import IosSheet from './IosSheet.vue'
import BrandTile from './BrandTile.vue'
import { useConfigsStore } from '../../stores/configs'
import { getApiFormatOption, getModelVisual, getProviderVisual } from '../../composables/api/providerPresets'

const props = defineProps({
  visible: { type: Boolean, default: false },
  modelValue: { type: String, default: null },
  title: { type: String, default: '选择模型' },
  subtitle: { type: String, default: '' },
  allowFollow: { type: Boolean, default: false },
  followLabel: { type: String, default: '跟随默认模型' },
  followHint: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue', 'close'])

const configsStore = useConfigsStore()
const router = useRouter()
const query = ref('')
const expanded = ref(new Set())

const defaultHint = computed(() => {
  const cfg = configsStore.getConfig
  return cfg?.id ? `当前：${cfg.name}` : '尚未设置默认模型'
})

const normalizedQuery = computed(() => query.value.trim().toLowerCase())

const visibleGroups = computed(() => {
  const q = normalizedQuery.value
  if (!q) return configsStore.providerGroups
  return configsStore.providerGroups
    .map((group) => {
      const providerHit = group.provider.name.toLowerCase().includes(q)
      const models = providerHit
        ? group.models
        : group.models.filter(model => `${model.model} ${model.modelLabel}`.toLowerCase().includes(q))
      return { ...group, models }
    })
    .filter(group => group.models.length > 0)
})

watch(() => props.visible, (visible) => {
  if (!visible) return
  query.value = ''
  const groups = configsStore.providerGroups
  const next = new Set()
  const selectedGroup = groups.find(group => group.models.some(model => model.id === props.modelValue))
  if (selectedGroup) next.add(selectedGroup.provider.id)
  if (groups.length <= 2) groups.forEach(group => next.add(group.provider.id))
  expanded.value = next
}, { immediate: true })

function isExpanded(providerId) {
  return !!normalizedQuery.value || expanded.value.has(providerId)
}

function toggleGroup(providerId) {
  if (normalizedQuery.value) return
  const next = new Set(expanded.value)
  if (next.has(providerId)) next.delete(providerId)
  else next.add(providerId)
  expanded.value = next
}

function groupSummary(group) {
  const selected = group.models.find(model => model.id === props.modelValue)
  if (selected) return `已选 ${selected.modelLabel}`
  return `${group.models.length} 个模型`
}

function choose(modelId) {
  emit('update:modelValue', modelId)
  emit('close')
}

function openSettings() {
  emit('close')
  router.push({ path: '/settings', query: { page: 'api' } })
}

const providerVisual = provider => getProviderVisual(provider)
const modelVisual = modelId => getModelVisual(modelId)
const formatOption = format => getApiFormatOption(format)
</script>
