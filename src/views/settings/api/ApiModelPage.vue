<template>
  <ApiNavBar :title="title" :title-hidden="!scrolled" :back-label="hit?.provider.name || '返回'" @back="$emit('back')" />

  <div v-if="model" class="ios26-scroll" @scroll.passive="onScroll">
    <div class="ios26-hero">
      <BrandTile v-bind="visual" variant="tinted" :size="68" />
      <div class="ios26-hero-title">{{ title }}</div>
      <div class="ios26-hero-subtitle flex items-center justify-center gap-1.5">
        <span>{{ hit.provider.name }}</span>
        <span v-if="isDefault" class="ios26-chip is-tint">默认模型</span>
      </div>
    </div>

    <section class="ios26-section">
      <div class="ios26-section-header">模型</div>
      <div class="ios26-card">
        <label class="ios26-row">
          <span class="ios26-row-label">模型 ID</span>
          <input
            v-model="model.model"
            class="ios26-input is-mono"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            placeholder="例如 gpt-5、claude-sonnet-4-5"
            @input="save"
            @blur="fixModelId"
          >
        </label>
        <label class="ios26-row">
          <span class="ios26-row-label">显示名称</span>
          <input v-model="model.name" class="ios26-input" maxlength="40" :placeholder="model.model || '可选'" @input="save" @blur="trimName">
        </label>
      </div>
      <p class="ios26-section-footer">显示名称用在角色资料和模型选择里，留空显示模型 ID。</p>
    </section>

    <section class="ios26-section">
      <div class="ios26-section-header">接口协议</div>
      <div class="ios26-card">
        <button
          v-for="option in formatOptions"
          :key="option.value"
          type="button"
          class="ios26-row"
          :aria-pressed="model.apiFormat === option.value"
          @click="setFormat(option.value)"
        >
          <span class="ios26-row-main">
            <span class="ios26-row-title block">{{ option.label }}</span>
            <span class="ios26-row-subtitle block">{{ option.path }} · {{ option.detail }}</span>
          </span>
          <i v-if="model.apiFormat === option.value" class="ph-bold ph-check text-[18px] text-[var(--ios-tint)]"></i>
        </button>
      </div>
    </section>

    <section class="ios26-section">
      <div class="ios26-card">
        <div class="ios26-row">
          <span class="ios26-row-main">单独设置接口地址</span>
          <input :checked="urlOverrideOn" type="checkbox" class="ios26-switch" aria-label="单独设置接口地址" @change="toggleUrlOverride($event.target.checked)">
        </div>
        <label v-if="urlOverrideOn" class="ios26-row">
          <span class="ios26-row-label">接口地址</span>
          <input
            ref="overrideInput"
            :value="model.urlOverride"
            class="ios26-input is-mono"
            type="url"
            inputmode="url"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            :placeholder="hit.provider.url || 'https://example.com/v1'"
            @input="onOverrideInput"
          >
        </label>
      </div>
      <p v-if="relayHint" class="ios26-section-footer is-warning">{{ relayHint }}</p>
      <p class="ios26-section-footer break-all">请求地址：{{ endpointPreview }}</p>
    </section>

    <section class="ios26-section">
      <div class="ios26-section-header">生成参数</div>
      <div class="ios26-card">
        <div class="ios26-row">
          <span class="ios26-row-main">
            <span class="block">温度</span>
            <span v-if="!temperatureAvailable" class="ios26-row-subtitle block">此模型使用默认值</span>
          </span>
          <span v-if="model.temperature !== null && temperatureAvailable" class="ios26-row-value tabular-nums">{{ model.temperature.toFixed(2) }}</span>
          <input
            :checked="model.temperature !== null && temperatureAvailable"
            :disabled="!temperatureAvailable"
            type="checkbox"
            class="ios26-switch"
            aria-label="自定义温度"
            @change="toggleTemperature($event.target.checked)"
          >
        </div>
        <div v-if="model.temperature !== null && temperatureAvailable" class="ios26-row">
          <i class="ph ph-snowflake text-[var(--ios-secondary)]"></i>
          <input
            :value="model.temperature"
            type="range"
            min="0"
            max="2"
            step="0.05"
            class="ios26-range flex-1"
            :style="{ '--pct': `${(model.temperature / 2) * 100}%` }"
            aria-label="温度"
            @input="setTemperature($event.target.value)"
          >
          <i class="ph ph-fire text-[var(--ios-secondary)]"></i>
        </div>
        <label class="ios26-row">
          <span class="ios26-row-main">输出上限</span>
          <input
            :value="maxTokensDraft"
            class="ios26-input is-right max-w-[140px]"
            inputmode="numeric"
            placeholder="默认"
            aria-label="输出上限"
            @input="onMaxTokensInput($event.target.value)"
          >
        </label>
      </div>
      <p v-if="maxTokensError" class="ios26-section-footer is-error">{{ maxTokensError }}</p>
      <p v-else class="ios26-section-footer">{{ compatibilityNotice || '关闭或留空时使用模型 / 服务商的默认值。' }}</p>
    </section>

    <section class="ios26-section">
      <div class="ios26-section-header">思考</div>
      <div class="ios26-card">
        <div class="ios26-row">
          <span class="ios26-row-main">
            <span class="block">思考深度</span>
            <span class="ios26-row-subtitle block !whitespace-normal">{{ thinkingHint }}</span>
          </span>
        </div>
        <div class="ios26-row !pt-0">
          <div class="ios26-segmented w-full">
            <button
              v-for="option in thinkingOptions"
              :key="option.value"
              type="button"
              class="!min-w-0 flex-1 !px-1"
              :class="{ 'is-active': model.reasoningEffort === option.value }"
              @click="setReasoning(option.value)"
            >{{ option.value === '' ? '默认' : option.label }}</button>
          </div>
        </div>
      </div>
      <p v-if="model.reasoningEffort && model.reasoningEffort !== 'auto' && isAnthropicFormat" class="ios26-section-footer">
        Claude 4.6 之前的模型会改用固定思考预算，并自动去掉温度参数。
      </p>
    </section>

    <section v-if="isAnthropicFormat" class="ios26-section">
      <div class="ios26-section-header">Claude 提示词缓存</div>
      <div class="ios26-card">
        <div class="ios26-row">
          <span class="ios26-row-main">缓存系统提示词</span>
          <input :checked="model.cacheConfig.enabled" type="checkbox" class="ios26-switch" aria-label="缓存系统提示词" @change="setCache({ enabled: $event.target.checked })">
        </div>
        <div v-if="model.cacheConfig.enabled" class="ios26-row">
          <span class="ios26-row-main">缓存时长</span>
          <div class="ios26-segmented">
            <button type="button" :class="{ 'is-active': model.cacheConfig.ttl === '5m' }" @click="setCache({ ttl: '5m' })">5 分钟</button>
            <button type="button" :class="{ 'is-active': model.cacheConfig.ttl === '1h' }" @click="setCache({ ttl: '1h' })">1 小时</button>
          </div>
        </div>
      </div>
      <p class="ios26-section-footer">连续聊天用 5 分钟即可；1 小时适合长时间会话，写入成本更高。是否命中由服务商按最低长度判断。</p>
    </section>

    <section class="ios26-section">
      <div class="ios26-card">
        <button type="button" class="ios26-row" :aria-expanded="advancedOpen" @click="advancedOpen = !advancedOpen">
          <span class="ios26-row-main">高级选项</span>
          <span v-if="advancedConfigured" class="ios26-row-value text-[15px]">已自定义</span>
          <i class="ph-bold ph-caret-right ios26-chevron ios26-collapse-caret" :class="{ 'is-open': advancedOpen }"></i>
        </button>
        <template v-if="advancedOpen">
          <div class="ios26-row">
            <span class="ios26-row-main">
              <span class="block">自动适配参数</span>
              <span class="ios26-row-subtitle block !whitespace-normal">去掉 Claude 新模型、推理模型不支持的采样参数</span>
            </span>
            <input :checked="model.autoAdaptParameters" type="checkbox" class="ios26-switch" aria-label="自动适配参数" @change="setAutoAdapt($event.target.checked)">
          </div>
          <div class="ios26-subrow">
            <div class="flex items-center justify-between px-4 pt-3 text-[15px]">
              <span>附加参数</span>
              <span class="text-[12px] text-[var(--ios-secondary)]">JSON</span>
            </div>
            <textarea v-model="bodyDraft" class="ios26-textarea !pt-1.5" rows="3" spellcheck="false" :placeholder="bodyPlaceholder" @input="onBodyInput"></textarea>
          </div>
          <div class="ios26-subrow">
            <div class="flex items-center justify-between px-4 pt-3 text-[15px]">
              <span>去除参数</span>
              <span class="text-[12px] text-[var(--ios-secondary)]">逗号分隔</span>
            </div>
            <textarea v-model="removeDraft" class="ios26-textarea !min-h-[56px] !pt-1.5" rows="2" spellcheck="false" :placeholder="removePlaceholder" @input="onRemoveInput"></textarea>
          </div>
        </template>
      </div>
      <p v-if="advancedOpen" class="ios26-section-footer" :class="{ 'is-error': !!advancedError }">
        {{ advancedError || '附加参数会和请求体深度合并，同名字段以这里为准；去除参数支持点号路径，如 generationConfig.temperature。' }}
      </p>
    </section>

    <section class="ios26-section">
      <div class="ios26-card">
        <button type="button" class="ios26-row has-icon is-tint" :disabled="testing" @click="runTest">
          <span class="ios26-row-glyph"><i class="ph-bold" :class="testing ? 'ph-circle-notch ios26-spin' : 'ph-paper-plane-tilt'"></i></span>
          <span class="ios26-row-main font-medium">{{ testing ? '正在测试…' : '测试连接' }}</span>
        </button>
        <div v-if="testResult" class="ios26-row has-icon">
          <span
            class="ios26-row-glyph"
            :style="{ background: testResult.ok ? 'color-mix(in srgb, var(--ios-success) 16%, transparent)' : 'color-mix(in srgb, var(--ios-danger) 16%, transparent)', color: testResult.ok ? 'var(--ios-success)' : 'var(--ios-danger)' }"
          >
            <i class="ph-bold" :class="testResult.ok ? 'ph-check' : 'ph-x'"></i>
          </span>
          <span class="ios26-row-main">
            <span class="ios26-row-title block">{{ testResult.title }}</span>
            <span class="ios26-row-subtitle block !whitespace-normal break-all">{{ testResult.detail }}</span>
          </span>
        </div>
        <button v-if="!isDefault" type="button" class="ios26-row has-icon" @click="makeDefault">
          <span class="ios26-row-glyph"><i class="ph-bold ph-star"></i></span>
          <span class="ios26-row-main">设为默认模型</span>
        </button>
        <button type="button" class="ios26-row has-icon" @click="duplicate">
          <span class="ios26-row-glyph"><i class="ph-bold ph-copy"></i></span>
          <span class="ios26-row-main">
            <span class="block">复制一份</span>
            <span class="ios26-row-subtitle block">同一模型换协议或参数</span>
          </span>
        </button>
      </div>
    </section>

    <section class="ios26-section">
      <div class="ios26-card">
        <button type="button" class="ios26-row is-danger" @click="removeModel">删除模型</button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import ApiNavBar from './ApiNavBar.vue'
import BrandTile from '../../../components/common/BrandTile.vue'
import { useConfigsStore } from '../../../stores/configs'
import { useContactsStore } from '../../../stores/contacts'
import { getModelLabel, resolveModelConfig } from '../../../stores/configsModel'
import { useStorage } from '../../../composables/useStorage'
import { useToast } from '../../../composables/useToast'
import { showConfirm } from '../../../composables/useConfirm'
import {
  API_FORMAT_ANTHROPIC_MESSAGES,
  API_FORMAT_GEMINI_GENERATE_CONTENT,
  API_FORMAT_OPENAI_COMPATIBLE,
  API_FORMAT_OPENAI_RESPONSES,
  normalizeCacheConfig
} from '../../../composables/api/providerFormats'
import { resolveProviderChatUrl } from '../../../composables/api/providerRequest'
import { requestNonStreamingChatText } from '../../../composables/api/nonStreamingChat'
import { getModelParameterCompatibility } from '../../../composables/api/modelParameterCompatibility'
import { API_FORMAT_OPTIONS, getModelVisual } from '../../../composables/api/providerPresets'
import { THINKING_OPTIONS } from '../../../composables/api/thinkingConfig'
import {
  cleanUrlInput,
  countModelUsage,
  describeGeminiRelayHint,
  parseAdvancedField,
  parseMaxTokensInput
} from './apiSettingsHelpers'

const props = defineProps({
  modelId: { type: String, required: true }
})

const emit = defineEmits(['back', 'open-model'])

const configsStore = useConfigsStore()
const contactsStore = useContactsStore()
const { scheduleSave } = useStorage()
const { showToast } = useToast()

const TEST_TIMEOUT_MS = 30000
const thinkingOptions = THINKING_OPTIONS
const formatOptions = API_FORMAT_OPTIONS

const scrolled = ref(false)
const advancedOpen = ref(false)
const overrideInput = ref(null)
const testing = ref(false)
const testResult = ref(null)

const hit = computed(() => configsStore.findModel(props.modelId))
const model = computed(() => hit.value?.model || null)
const title = computed(() => model.value ? getModelLabel(model.value) : '模型')
const visual = computed(() => getModelVisual(model.value?.model))
const isDefault = computed(() => configsStore.activeConfigId === props.modelId)
const isOpenAIFormat = computed(() =>
  model.value?.apiFormat === API_FORMAT_OPENAI_COMPATIBLE || model.value?.apiFormat === API_FORMAT_OPENAI_RESPONSES
)
const isAnthropicFormat = computed(() => model.value?.apiFormat === API_FORMAT_ANTHROPIC_MESSAGES)

const urlOverrideOn = ref(!!model.value?.urlOverride)
const maxTokensDraft = ref(model.value?.maxTokens ?? '')
const maxTokensError = ref('')
const bodyDraft = ref(model.value?.customBodyJson || '')
const removeDraft = ref((model.value?.removeBodyParams || []).join(', '))
const bodyError = ref('')
const removeError = ref('')
const advancedError = computed(() => bodyError.value || removeError.value)

const compatibility = computed(() => getModelParameterCompatibility(model.value?.model))
const temperatureAvailable = computed(() => !model.value?.autoAdaptParameters || compatibility.value.temperatureSupported)
const compatibilityNotice = computed(() => {
  if (!compatibility.value.description) return ''
  return model.value?.autoAdaptParameters
    ? `${compatibility.value.description}，已自动使用模型默认值。`
    : `${compatibility.value.description}；已关闭自动适配，请留意请求失败。`
})

const thinkingHint = computed(() => {
  const value = model.value?.reasoningEffort
  if (value === 'auto') {
    if (isAnthropicFormat.value) return 'Claude 自适应思考：简单问题直接答，复杂问题多想'
    if (model.value?.apiFormat === API_FORMAT_GEMINI_GENERATE_CONTENT) return 'Gemini 动态思考：按问题难度决定预算'
    return '不指定深度，由模型按问题难度自己决定'
  }
  if (!value) return '不发送任何思考参数，用模型 / 服务商的默认行为'
  return isOpenAIFormat.value ? '以 reasoning_effort 发送' : (isAnthropicFormat.value ? '以 effort / 思考预算发送' : '以 thinkingBudget 发送')
})

const advancedConfigured = computed(() => !!model.value && (
  !model.value.autoAdaptParameters || !!model.value.customBodyJson || model.value.removeBodyParams.length > 0
))

const resolvedConfig = computed(() => hit.value ? resolveModelConfig(hit.value.provider, hit.value.model) : null)
const endpointPreview = computed(() => resolvedConfig.value ? resolveProviderChatUrl(resolvedConfig.value) : '')
const relayHint = computed(() => {
  if (model.value?.apiFormat !== API_FORMAT_GEMINI_GENERATE_CONTENT || model.value.urlOverride) return ''
  return describeGeminiRelayHint(hit.value.provider.url, hit.value.provider.preset === 'gemini')
})

const bodyPlaceholder = computed(() => {
  if (model.value?.apiFormat === API_FORMAT_ANTHROPIC_MESSAGES) return '{"stop_sequences": ["END"]}'
  if (model.value?.apiFormat === API_FORMAT_GEMINI_GENERATE_CONTENT) return '{"generationConfig": {"topP": 0.9}}'
  return '{"top_p": 0.9}'
})
const removePlaceholder = computed(() =>
  model.value?.apiFormat === API_FORMAT_GEMINI_GENERATE_CONTENT
    ? 'generationConfig.temperature, generationConfig.topP'
    : 'temperature, top_p'
)

let lastModelId = model.value?.model || ''

watch(model, (value) => {
  if (!value) emit('back')
})

function save() {
  scheduleSave()
}

function onScroll(event) {
  scrolled.value = event.target.scrollTop > 120
}

function fixModelId() {
  const id = model.value.model.trim()
  model.value.model = id || lastModelId
  lastModelId = model.value.model
  save()
}

function trimName() {
  model.value.name = model.value.name.trim()
  save()
}

function setFormat(format) {
  model.value.apiFormat = format
  testResult.value = null
  save()
}

async function toggleUrlOverride(on) {
  urlOverrideOn.value = on
  if (!on) {
    model.value.urlOverride = ''
    save()
    return
  }
  await nextTick()
  overrideInput.value?.focus()
}

function onOverrideInput(event) {
  model.value.urlOverride = cleanUrlInput(event.target.value)
  save()
}

function toggleTemperature(on) {
  model.value.temperature = on ? 1 : null
  save()
}

function setTemperature(value) {
  model.value.temperature = Math.round(Number(value) * 100) / 100
  save()
}

function onMaxTokensInput(value) {
  maxTokensDraft.value = value
  const result = parseMaxTokensInput(value)
  maxTokensError.value = result.error
  if (!result.ok) return
  model.value.maxTokens = result.value
  save()
}

function setReasoning(value) {
  model.value.reasoningEffort = value
  save()
}

function setCache(patch) {
  model.value.cacheConfig = normalizeCacheConfig({ ...model.value.cacheConfig, ...patch })
  save()
}

function setAutoAdapt(on) {
  model.value.autoAdaptParameters = on
  save()
}

function onBodyInput() {
  const result = parseAdvancedField('body', bodyDraft.value)
  bodyError.value = result.error
  if (!result.ok) return
  model.value.customBodyJson = result.value
  save()
}

function onRemoveInput() {
  const result = parseAdvancedField('remove', removeDraft.value)
  removeError.value = result.error
  if (!result.ok) return
  model.value.removeBodyParams = result.value
  save()
}

async function runTest() {
  const cfg = resolvedConfig.value
  if (!cfg || testing.value) return
  testing.value = true
  testResult.value = null
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TEST_TIMEOUT_MS)
  const startedAt = performance.now()
  try {
    const { content } = await requestNonStreamingChatText(
      cfg,
      [{ role: 'user', content: '这是一条连接测试，请只回复“OK”。' }],
      { maxTokens: 32, signal: controller.signal }
    )
    const seconds = ((performance.now() - startedAt) / 1000).toFixed(2)
    const reply = String(content || '').trim()
    testResult.value = {
      ok: true,
      title: `连接正常 · ${seconds} 秒`,
      detail: reply ? `回复：${reply.slice(0, 80)}` : '请求成功，模型没有返回文字（推理模型输出上限过低时常见）'
    }
  } catch (error) {
    testResult.value = {
      ok: false,
      title: '连接失败',
      detail: error?.name === 'AbortError' ? `${TEST_TIMEOUT_MS / 1000} 秒内没有响应` : (error?.message || String(error))
    }
  } finally {
    clearTimeout(timer)
    testing.value = false
  }
}

function makeDefault() {
  configsStore.setDefaultModel(props.modelId)
  save()
  showToast('已设为默认模型')
}

function duplicate() {
  const copy = configsStore.duplicateModel(props.modelId)
  if (!copy) return
  save()
  emit('open-model', copy.id, { replace: true })
}

async function removeModel() {
  const usage = countModelUsage(props.modelId, contactsStore.contacts)
  const confirmed = await showConfirm({
    title: '删除模型',
    message: usage > 0
      ? `有 ${usage} 处角色或群聊在用“${title.value}”，删除后会改用默认模型。`
      : `确定删除“${title.value}”？`,
    confirmText: '删除',
    destructive: true
  })
  if (!confirmed) return
  configsStore.removeModel(props.modelId)
  save()
  showToast('已删除')
}
</script>
