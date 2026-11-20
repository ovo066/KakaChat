<template>
  <section class="cc-glass cc-group">
    <button type="button" class="cc-note" @click="profileOpen = true">
      <span class="cc-label">人设</span>
      <span class="cc-note-text" :class="{ 'is-empty': !promptExcerpt }">{{ promptExcerpt || '还没有写人设，点这里补充' }}</span>
    </button>
  </section>

  <section class="cc-glass cc-group">
    <button v-for="row in configRows" :key="row.key" type="button" class="cc-row" @click="row.open">
      <span class="cc-row-icon" :style="{ '--icon-bg': row.color }"><i :class="row.icon"></i></span>
      <span class="cc-row-title">{{ row.title }}</span>
      <span class="cc-row-value">{{ row.value }}</span>
      <i class="ph-bold ph-caret-right"></i>
    </button>
  </section>

  <slot></slot>

  <section class="cc-glass cc-group">
    <button type="button" class="cc-row" @click="backgroundOpen = true">
      <span class="cc-row-icon" style="--icon-bg: #5E5CE6"><i class="ph-fill ph-image-square"></i></span>
      <span class="cc-row-title">聊天背景</span>
      <span v-if="contact?.chatBackground" class="cc-row-thumb" :style="{ backgroundImage: cssUrl(contact.chatBackground) }"></span>
      <span v-else class="cc-row-value">跟随主题</span>
      <i class="ph-bold ph-caret-right"></i>
    </button>
    <button type="button" class="cc-row" @click="active = 'retention'">
      <span class="cc-row-icon" style="--icon-bg: #8E8E93"><i class="ph-fill ph-clock-counter-clockwise"></i></span>
      <span class="cc-row-title">保留消息</span>
      <span class="cc-row-value">{{ editor.summaries.value.retention }}</span>
      <i class="ph-bold ph-caret-right"></i>
    </button>
  </section>

  <section class="cc-glass cc-group">
    <button type="button" class="cc-row is-danger" @click="editor.clearHistory()">
      <span class="cc-row-title">清空聊天记录</span>
      <span class="cc-row-value">{{ messageCount }} 条</span>
    </button>
    <button type="button" class="cc-row is-danger" @click="removeContact">
      <span class="cc-row-title">删除联系人</span>
    </button>
  </section>

  <ContactProfileSheet :visible="profileOpen" :contact="contact" @close="profileOpen = false" @save="saveProfile" />

  <ModelPickerSheet
    :visible="active === 'model'"
    :model-value="contact?.configId || null"
    title="角色使用的模型"
    :follow-hint="editor.defaultModelHint.value"
    @update:model-value="editor.update({ configId: $event || null })"
    @close="active = ''"
  />

  <ContactOptionSheet
    :visible="active === 'persona'"
    title="我的身份"
    subtitle="和 TA 聊天时你使用的面具"
    :options="editor.personaOptions.value"
    :model-value="contact?.personaId || null"
    none-label="使用全局默认"
    empty-text="还没有面具，可在「面具」里创建。"
    @update:model-value="editor.update({ personaId: $event })"
    @close="active = ''"
  />
  <ContactOptionSheet
    :visible="active === 'lorebooks'"
    title="世界书"
    :options="editor.lorebookOptions.value"
    :model-value="editor.boundLorebookIds.value"
    multiple
    empty-text="还没有可绑定的世界书。"
    footer="绑定的世界书条目会注入到这个角色的对话里。"
    @update:model-value="editor.update({ boundLorebooks: $event })"
    @close="active = ''"
  />
  <ContactOptionSheet
    :visible="active === 'stickers'"
    title="AI 贴纸分组"
    :options="editor.stickerGroupOptions.value"
    :model-value="editor.stickerGroupIds.value"
    multiple
    none-label="全部贴纸"
    none-subtitle="不限制该角色可用分组"
    empty-text="暂无贴纸分组，可在贴纸管理中创建。"
    @update:model-value="editor.update({ stickerGroupIds: $event })"
    @close="active = ''"
  />
  <ContactOptionSheet
    :visible="active === 'mcp'"
    title="MCP 工具"
    :options="editor.mcpOptions.value"
    :model-value="editor.mcpServerIds.value"
    multiple
    none-label="不使用 MCP"
    none-subtitle="留空时不发现外部工具"
    none-icon="ph-prohibit"
    empty-text="暂无可选 MCP 服务器，请先在「设置 › AI 功能」中配置。"
    @update:model-value="editor.update({ mcpServerIds: $event })"
    @close="active = ''"
  />
  <ContactOptionSheet
    :visible="active === 'retention'"
    title="保留消息"
    :options="retentionOptions"
    :model-value="Number(contact?.maxMessages || 0)"
    footer="超出限制时自动删除最早的消息。"
    @update:model-value="editor.update({ maxMessages: Number($event) || 0 })"
    @close="active = ''"
  />

  <IosSheet :visible="active === 'voice'" title="语音音色" confirmable @close="active = ''" @confirm="saveVoice">
    <section class="ios26-section">
      <div class="ios26-card">
        <label class="ios26-row">
          <span class="ios26-row-label">Edge</span>
          <input v-model="voiceDraft.edgeVoiceId" class="ios26-input is-right is-mono" autocomplete="off" spellcheck="false" placeholder="zh-CN-XiaoxiaoNeural">
        </label>
        <label class="ios26-row">
          <span class="ios26-row-label">MiniMax</span>
          <input v-model="voiceDraft.minimaxVoiceId" class="ios26-input is-right is-mono" autocomplete="off" spellcheck="false" placeholder="voice_id">
        </label>
      </div>
      <p class="ios26-section-footer">留空则使用全局默认音色。语音播放模式在「设置 › 互动功能」中配置。</p>
    </section>
  </IosSheet>

  <IosSheet :visible="backgroundOpen" title="聊天背景" @close="backgroundOpen = false">
    <div class="cc-bg-preview" :style="contact?.chatBackground ? { backgroundImage: cssUrl(contact.chatBackground) } : null">
      <span v-if="!contact?.chatBackground">跟随主题背景</span>
    </div>
    <section class="ios26-section">
      <div class="ios26-card">
        <button type="button" class="ios26-row is-tint" @click="bgInput?.click()">
          <span class="ios26-row-title">从相册选择</span>
        </button>
        <button type="button" class="ios26-row is-tint" @click="fillBackgroundUrl">
          <span class="ios26-row-title">填写图片链接</span>
        </button>
        <button v-if="contact?.chatBackground" type="button" class="ios26-row is-danger" @click="editor.update({ chatBackground: null })">
          <span class="ios26-row-title">清除背景</span>
        </button>
      </div>
    </section>
    <input ref="bgInput" type="file" class="hidden" accept="image/*" @change="handleBackgroundFile">
  </IosSheet>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import IosSheet from '../../../../components/common/IosSheet.vue'
import ModelPickerSheet from '../../../../components/common/ModelPickerSheet.vue'
import { compressImage } from '../../../../composables/useImage'
import { useToast } from '../../../../composables/useToast'
import { normalizeImageUrlInput } from '../../../../utils/mediaUrl'
import ContactOptionSheet from './ContactOptionSheet.vue'
import ContactProfileSheet from './ContactProfileSheet.vue'
import { MESSAGE_RETENTION_OPTIONS, useContactCardEditor } from './useContactCardEditor'

const PROMPT_EXCERPT_CHARS = 90

const props = defineProps({
  contact: { type: Object, default: null }
})

const emit = defineEmits(['deleted'])

const editor = useContactCardEditor(() => props.contact)
const { showToast } = useToast()

const active = ref('')
const profileOpen = ref(false)
const backgroundOpen = ref(false)
const bgInput = ref(null)
const voiceDraft = reactive({ edgeVoiceId: '', minimaxVoiceId: '' })
const retentionOptions = MESSAGE_RETENTION_OPTIONS.map(item => ({ ...item, icon: '🗂️' }))

const messageCount = computed(() => (Array.isArray(props.contact?.msgs) ? props.contact.msgs.length : 0))
const promptExcerpt = computed(() => {
  const text = String(props.contact?.prompt || '').replace(/\s+/g, ' ').trim()
  return text.length > PROMPT_EXCERPT_CHARS ? text.slice(0, PROMPT_EXCERPT_CHARS) + '…' : text
})

const configRows = computed(() => {
  const s = editor.summaries.value
  return [
    { key: 'model', title: '模型', value: s.model, icon: 'ph-fill ph-cpu', color: '#0A84FF', open: () => { active.value = 'model' } },
    { key: 'persona', title: '我的身份', value: s.persona, icon: 'ph-fill ph-mask-happy', color: '#AF52DE', open: () => { active.value = 'persona' } },
    { key: 'lorebooks', title: '世界书', value: s.lorebooks, icon: 'ph-fill ph-book-open-text', color: '#34C759', open: () => { active.value = 'lorebooks' } },
    { key: 'stickers', title: 'AI 贴纸', value: s.stickers, icon: 'ph-fill ph-sticker', color: '#FF2D55', open: () => { active.value = 'stickers' } },
    { key: 'mcp', title: 'MCP 工具', value: s.mcp, icon: 'ph-fill ph-wrench', color: '#FF9500', open: () => { active.value = 'mcp' } },
    { key: 'voice', title: '语音音色', value: s.voice, icon: 'ph-fill ph-waveform', color: '#30B0C7', open: openVoice }
  ]
})

function openVoice() {
  voiceDraft.edgeVoiceId = props.contact?.edgeVoiceId || ''
  voiceDraft.minimaxVoiceId = props.contact?.minimaxVoiceId || ''
  active.value = 'voice'
}

function saveVoice() {
  editor.saveVoice(voiceDraft)
  active.value = ''
}

function saveProfile(draft) {
  if (editor.saveProfile(draft)) profileOpen.value = false
}

async function handleBackgroundFile(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  editor.update({ chatBackground: await compressImage(file, 800) })
}

function fillBackgroundUrl() {
  if (typeof window === 'undefined' || typeof window.prompt !== 'function') return
  const raw = window.prompt('请输入聊天背景图床 URL（支持 http/https）', props.contact?.chatBackground || '')
  if (raw === null) return
  const url = normalizeImageUrlInput(raw)
  if (url === null) {
    showToast('请输入有效的图片 URL')
    return
  }
  editor.update({ chatBackground: url || null })
}

async function removeContact() {
  if (await editor.deleteContact()) emit('deleted')
}

function cssUrl(url) {
  // 引号、反斜杠、空白会截断 CSS url()，转成百分号编码
  return `url("${String(url || '').replace(/["\\\s]/g, encodeURIComponent)}")`
}

defineExpose({ openProfile: () => { profileOpen.value = true } })
</script>

<style scoped>
.cc-bg-preview {
  height: 150px;
  margin: 0 16px 16px;
  border-radius: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--ios-fill);
  background-size: cover;
  background-position: center;
  color: var(--ios-secondary);
  font-size: 14px;
}
</style>
