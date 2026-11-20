<template>
  <ApiNavBar title="模型与 API" :title-hidden="!scrolled" back-label="设置" @back="$emit('back')">
    <template #trailing>
      <button type="button" class="ios26-glass-pill" @click="$emit('done')">完成</button>
    </template>
  </ApiNavBar>

  <div class="ios26-scroll" @scroll.passive="onScroll">
    <h1 class="ios26-large-title">模型与 API</h1>

    <section class="ios26-section">
      <div class="ios26-section-header">默认模型</div>
      <div class="ios26-card">
        <button type="button" class="ios26-row has-large-icon !py-3" @click="pickerOpen = true">
          <BrandTile v-bind="defaultVisual" variant="tinted" :size="44" />
          <span class="ios26-row-main">
            <span class="ios26-row-title block text-[19px] leading-6 font-semibold">
              {{ defaultModel ? defaultModel.modelLabel : '尚未设置' }}
            </span>
            <span v-if="defaultModel" class="ios26-row-subtitle flex items-center gap-1.5">
              <span class="truncate">{{ defaultModel.providerName }}</span>
              <span class="ios26-chip" :style="{ '--chip-color': formatOption(defaultModel.apiFormat).color }">
                {{ formatOption(defaultModel.apiFormat).short }}
              </span>
            </span>
            <span v-else class="ios26-row-subtitle block">先添加供应商和模型</span>
          </span>
          <i class="ph-bold ph-caret-up-down ios26-chevron !text-[15px]"></i>
        </button>
      </div>
      <p class="ios26-section-footer">没有单独指定模型的角色、群聊，以及记忆总结、拟真互动等后台功能都会用它。</p>
    </section>

    <section class="ios26-section">
      <div class="ios26-section-header">
        <span>供应商</span>
        <span v-if="providers.length" class="font-medium">{{ providers.length }}</span>
      </div>
      <div class="ios26-card">
        <button
          v-for="provider in providers"
          :key="provider.id"
          type="button"
          class="ios26-row has-large-icon"
          @click="$emit('open-provider', provider.id)"
        >
          <BrandTile v-bind="providerVisual(provider)" :size="36" />
          <span class="ios26-row-main">
            <span class="ios26-row-title block">{{ provider.name }}</span>
            <span class="ios26-row-subtitle block" :class="{ 'is-warning': !!providerWarning(provider) }">
              {{ providerWarning(provider) || providerSubtitle(provider) }}
            </span>
          </span>
          <span class="ios26-row-value text-[15px]">{{ provider.models.length }}</span>
          <i class="ph-bold ph-caret-right ios26-chevron"></i>
        </button>

        <button type="button" class="ios26-row has-large-icon is-tint" @click="presetOpen = true">
          <span class="ios26-row-glyph !w-9 !h-9"><i class="ph-bold ph-plus"></i></span>
          <span class="ios26-row-main font-medium">添加供应商</span>
        </button>
      </div>
      <p class="ios26-section-footer">一个供应商下可以添加多个模型，每个模型单独选择接口协议和生成参数。角色资料里可以挑任意供应商的任意模型。</p>
    </section>
  </div>

  <ModelPickerSheet
    :visible="pickerOpen"
    :model-value="configsStore.activeConfigId"
    title="默认模型"
    @update:model-value="setDefaultModel"
    @close="pickerOpen = false"
  />
  <ApiPresetSheet :visible="presetOpen" @close="presetOpen = false" @pick="addProvider" />
</template>

<script setup>
import { computed, ref } from 'vue'
import ApiNavBar from './ApiNavBar.vue'
import ApiPresetSheet from './ApiPresetSheet.vue'
import BrandTile from '../../../components/common/BrandTile.vue'
import ModelPickerSheet from '../../../components/common/ModelPickerSheet.vue'
import { useConfigsStore } from '../../../stores/configs'
import { useStorage } from '../../../composables/useStorage'
import {
  describeProviderHost,
  getApiFormatOption,
  getModelVisual,
  getProviderVisual
} from '../../../composables/api/providerPresets'

const emit = defineEmits(['back', 'done', 'open-provider'])

const configsStore = useConfigsStore()
const { scheduleSave } = useStorage()
const scrolled = ref(false)
const pickerOpen = ref(false)
const presetOpen = ref(false)

const providers = computed(() => configsStore.providers)
const defaultModel = computed(() => configsStore.getModelConfig(configsStore.activeConfigId))
const defaultVisual = computed(() => defaultModel.value
  ? getModelVisual(defaultModel.value.model)
  : { icon: 'ph-cube', color: '' })

function onScroll(event) {
  scrolled.value = event.target.scrollTop > 36
}

function providerWarning(provider) {
  if (!provider.url) return '还没有填写接口地址'
  if (!provider.key && provider.preset !== 'ollama') return '还没有填写 API Key'
  if (provider.models.length === 0) return '还没有添加模型'
  return ''
}

function providerSubtitle(provider) {
  return `${describeProviderHost(provider.url) || provider.url} · ${getApiFormatOption(provider.apiFormat).label}`
}

function setDefaultModel(modelId) {
  if (!modelId) return
  configsStore.setDefaultModel(modelId)
  scheduleSave()
}

function addProvider(presetId) {
  const provider = configsStore.addProvider(presetId)
  scheduleSave()
  presetOpen.value = false
  emit('open-provider', provider.id, { isNew: true })
}

const providerVisual = provider => getProviderVisual(provider)
const formatOption = format => getApiFormatOption(format)
</script>
