<template>
  <ApiNavBar :title="provider?.name || '供应商'" :title-hidden="!scrolled" back-label="模型与 API" @back="$emit('back')" />

  <div v-if="provider" class="ios26-scroll" @scroll.passive="onScroll">
    <div class="ios26-hero">
      <BrandTile v-bind="visual" :size="68" />
      <div class="ios26-hero-title">{{ provider.name || '未命名供应商' }}</div>
      <div class="ios26-hero-subtitle">{{ host || '尚未填写接口地址' }}</div>
    </div>

    <section class="ios26-section">
      <div class="ios26-section-header">连接</div>
      <div class="ios26-card">
        <label class="ios26-row">
          <span class="ios26-row-label">名称</span>
          <input v-model="provider.name" class="ios26-input" placeholder="供应商名称" maxlength="40" @input="save" @blur="fixName">
        </label>
        <label class="ios26-row">
          <span class="ios26-row-label">接口地址</span>
          <input
            ref="urlInput"
            :value="provider.url"
            class="ios26-input is-mono"
            type="url"
            inputmode="url"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            :placeholder="preset?.url || 'https://example.com/v1'"
            @input="onUrlInput"
            @change="onUrlCommit"
          >
        </label>
        <label class="ios26-row">
          <span class="ios26-row-label">API Key</span>
          <input
            ref="keyInput"
            :value="keyDraft"
            class="ios26-input is-mono"
            :type="showKey ? 'text' : 'password'"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            :placeholder="keyPlaceholder"
            @input="onKeyInput"
            @blur="keyDraft = provider.key"
          >
          <button type="button" class="ios26-icon-btn" :aria-label="showKey ? '隐藏 Key' : '显示 Key'" @click.prevent="showKey = !showKey">
            <i :class="showKey ? 'ph ph-eye-slash' : 'ph ph-eye'"></i>
          </button>
        </label>
        <div class="ios26-row">
          <span class="ios26-row-main">默认协议</span>
          <span class="ios26-select">
            <span>{{ formatOption(provider.apiFormat).label }}</span>
            <i class="ph-bold ph-caret-up-down"></i>
            <select :value="provider.apiFormat" aria-label="默认协议" @change="onFormatChange($event.target.value)">
              <option v-for="option in formatOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </span>
        </div>
      </div>
      <p v-if="connectionProblem" class="ios26-section-footer is-warning">{{ connectionProblem }}</p>
      <p v-else class="ios26-section-footer break-all">请求地址：{{ endpointPreview }}</p>
      <p v-if="formatTouched && mismatchedCount > 0" class="ios26-section-footer">
        默认协议只影响新添加的模型，已有 {{ mismatchedCount }} 个模型用的是其他协议。
        <button type="button" class="font-medium text-[var(--ios-tint)]" @click="applyFormatToAll">全部改为 {{ formatOption(provider.apiFormat).short }}</button>
      </p>
    </section>

    <section class="ios26-section">
      <div class="ios26-section-header">
        <span>模型<template v-if="provider.models.length"> · {{ provider.models.length }}</template></span>
        <button type="button" class="ios26-header-action" @click="openLibrary(true)">
          <i class="ph-bold ph-arrows-clockwise mr-0.5"></i>获取列表
        </button>
      </div>
      <div class="ios26-card">
        <button
          v-for="model in provider.models"
          :key="model.id"
          type="button"
          class="ios26-row has-icon"
          @click="$emit('open-model', model.id)"
        >
          <BrandTile v-bind="modelVisual(model.model)" variant="tinted" :size="30" />
          <span class="ios26-row-main">
            <span class="flex min-w-0 items-center gap-1.5">
              <span class="ios26-row-title">{{ modelLabel(model) }}</span>
              <span v-if="model.id === configsStore.activeConfigId" class="ios26-chip is-tint">默认</span>
            </span>
            <span class="ios26-row-subtitle flex items-center gap-1.5">
              <span class="ios26-chip" :style="{ '--chip-color': formatOption(model.apiFormat).color }">{{ formatOption(model.apiFormat).short }}</span>
              <span v-if="model.name" class="truncate">{{ model.model }}</span>
              <span v-if="model.urlOverride" class="shrink-0">· 独立地址</span>
            </span>
          </span>
          <i class="ph-bold ph-caret-right ios26-chevron"></i>
        </button>

        <button type="button" class="ios26-row has-icon is-tint" @click="openLibrary(false)">
          <span class="ios26-row-glyph"><i class="ph-bold ph-plus"></i></span>
          <span class="ios26-row-main font-medium">添加模型</span>
        </button>
      </div>
      <p class="ios26-section-footer">点进模型可单独设置协议、参数和接口地址。同一个模型想用两种协议，在模型页选“复制一份”。</p>
    </section>

    <section class="ios26-section">
      <div class="ios26-card">
        <button type="button" class="ios26-row" :aria-expanded="headersOpen" @click="headersOpen = !headersOpen">
          <span class="ios26-row-main">自定义请求头</span>
          <span v-if="provider.customHeadersJson" class="ios26-row-value text-[15px]">已设置</span>
          <i class="ph-bold ph-caret-right ios26-chevron ios26-collapse-caret" :class="{ 'is-open': headersOpen }"></i>
        </button>
        <div v-if="headersOpen" class="ios26-subrow">
          <textarea
            v-model="headersDraft"
            class="ios26-textarea"
            rows="3"
            spellcheck="false"
            placeholder='{"HTTP-Referer": "https://example.com"}'
            @input="onHeadersInput"
          ></textarea>
        </div>
      </div>
      <p v-if="headersOpen" class="ios26-section-footer" :class="{ 'is-error': !!headersError }">
        {{ headersError || 'JSON 格式，这个供应商下的所有模型共用；同名请求头会覆盖默认值。' }}
      </p>
    </section>

    <section class="ios26-section">
      <div class="ios26-card">
        <button type="button" class="ios26-row is-danger" @click="removeProvider">删除供应商</button>
      </div>
    </section>
  </div>

  <ApiModelLibrarySheet
    :visible="libraryOpen"
    :provider-id="providerId"
    :auto-fetch="libraryAutoFetch"
    @close="libraryOpen = false"
  />
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import ApiNavBar from './ApiNavBar.vue'
import ApiModelLibrarySheet from './ApiModelLibrarySheet.vue'
import BrandTile from '../../../components/common/BrandTile.vue'
import { useConfigsStore } from '../../../stores/configs'
import { useContactsStore } from '../../../stores/contacts'
import { getModelLabel } from '../../../stores/configsModel'
import { useStorage } from '../../../composables/useStorage'
import { useToast } from '../../../composables/useToast'
import { showConfirm } from '../../../composables/useConfirm'
import { normalizeApiKey } from '../../../utils/httpHeaders'
import { normalizeApiFormat } from '../../../composables/api/providerFormats'
import { resolveProviderChatUrl } from '../../../composables/api/providerRequest'
import {
  API_FORMAT_OPTIONS,
  CUSTOM_PROVIDER_PRESET_ID,
  describeProviderHost,
  findProviderPresetByUrl,
  getApiFormatOption,
  getModelVisual,
  getProviderPreset,
  getProviderVisual
} from '../../../composables/api/providerPresets'
import {
  cleanUrlInput,
  countModelUsage,
  describeApiKeyProblem,
  describeUrlProblem,
  parseAdvancedField
} from './apiSettingsHelpers'

const props = defineProps({
  providerId: { type: String, required: true },
  isNew: { type: Boolean, default: false }
})

const emit = defineEmits(['back', 'open-model'])

const configsStore = useConfigsStore()
const contactsStore = useContactsStore()
const { scheduleSave } = useStorage()
const { showToast } = useToast()

const scrolled = ref(false)
const showKey = ref(false)
const keyInput = ref(null)
const urlInput = ref(null)
const headersOpen = ref(false)
const headersError = ref('')
const formatTouched = ref(false)
const libraryOpen = ref(false)
const libraryAutoFetch = ref(false)

const provider = computed(() => configsStore.getProvider(props.providerId))
const preset = computed(() => getProviderPreset(provider.value?.preset))
const visual = computed(() => getProviderVisual(provider.value))
const host = computed(() => describeProviderHost(provider.value?.url))
const keyDraft = ref(provider.value?.key || '')
const headersDraft = ref(provider.value?.customHeadersJson || '')
let committedUrl = provider.value?.url || ''

const formatOptions = API_FORMAT_OPTIONS
const needsKey = computed(() => provider.value?.preset !== 'ollama')
const keyPlaceholder = computed(() => needsKey.value ? '粘贴 API Key' : '本地服务可留空')

const connectionProblem = computed(() => {
  if (!provider.value) return ''
  const urlProblem = describeUrlProblem(provider.value.url)
  if (urlProblem) return urlProblem
  if (!provider.value.key) return needsKey.value ? '还没有填写 API Key' : ''
  return describeApiKeyProblem(provider.value.key)
})

const endpointPreview = computed(() => resolveProviderChatUrl({
  url: provider.value?.url,
  apiFormat: provider.value?.apiFormat,
  model: provider.value?.models[0]?.model
}))

const mismatchedCount = computed(() => {
  const format = provider.value?.apiFormat
  return (provider.value?.models || []).filter(model => model.apiFormat !== format).length
})

// 供应商被删掉（例如别处导入了配置）时自动返回
watch(provider, (value) => {
  if (!value) emit('back')
})

onMounted(() => {
  if (!props.isNew) return
  // 等推入动画结束再聚焦，避免键盘顶起时页面跳动
  setTimeout(() => {
    if (!provider.value?.url) urlInput.value?.focus()
    else if (needsKey.value) keyInput.value?.focus()
  }, 480)
})

function save() {
  scheduleSave()
}

function onScroll(event) {
  scrolled.value = event.target.scrollTop > 120
}

function fixName() {
  if (!provider.value) return
  provider.value.name = provider.value.name.trim() || preset.value?.name || host.value || '未命名供应商'
  save()
}

function onUrlInput(event) {
  provider.value.url = cleanUrlInput(event.target.value)
  save()
}

function onUrlCommit() {
  const url = provider.value.url
  if (url === committedUrl) return
  committedUrl = url
  // 换了地址，旧的模型列表不再可靠；同时按地址重新识别品牌图标
  provider.value.cachedModels = []
  provider.value.cachedModelsUpdatedAt = null
  provider.value.preset = findProviderPresetByUrl(url)?.id || CUSTOM_PROVIDER_PRESET_ID
  save()
}

function onKeyInput(event) {
  keyDraft.value = event.target.value
  provider.value.key = normalizeApiKey(event.target.value)
  save()
}

function onFormatChange(value) {
  provider.value.apiFormat = normalizeApiFormat(value)
  formatTouched.value = true
  save()
}

function applyFormatToAll() {
  provider.value.models.forEach((model) => {
    model.apiFormat = provider.value.apiFormat
  })
  save()
  showToast('已统一协议')
}

function onHeadersInput() {
  const result = parseAdvancedField('headers', headersDraft.value)
  headersError.value = result.error
  if (!result.ok) return
  provider.value.customHeadersJson = result.value
  save()
}

function openLibrary(autoFetch) {
  libraryAutoFetch.value = autoFetch
  libraryOpen.value = true
}

async function removeProvider() {
  const current = provider.value
  const usage = current.models.reduce((sum, model) => sum + countModelUsage(model.id, contactsStore.contacts), 0)
  const parts = [`“${current.name}”和它的 ${current.models.length} 个模型都会被删除。`]
  if (usage > 0) parts.push(`有 ${usage} 处角色或群聊在用这些模型，删除后会改用默认模型。`)
  const confirmed = await showConfirm({
    title: '删除供应商',
    message: parts.join(''),
    confirmText: '删除',
    destructive: true
  })
  if (!confirmed) return
  configsStore.removeProvider(current.id)
  scheduleSave()
  showToast('已删除')
}

const modelLabel = model => getModelLabel(model)
const modelVisual = modelId => getModelVisual(modelId)
const formatOption = format => getApiFormatOption(format)
</script>
