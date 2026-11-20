<template>
  <IosSheet
    :visible="visible"
    title="添加模型"
    :subtitle="provider?.name || ''"
    tall
    @close="$emit('close')"
  >
    <template #toolbar>
      <label class="ios26-search">
        <i class="ph ph-magnifying-glass"></i>
        <input
          v-model="query"
          type="search"
          placeholder="搜索，或输入模型 ID 手动添加"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          enterkeyhint="done"
          @keydown.enter.prevent="addTypedModel"
        >
        <button v-if="query" type="button" class="ios26-icon-btn !h-[22px] !w-[22px] !text-[11px]" aria-label="清除" @click="query = ''">
          <i class="ph-bold ph-x"></i>
        </button>
      </label>
    </template>

    <template v-if="provider">
      <section v-if="typedModelId" class="ios26-section">
        <div class="ios26-card">
          <button type="button" class="ios26-row has-icon is-tint" @click="addTypedModel">
            <span class="ios26-row-glyph"><i class="ph-bold ph-plus"></i></span>
            <span class="ios26-row-main">
              <span class="ios26-row-title block font-medium">添加“{{ typedModelId }}”</span>
              <span class="ios26-row-subtitle block">手动添加，协议：{{ formatOption(resolveFormat(typedModelId)).label }}</span>
            </span>
          </button>
        </div>
      </section>

      <section v-if="showFormatModes" class="ios26-section">
        <div class="ios26-card">
          <div class="ios26-row">
            <span class="ios26-row-main">
              <span class="block">新模型的协议</span>
              <span class="ios26-row-subtitle block">{{ formatMode === 'auto' ? 'Claude 用 Anthropic、Gemini 用原生接口' : `都用 ${formatOption(provider.apiFormat).label}` }}</span>
            </span>
            <div class="ios26-segmented">
              <button type="button" :class="{ 'is-active': formatMode === 'provider' }" @click="formatMode = 'provider'">统一</button>
              <button type="button" :class="{ 'is-active': formatMode === 'auto' }" @click="formatMode = 'auto'">按模型</button>
            </div>
          </div>
        </div>
      </section>

      <section class="ios26-section">
        <div class="ios26-section-header">
          <span>{{ available.length ? `可用模型 · ${available.length}` : '可用模型' }}</span>
          <button type="button" class="ios26-header-action" :disabled="loading" @click="fetchList">
            <i class="ph-bold ph-arrows-clockwise mr-0.5" :class="{ 'ios26-spin': loading }"></i>{{ loading ? '获取中' : (available.length ? '刷新' : '获取') }}
          </button>
        </div>

        <div v-if="loading && !available.length" class="ios26-card">
          <div class="ios26-empty"><i class="ph ph-circle-notch ios26-spin"></i>正在向 {{ provider.name }} 获取模型列表…</div>
        </div>
        <div v-else-if="!available.length" class="ios26-card">
          <div class="ios26-empty">
            <i class="ph ph-cloud-arrow-down"></i>
            <span>{{ fetchError || '还没有获取过模型列表' }}</span>
            <span v-if="fetchError" class="text-[13px]">也可以在上方搜索框直接输入模型 ID 添加</span>
            <button type="button" class="ios26-glass-pill mt-2" @click="fetchList">获取模型列表</button>
          </div>
        </div>
        <p v-else-if="fetchError" class="ios26-section-footer is-error !pt-0 !pb-2">{{ fetchError }}</p>
      </section>

      <section v-for="group in groups" :key="group.brand || 'other'" class="ios26-section !mt-3">
        <div class="ios26-card">
          <button type="button" class="ios26-row has-icon" :aria-expanded="isGroupOpen(group)" @click="toggleGroup(group)">
            <BrandTile v-bind="familyVisual(group)" variant="tinted" :size="30" />
            <span class="ios26-row-main">
              <span class="ios26-row-title block font-semibold">{{ group.label }}</span>
            </span>
            <span class="ios26-row-value text-[15px]">{{ groupCountText(group) }}</span>
            <i class="ph-bold ph-caret-right ios26-chevron ios26-collapse-caret" :class="{ 'is-open': isGroupOpen(group) }"></i>
          </button>
          <template v-if="isGroupOpen(group)">
            <button
              v-for="modelId in group.ids"
              :key="modelId"
              type="button"
              class="ios26-row !min-h-[46px] !pl-[58px]"
              style="--sep-inset: 58px"
              :disabled="existing.has(modelId)"
              @click="toggleModel(modelId)"
            >
              <span class="ios26-row-main">
                <span class="ios26-row-title block text-[16px]">{{ modelId }}</span>
              </span>
              <span v-if="existing.has(modelId)" class="ios26-chip">已添加</span>
              <span v-else class="pick-circle" :class="{ 'is-on': selected.has(modelId) }">
                <i v-if="selected.has(modelId)" class="ph-bold ph-check"></i>
              </span>
            </button>
          </template>
        </div>
      </section>

      <div v-if="available.length && !groups.length && !typedModelId" class="ios26-empty">没有匹配的模型</div>
    </template>

    <template #footer>
      <button type="button" class="ios26-primary-btn" :disabled="selected.size === 0" @click="addSelected">
        {{ selected.size ? `添加 ${selected.size} 个模型` : '选择要添加的模型' }}
      </button>
    </template>
  </IosSheet>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import IosSheet from '../../../components/common/IosSheet.vue'
import BrandTile from '../../../components/common/BrandTile.vue'
import { useConfigsStore } from '../../../stores/configs'
import { normalizeModelIdList } from '../../../stores/configsModel'
import { useStorage } from '../../../composables/useStorage'
import { useToast } from '../../../composables/useToast'
import { useApi } from '../../../composables/useApi'
import { API_FORMAT_OPENAI_COMPATIBLE } from '../../../composables/api/providerFormats'
import { getBrandColor } from '../../../composables/api/brandIcons'
import { getApiFormatOption, guessApiFormatForModel } from '../../../composables/api/providerPresets'
import { groupModelIdsByFamily } from './apiSettingsHelpers'

const props = defineProps({
  visible: { type: Boolean, default: false },
  providerId: { type: String, required: true },
  autoFetch: { type: Boolean, default: false }
})

const emit = defineEmits(['close'])

const configsStore = useConfigsStore()
const { scheduleSave } = useStorage()
const { showToast } = useToast()
const { fetchModels } = useApi()

const query = ref('')
const selected = ref(new Set())
const openGroups = ref(new Set())
const loading = ref(false)
const fetchError = ref('')
const formatMode = ref('provider')

const provider = computed(() => configsStore.getProvider(props.providerId))
const available = computed(() => provider.value?.cachedModels || [])
const existing = computed(() => new Set((provider.value?.models || []).map(model => model.model)))
const showFormatModes = computed(() => provider.value?.apiFormat === API_FORMAT_OPENAI_COMPATIBLE)
const normalizedQuery = computed(() => query.value.trim().toLowerCase())

const groups = computed(() => {
  const q = normalizedQuery.value
  const ids = q ? available.value.filter(id => id.toLowerCase().includes(q)) : available.value
  return groupModelIdsByFamily(ids)
})

const typedModelId = computed(() => {
  const id = query.value.trim()
  if (!id || existing.value.has(id) || available.value.includes(id)) return ''
  return id
})

watch(() => props.visible, (visible) => {
  if (!visible) return
  query.value = ''
  selected.value = new Set()
  fetchError.value = ''
  formatMode.value = 'provider'
  openGroups.value = new Set(groupModelIdsByFamily(available.value).length <= 2
    ? groupModelIdsByFamily(available.value).map(group => group.brand)
    : [])
  if (props.autoFetch || available.value.length === 0) fetchList()
})

function resolveFormat(modelId) {
  const fallback = provider.value?.apiFormat
  return formatMode.value === 'auto' && showFormatModes.value
    ? guessApiFormatForModel(modelId, fallback)
    : fallback
}

async function fetchList() {
  const current = provider.value
  if (!current || loading.value) return
  if (!current.url) {
    fetchError.value = '请先填写接口地址'
    return
  }
  loading.value = true
  fetchError.value = ''
  const result = await fetchModels({
    url: current.url,
    key: current.key,
    apiFormat: current.apiFormat,
    customHeadersJson: current.customHeadersJson,
    model: ''
  })
  loading.value = false
  if (!result.success) {
    fetchError.value = result.error || '获取失败'
    return
  }
  current.cachedModels = normalizeModelIdList(result.models)
  current.cachedModelsUpdatedAt = Date.now()
  scheduleSave()
}

function isGroupOpen(group) {
  return !!normalizedQuery.value || openGroups.value.has(group.brand)
}

function toggleGroup(group) {
  if (normalizedQuery.value) return
  const next = new Set(openGroups.value)
  if (next.has(group.brand)) next.delete(group.brand)
  else next.add(group.brand)
  openGroups.value = next
}

function groupCountText(group) {
  const picked = group.ids.filter(id => selected.value.has(id)).length
  return picked ? `已选 ${picked}/${group.ids.length}` : String(group.ids.length)
}

function toggleModel(modelId) {
  const next = new Set(selected.value)
  if (next.has(modelId)) next.delete(modelId)
  else next.add(modelId)
  selected.value = next
}

function addModels(ids) {
  const added = configsStore.addModels(props.providerId, ids, resolveFormat)
  if (added.length === 0) return 0
  scheduleSave()
  return added.length
}

function addTypedModel() {
  const id = typedModelId.value
  if (!id) return
  if (addModels([id])) {
    showToast(`已添加 ${id}`)
    query.value = ''
  }
}

function addSelected() {
  const count = addModels([...selected.value])
  if (count) showToast(`已添加 ${count} 个模型`)
  emit('close')
}

function familyVisual(group) {
  if (!group.brand) return { icon: 'ph-cube', color: '' }
  return { brand: group.brand, color: getBrandColor(group.brand) || '' }
}

const formatOption = format => getApiFormatOption(format)
</script>

<style scoped>
.pick-circle {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  box-shadow: inset 0 0 0 1.5px var(--ios-tertiary);
  color: #fff;
  font-size: 13px;
  transition: background-color 0.15s ease, box-shadow 0.15s ease;
}

.pick-circle.is-on {
  background: var(--ios-tint);
  box-shadow: none;
}
</style>
