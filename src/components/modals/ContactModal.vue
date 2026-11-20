<template>
  <IosModal
    :visible="visible"
    :title="isEdit ? '编辑联系人' : '新建联系人'"
    :show-delete="isEdit"
    height="85%"
    @close="$emit('close')"
    @done="saveContact"
    @delete="deleteContact"
  >
    <div class="p-6 flex flex-col items-center gap-5">
      <div v-if="!isEdit" class="w-full">
        <input ref="cardInput" type="file" class="hidden" accept=".png,.json,image/png,application/json" @change="handleCardImport">
        <button
          type="button"
          :disabled="importing"
          class="w-full px-4 py-3 rounded-[10px] text-[15px] text-[var(--primary-color)] bg-[var(--card-bg)] disabled:opacity-50"
          @click="cardInput?.click()"
        >
          <i class="ph ph-download-simple mr-1"></i>
          {{ importing ? '正在读取角色卡…' : '导入 SillyTavern 角色卡' }}
        </button>
        <p class="mt-2 text-[12px] text-[var(--text-secondary)]">支持 V1/V2/V3 PNG、JSON，自动导入卡内世界书。检查后点击“完成”保存。</p>
        <p v-if="importError" role="alert" class="mt-2 text-[13px] text-red-500">{{ importError }}</p>
      </div>
      <input ref="avatarInput" type="file" class="hidden" accept="image/*" @change="handleAvatarChange">
      <div
        class="w-24 h-24 rounded-full bg-[#E9E9EB] dark:bg-gray-700 flex items-center justify-center text-4xl relative overflow-hidden cursor-pointer active:scale-95 transition-transform"
        @click="avatarInput?.click()"
      >
        <img v-if="tempAvatar" :src="tempAvatar" class="absolute inset-0 w-full h-full object-cover">
        <span v-else>{{ form.avatar }}</span>
        <div class="absolute bottom-0 w-full text-[10px] text-center bg-black/30 py-1 text-white">编辑</div>
      </div>
      <div class="flex items-center gap-2 text-[#8E8E93]">
        <span class="text-xs">或输入 Emoji:</span>
        <input v-model="form.avatar" type="text" class="w-12 border-b border-gray-300 dark:border-gray-600 bg-transparent text-center outline-none dark:text-white text-xl" maxlength="2" @input="tempAvatar = null">
      </div>
      <button
        class="px-3 py-1.5 rounded-full text-[12px] text-[#007AFF] bg-[#007AFF]/10 dark:bg-[#0A84FF]/20"
        @click="handleAvatarUrlInput"
      >
        头像填URL
      </button>
      <div class="w-full bg-white dark:bg-[#2c2c2e] rounded-[10px] overflow-hidden">
        <input v-model="form.name" type="text" placeholder="名称 (必填)" class="w-full px-4 py-3 text-[17px] outline-none border-b border-[#E5E5EA] dark:border-gray-700 bg-transparent dark:text-white">
        <textarea v-model="form.prompt" rows="6" placeholder="系统提示词 (角色设定)&#10;&#10;例如: 你是一个友好的AI助手..." class="w-full px-4 py-3 text-[15px] outline-none resize-none bg-transparent dark:text-white" style="min-height: 160px;"></textarea>
      </div>

      <div v-if="importedCard" class="w-full bg-white dark:bg-[#2c2c2e] rounded-[10px] overflow-hidden">
        <div class="px-4 py-3 text-[13px] text-[#8E8E93]">开场白（留空则不添加消息）</div>
        <select v-if="importedCard.alternateGreetings.length" v-model="selectedGreeting" aria-label="选择开场白" class="w-full px-4 py-2 bg-transparent text-[var(--text-primary)]" @change="selectGreeting">
          <option value="-1">默认开场白</option>
          <option v-for="(_, index) in importedCard.alternateGreetings" :key="index" :value="index">备用开场白 {{ index + 1 }}</option>
        </select>
        <textarea v-model="importGreeting" aria-label="开场白" rows="4" class="w-full px-4 py-3 text-[15px] outline-none resize-none bg-transparent dark:text-white"></textarea>
        <p v-if="importedCard.creatorNotes" class="px-4 pb-3 text-[12px] text-[var(--text-secondary)] whitespace-pre-wrap">作者说明：{{ importedCard.creatorNotes }}</p>
      </div>

      <!-- Lorebook Binding -->
      <div class="w-full bg-white dark:bg-[#2c2c2e] rounded-[10px] overflow-hidden">
        <div class="px-4 py-3 border-b border-[#E5E5EA] dark:border-gray-700">
          <span class="text-[13px] text-[#8E8E93] uppercase">世界书绑定</span>
        </div>
        <p v-if="importedCard?.lorebook" class="px-4 py-2 text-[12px] text-[var(--text-secondary)]">已读取卡内世界书（{{ importedCard.lorebook.entries.length }} 条），勾选后将在保存时导入并绑定。部分高级规则可能与酒馆不同。</p>
        <p v-else-if="missingReferencedLorebook" class="px-4 py-2 text-[12px] text-[var(--text-secondary)]">角色卡引用“{{ missingReferencedLorebook }}”，但未包含世界书内容。请从酒馆导出包含世界书的角色卡，或创建世界书后手动绑定。</p>
        <div v-if="availableLorebooks.length === 0" class="px-4 py-3 text-[#8E8E93] text-center">暂无可绑定世界书</div>
        <div
          v-for="book in availableLorebooks"
          :key="book.id"
          class="px-4 py-3 flex justify-between items-center cursor-pointer active:bg-gray-100 dark:active:bg-gray-800 border-b border-[#E5E5EA] dark:border-gray-700 last:border-b-0"
          @click="toggleLorebookBinding(book.id)"
        >
          <div class="flex items-center gap-2">
            <span class="text-xl">{{ book.icon }}</span>
            <span class="text-[17px] text-black dark:text-white">{{ book.name }}</span>
          </div>
          <div
            class="w-[24px] h-[24px] rounded-full border-2 flex items-center justify-center"
            :class="form.boundLorebooks.includes(book.id) ? 'bg-[#007AFF] border-[#007AFF]' : 'border-[#C6C6C8]'"
          >
            <i v-if="form.boundLorebooks.includes(book.id)" class="ph-bold ph-check text-white text-sm"></i>
          </div>
        </div>
      </div>

      <!-- Persona Binding -->
      <div class="w-full bg-white dark:bg-[#2c2c2e] rounded-[10px] overflow-hidden">
        <div class="px-4 py-3 border-b border-[#E5E5EA] dark:border-gray-700">
          <span class="text-[13px] text-[#8E8E93] uppercase">用户面具</span>
        </div>
        <div
          class="px-4 py-3 flex justify-between items-center cursor-pointer active:bg-gray-100 dark:active:bg-gray-800 border-b border-[#E5E5EA] dark:border-gray-700"
          @click="form.personaId = null"
        >
          <div class="flex items-center gap-2">
            <span class="text-xl">🌐</span>
            <span class="text-[17px] text-black dark:text-white">使用全局默认</span>
          </div>
          <div
            class="w-[24px] h-[24px] rounded-full border-2 flex items-center justify-center"
            :class="!form.personaId ? 'bg-[#AF52DE] border-[#AF52DE]' : 'border-[#C6C6C8]'"
          >
            <i v-if="!form.personaId" class="ph-bold ph-check text-white text-sm"></i>
          </div>
        </div>
        <div
          v-for="persona in personasStore.personas"
          :key="persona.id"
          class="px-4 py-3 flex justify-between items-center cursor-pointer active:bg-gray-100 dark:active:bg-gray-800 border-b border-[#E5E5EA] dark:border-gray-700 last:border-b-0"
          @click="form.personaId = persona.id"
        >
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-[#E9E9EB] dark:bg-gray-700 flex items-center justify-center text-lg overflow-hidden">
              <img v-if="persona.avatarType === 'image'" :src="persona.avatar" class="w-full h-full object-cover">
              <template v-else>{{ persona.avatar }}</template>
            </div>
            <span class="text-[17px] text-black dark:text-white">{{ persona.name }}</span>
          </div>
          <div
            class="w-[24px] h-[24px] rounded-full border-2 flex items-center justify-center"
            :class="form.personaId === persona.id ? 'bg-[#AF52DE] border-[#AF52DE]' : 'border-[#C6C6C8]'"
          >
            <i v-if="form.personaId === persona.id" class="ph-bold ph-check text-white text-sm"></i>
          </div>
        </div>
      </div>

      <!-- Sticker Group Binding -->
      <div class="w-full bg-white dark:bg-[#2c2c2e] rounded-[10px] overflow-hidden">
        <div class="px-4 py-3 border-b border-[#E5E5EA] dark:border-gray-700">
          <span class="text-[13px] text-[#8E8E93] uppercase">AI贴纸分组</span>
        </div>
        <div v-if="availableStickerGroups.length === 0" class="px-4 py-3 text-[#8E8E93] text-center">
          暂无贴纸分组，可在贴纸管理中创建
        </div>
        <template v-else>
          <div
            class="px-4 py-3 flex justify-between items-center cursor-pointer active:bg-gray-100 dark:active:bg-gray-800 border-b border-[#E5E5EA] dark:border-gray-700"
            @click="form.stickerGroupIds = []"
          >
            <div class="flex items-center gap-2">
              <span class="text-xl">🌐</span>
              <div>
                <div class="text-[17px] text-black dark:text-white">全部贴纸</div>
                <div class="text-[12px] text-[#8E8E93]">不限制该角色可用分组</div>
              </div>
            </div>
            <div
              class="w-[24px] h-[24px] rounded-full border-2 flex items-center justify-center"
              :class="form.stickerGroupIds.length === 0 ? 'bg-[#FF2D55] border-[#FF2D55]' : 'border-[#C6C6C8]'"
            >
              <i v-if="form.stickerGroupIds.length === 0" class="ph-bold ph-check text-white text-sm"></i>
            </div>
          </div>
          <div
            v-for="group in availableStickerGroups"
            :key="group.id"
            class="px-4 py-3 flex justify-between items-center cursor-pointer active:bg-gray-100 dark:active:bg-gray-800 border-b border-[#E5E5EA] dark:border-gray-700 last:border-b-0"
            @click="toggleStickerGroup(group.id)"
          >
            <div class="flex items-center gap-2">
              <span class="text-xl">🏷️</span>
              <div>
                <div class="text-[17px] text-black dark:text-white">{{ group.name }}</div>
                <div class="text-[12px] text-[#8E8E93]">{{ groupStickerCount(group.id) }} 张贴纸</div>
              </div>
            </div>
            <div
              class="w-[24px] h-[24px] rounded-full border-2 flex items-center justify-center"
              :class="form.stickerGroupIds.includes(group.id) ? 'bg-[#FF2D55] border-[#FF2D55]' : 'border-[#C6C6C8]'"
            >
              <i v-if="form.stickerGroupIds.includes(group.id)" class="ph-bold ph-check text-white text-sm"></i>
            </div>
          </div>
        </template>
      </div>

      <!-- 模型：按供应商分组折叠选择 -->
      <div class="w-full bg-white dark:bg-[#2c2c2e] rounded-[10px] overflow-hidden">
        <div class="px-4 py-3 border-b border-[#E5E5EA] dark:border-gray-700">
          <span class="text-[13px] text-[#8E8E93] uppercase">模型</span>
        </div>
        <ModelSelectField v-model="form.configId" title="角色使用的模型" :follow-hint="defaultModelHint" />
      </div>

      <div class="w-full bg-white dark:bg-[#2c2c2e] rounded-[10px] overflow-hidden">
        <div class="px-4 py-3 border-b border-[#E5E5EA] dark:border-gray-700">
          <span class="text-[13px] text-[#8E8E93] uppercase">MCP服务器</span>
        </div>
        <div v-if="availableMcpServers.length === 0" class="px-4 py-3 text-[#8E8E93] text-center">
          暂无可选 MCP 服务器，请先在“设置-AI功能”中配置。
        </div>
        <template v-else>
          <div
            class="px-4 py-3 flex justify-between items-center cursor-pointer active:bg-gray-100 dark:active:bg-gray-800 border-b border-[#E5E5EA] dark:border-gray-700"
            @click="form.mcpServerIds = []"
          >
            <div class="flex items-center gap-2">
              <span class="text-xl">🌐</span>
              <div>
                <div class="text-[17px] text-black dark:text-white">不使用 MCP</div>
                <div class="text-[12px] text-[#8E8E93]">留空时不发现外部工具</div>
              </div>
            </div>
            <div
              class="w-[24px] h-[24px] rounded-full border-2 flex items-center justify-center"
              :class="form.mcpServerIds.length === 0 ? 'bg-[#FF9500] border-[#FF9500]' : 'border-[#C6C6C8]'"
            >
              <i v-if="form.mcpServerIds.length === 0" class="ph-bold ph-check text-white text-sm"></i>
            </div>
          </div>
          <div
            v-for="server in availableMcpServers"
            :key="server.id"
            class="px-4 py-3 flex justify-between items-center cursor-pointer active:bg-gray-100 dark:active:bg-gray-800 border-b border-[#E5E5EA] dark:border-gray-700 last:border-b-0"
            @click="toggleMcpServer(server.id)"
          >
            <div class="flex items-center gap-2">
              <span class="text-xl">🧰</span>
              <div>
                <div class="text-[17px] text-black dark:text-white">{{ server.name || server.id }}</div>
                <div class="text-[12px] text-[#8E8E93]">{{ mcpServerSubtitle(server) }}</div>
              </div>
            </div>
            <div
              class="w-[24px] h-[24px] rounded-full border-2 flex items-center justify-center"
              :class="form.mcpServerIds.includes(server.id) ? 'bg-[#FF9500] border-[#FF9500]' : 'border-[#C6C6C8]'"
            >
              <i v-if="form.mcpServerIds.includes(server.id)" class="ph-bold ph-check text-white text-sm"></i>
            </div>
          </div>
        </template>
      </div>

      <!-- Voice Settings -->
      <div class="w-full bg-white dark:bg-[#2c2c2e] rounded-[10px] overflow-hidden">
        <div class="px-4 py-3 border-b border-[#E5E5EA] dark:border-gray-700">
          <span class="text-[13px] text-[#8E8E93] uppercase">语音</span>
        </div>
        <div class="px-4 py-3 border-b border-[#E5E5EA] dark:border-gray-700 text-[12px] text-[#8E8E93]">
          留空则使用全局默认音色。语音播放模式在“设置-互动功能”中配置。
        </div>
        <div class="flex items-center px-4 py-3 border-b border-[#E5E5EA] dark:border-gray-700">
          <span class="w-24 text-[17px] text-black dark:text-white shrink-0">Edge音色</span>
          <input
            v-model="form.edgeVoiceId"
            type="text"
            class="flex-1 min-w-0 text-[17px] outline-none text-right bg-transparent text-black dark:text-white"
            placeholder="例如 zh-CN-XiaoxiaoNeural"
          >
        </div>
        <div class="flex items-center px-4 py-3">
          <span class="w-24 text-[17px] text-black dark:text-white shrink-0">MiniMax音色</span>
          <input
            v-model="form.minimaxVoiceId"
            type="text"
            class="flex-1 min-w-0 text-[17px] outline-none text-right bg-transparent text-black dark:text-white"
            placeholder="例如 voice_id"
          >
        </div>
      </div>

      <!-- Chat Background -->
      <div class="w-full bg-white dark:bg-[#2c2c2e] rounded-[10px] overflow-hidden">  
        <div class="px-4 py-3 border-b border-[#E5E5EA] dark:border-gray-700">  
          <span class="text-[13px] text-[#8E8E93] uppercase">聊天背景</span>  
        </div>
        <div class="p-4">
          <div
            class="w-full h-24 rounded-lg bg-cover bg-center border border-[#E5E5EA] dark:border-gray-700 flex items-center justify-center cursor-pointer active:opacity-80"
            :style="{ backgroundImage: form.chatBackground ? `url(${form.chatBackground})` : 'none', backgroundColor: form.chatBackground ? 'transparent' : '#F2F2F7' }"
            @click="bgInput?.click()"
          >
            <span v-if="!form.chatBackground" class="text-[#8E8E93] text-sm">点击设置背景图</span>
          </div>
          <input ref="bgInput" type="file" class="hidden" accept="image/*" @change="handleBgChange">
          <button
            class="mt-3 px-3 py-1.5 rounded-full text-[12px] text-[#007AFF] bg-[#007AFF]/10 dark:bg-[#0A84FF]/20"
            @click="handleBgUrlInput"
          >
            填URL
          </button>
        </div>
        <button
          v-if="form.chatBackground"
          class="w-full px-4 py-3 text-red-500 border-t border-[#E5E5EA] dark:border-gray-700 text-center"
          @click="form.chatBackground = null"
        >
          清除背景
        </button>
      </div>

      <!-- Chat History Settings -->
      <div v-if="isEdit" class="w-full bg-white dark:bg-[#2c2c2e] rounded-[10px] overflow-hidden">
        <div class="px-4 py-3 border-b border-[#E5E5EA] dark:border-gray-700">
          <span class="text-[13px] text-[#8E8E93] uppercase">聊天记录管理</span>
        </div>
        <div class="px-4 py-3 border-b border-[#E5E5EA] dark:border-gray-700">
          <div class="flex justify-between items-center mb-2">
            <span class="text-[17px] text-black dark:text-white">保留消息条数</span>
            <span class="text-[15px] text-[#8E8E93]">{{ form.maxMessages === 0 ? '不限制' : form.maxMessages + ' 条' }}</span>
          </div>
          <div class="flex gap-2 flex-wrap">
            <button
              v-for="opt in messageRetentionOptions"
              :key="opt.value"
              class="px-3 py-1.5 rounded-full text-[14px] transition-colors"
              :class="form.maxMessages === opt.value ? 'bg-[#007AFF] text-white' : 'bg-[#E9E9EB] dark:bg-gray-700 text-black dark:text-white'"
              @click="form.maxMessages = opt.value"
            >
              {{ opt.label }}
            </button>
          </div>
          <div class="text-[12px] text-[#8E8E93] mt-2">超出限制时自动删除最早的消息</div>
        </div>
        <div
          class="px-4 py-3 flex justify-between items-center cursor-pointer active:bg-gray-100 dark:active:bg-gray-800"
          @click="clearChatHistory"
        >
          <span class="text-[17px] text-[#FF3B30]">清空聊天记录</span>
          <span class="text-[15px] text-[#8E8E93]">{{ currentMsgCount }} 条消息</span>
        </div>
      </div>
    </div>
  </IosModal>
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue'
import { useContactsStore } from '../../stores/contacts'
import { useConfigsStore } from '../../stores/configs'
import { useLorebookStore } from '../../stores/lorebook'
import { usePersonasStore } from '../../stores/personas'
import { useSettingsStore } from '../../stores/settings'
import { useStickersStore } from '../../stores/stickers'
import { useStorage } from '../../composables/useStorage'
import { useCharacterCardImport } from '../../composables/useCharacterCardImport'
import { createSTCharacterCardContactData } from '../../utils/stCharacterCard'
import { makeId } from '../../utils/id'
import { useToast } from '../../composables/useToast'
import { isReservedPromptPresetBook } from '../../utils/presetPromptBooks'
import { compressImage } from '../../composables/useImage'
import { showConfirm } from '../../composables/useConfirm'
import { normalizeImageUrlInput } from '../../utils/mediaUrl'
import { sanitizeMiniMaxVoiceId } from '../../utils/minimaxConfig'
import { listAvailableMcpServers, normalizeMcpServerIds } from '../../utils/mcpServers'
import ModelSelectField from '../common/ModelSelectField.vue'
import IosModal from '../common/IosModal.vue'

const props = defineProps({
  visible: Boolean,
  isEdit: Boolean,
  contactId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close', 'saved', 'deleted'])

const contactsStore = useContactsStore()
const configsStore = useConfigsStore()
const defaultModelHint = computed(() => configsStore.getConfig?.id ? `当前：${configsStore.getConfig.name}` : '尚未设置默认模型')
const lorebookStore = useLorebookStore()
const personasStore = usePersonasStore()
const settingsStore = useSettingsStore()
const stickersStore = useStickersStore()
const { scheduleSave } = useStorage()
const { showToast } = useToast()
const { importedCard, importing, importError, resetImport, importCard } = useCharacterCardImport()
const cardInput = ref(null)
const importGreeting = ref('')
const selectedGreeting = ref('-1')

function normalizeBoundLorebooks(bookIds) {
  if (!Array.isArray(bookIds)) return []
  return bookIds.filter(bookId => {
    const book = lorebookStore.lorebook.books.find(b => b.id === bookId)
    return !isReservedPromptPresetBook(book)
  })
}

const availableLorebooks = computed(() => {
  const books = (lorebookStore.lorebook?.books || []).filter(book => !isReservedPromptPresetBook(book))
  return importedCard.value?.lorebook ? [...books, importedCard.value.lorebook] : books
})

const missingReferencedLorebook = computed(() => {
  const name = importedCard.value?.referencedLorebook
  return name && !availableLorebooks.value.some(book => book.name === name) ? name : ''
})

const availableStickerGroups = computed(() => stickersStore.stickerGroups || [])
const availableMcpServers = computed(() => listAvailableMcpServers(settingsStore.toolCallingConfig))

function mcpServerSubtitle(server) {
  const disabledSuffix = server?.enabled === false ? ' · 全局已禁用' : ''
  if (server?.source === 'notion') return `Notion${disabledSuffix}`
  if (server?.source === 'direct') return `MCP 直连${disabledSuffix}`
  const transport = server?.transport === 'http' ? 'HTTP' : 'STDIO'
  return `本地桥接 · ${transport}${disabledSuffix}`
}

const avatarInput = ref(null)
const tempAvatar = ref(null)
const bgInput = ref(null)

const messageRetentionOptions = [
  { label: '不限制', value: 0 },
  { label: '20条', value: 20 },
  { label: '50条', value: 50 },
  { label: '100条', value: 100 },
  { label: '200条', value: 200 }
]

const form = reactive({
  name: '',
  prompt: '',
  avatar: '🤖',
  boundLorebooks: [],
  personaId: null,
  stickerGroupIds: [],
  mcpServerIds: [],
  configId: null,
  edgeVoiceId: '',
  minimaxVoiceId: '',
  maxMessages: 0,
  chatBackground: null
})

const editingContact = computed(() => {
  const contactId = String(props.contactId || '').trim()
  if (!contactId) return null
  const contact = contactsStore.contacts.find(item => String(item?.id || '') === contactId) || null
  if (!contact || contact.type === 'group') return null
  return contact
})

const currentMsgCount = computed(() => {
  return editingContact.value?.msgs?.length || 0
})

function resetForm() {
  form.name = ''
  form.prompt = ''
  form.avatar = '🤖'
  form.boundLorebooks = []
  form.personaId = null
  form.stickerGroupIds = []
  form.mcpServerIds = []
  form.configId = null
  form.edgeVoiceId = ''
  form.minimaxVoiceId = ''
  form.maxMessages = 0
  form.chatBackground = null
}

function populateForm(contact) {
  form.name = contact.name || ''
  form.prompt = contact.prompt || ''
  form.avatar = contact.avatar || '🤖'
  form.boundLorebooks = normalizeBoundLorebooks(contact.boundLorebooks)
  form.personaId = contact.personaId || null
  form.stickerGroupIds = Array.isArray(contact.stickerGroupIds) ? [...contact.stickerGroupIds] : []
  form.mcpServerIds = normalizeMcpServerIds(contact.mcpServerIds)
  form.configId = contact.configId || null
  form.edgeVoiceId = contact.edgeVoiceId || ''
  form.minimaxVoiceId = contact.minimaxVoiceId || ''
  form.maxMessages = contact.maxMessages || 0
  form.chatBackground = contact.chatBackground || null
  if (contact.avatarType === 'image') {
    tempAvatar.value = contact.avatar
  }
}

watch(() => [props.visible, props.isEdit, props.contactId, contactsStore.contacts.length], ([visible, isEdit]) => {
  resetImport()
  importGreeting.value = ''
  if (!visible) return

  tempAvatar.value = null
  if (isEdit && editingContact.value) {
    populateForm(editingContact.value)
    return
  }
  resetForm()
}, { immediate: true })

async function handleCardImport(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  const card = await importCard(file)
  if (!card) return
  resetForm()
  form.name = card.name
  form.prompt = card.prompt
  tempAvatar.value = card.avatar
  importGreeting.value = card.firstMessage
  selectedGreeting.value = '-1'
  if (card.lorebook) {
    form.boundLorebooks = [card.lorebook.id]
  } else if (card.referencedLorebook) {
    form.boundLorebooks = availableLorebooks.value.filter(book => book.name === card.referencedLorebook).map(book => book.id)
  }
}

function selectGreeting(event) {
  const index = Number(event.target.value)
  importGreeting.value = index < 0 ? importedCard.value.firstMessage : importedCard.value.alternateGreetings[index]
}

async function handleAvatarChange(e) {
  const file = e.target.files?.[0]
  if (file) {
    tempAvatar.value = await compressImage(file, 200)
  }
  e.target.value = ''
}

function handleAvatarUrlInput() {
  if (typeof window === 'undefined' || typeof window.prompt !== 'function') return
  const raw = window.prompt('请输入头像图床 URL（支持 http/https）', tempAvatar.value || '')
  if (raw === null) return
  const url = normalizeImageUrlInput(raw)
  if (url === null) {
    showToast('请输入有效的图片 URL')
    return
  }
  tempAvatar.value = url || null
}

async function handleBgChange(e) {
  const file = e.target.files?.[0]
  if (file) {
    form.chatBackground = await compressImage(file, 800)
  }
  e.target.value = ''
}

function handleBgUrlInput() {
  if (typeof window === 'undefined' || typeof window.prompt !== 'function') return
  const raw = window.prompt('请输入聊天背景图床 URL（支持 http/https）', form.chatBackground || '')
  if (raw === null) return
  const url = normalizeImageUrlInput(raw)
  if (url === null) {
    showToast('请输入有效的图片 URL')
    return
  }
  form.chatBackground = url || null
}

function toggleLorebookBinding(bookId) {
  const index = form.boundLorebooks.indexOf(bookId)
  if (index > -1) {
    form.boundLorebooks.splice(index, 1)
  } else {
    form.boundLorebooks.push(bookId)
  }
}

function toggleStickerGroup(groupId) {
  const index = form.stickerGroupIds.indexOf(groupId)
  if (index > -1) {
    form.stickerGroupIds.splice(index, 1)
  } else {
    form.stickerGroupIds.push(groupId)
  }
}

function toggleMcpServer(serverId) {
  const index = form.mcpServerIds.indexOf(serverId)
  if (index > -1) {
    form.mcpServerIds.splice(index, 1)
  } else {
    form.mcpServerIds.push(serverId)
  }
}

function groupStickerCount(groupId) {
  return (stickersStore.stickers || []).filter(sticker => Array.isArray(sticker?.groupIds) && sticker.groupIds.includes(groupId)).length
}

function saveContact() {
  if (importing.value) {
    showToast('请等待角色卡读取完成')
    return
  }
  if (!form.name.trim()) {
    showToast('请输入名称')
    return
  }

  const prompt = form.prompt.trim()
  const boundLorebooks = normalizeBoundLorebooks(form.boundLorebooks)
  const mcpServerIds = normalizeMcpServerIds(form.mcpServerIds)
  let avatar = form.avatar.trim() || '🤖'
  let avatarType = 'emoji'
  if (tempAvatar.value) {
    avatar = tempAvatar.value
    avatarType = 'image'
  }

  if (props.isEdit && editingContact.value) {
    const contactIndex = contactsStore.contacts.findIndex(x => x.id === editingContact.value.id)
    if (contactIndex !== -1) {
      contactsStore.contacts[contactIndex].name = form.name.trim()
      contactsStore.contacts[contactIndex].prompt = prompt
      contactsStore.contacts[contactIndex].avatar = avatar
      contactsStore.contacts[contactIndex].avatarType = avatarType
      contactsStore.contacts[contactIndex].boundLorebooks = [...boundLorebooks]
      contactsStore.contacts[contactIndex].personaId = form.personaId
      contactsStore.contacts[contactIndex].stickerGroupIds = [...form.stickerGroupIds]
      contactsStore.contacts[contactIndex].mcpServerIds = [...mcpServerIds]
      contactsStore.contacts[contactIndex].configId = form.configId
      contactsStore.contacts[contactIndex].edgeVoiceId = form.edgeVoiceId.trim()
      contactsStore.contacts[contactIndex].minimaxVoiceId = sanitizeMiniMaxVoiceId(form.minimaxVoiceId)
      contactsStore.contacts[contactIndex].maxMessages = form.maxMessages
      contactsStore.contacts[contactIndex].chatBackground = form.chatBackground
      if (!Array.isArray(contactsStore.contacts[contactIndex].callHistory)) {
        contactsStore.contacts[contactIndex].callHistory = []
      }
      if (contactsStore.activeChat?.id === editingContact.value.id) {
        contactsStore.activeChat = contactsStore.contacts[contactIndex]
      }
    }
    showToast('已更新')
  } else {
    const newContact = {
      id: makeId('c'),
      name: form.name.trim(),
      avatarType,
      avatar,
      prompt,
      msgs: [],
      boundLorebooks: [...boundLorebooks],
      personaId: form.personaId,
      stickerGroupIds: [...form.stickerGroupIds],
      mcpServerIds: [...mcpServerIds],
      configId: form.configId,
      edgeVoiceId: form.edgeVoiceId.trim(),
      minimaxVoiceId: sanitizeMiniMaxVoiceId(form.minimaxVoiceId),
      maxMessages: form.maxMessages,
      chatBackground: form.chatBackground,
      callHistory: []
    }
    if (importedCard.value) {
      const persona = personasStore.getPersonaForContact(newContact.id)
      const selectedPersona = personasStore.personas.find(item => item.id === form.personaId) || persona
      Object.assign(newContact, createSTCharacterCardContactData(importedCard.value, {
        greeting: importGreeting.value,
        charName: newContact.name,
        userName: selectedPersona?.name || '用户'
      }))
      const book = importedCard.value.lorebook
      if (book && boundLorebooks.includes(book.id)) lorebookStore.lorebook.books.push(book)
    }
    contactsStore.contacts.unshift(newContact)
    showToast('已创建')
  }

  scheduleSave()
  emit('saved')
  emit('close')
}

async function clearChatHistory() {
  if (!editingContact.value) return
  const confirmed = await showConfirm({
    message: `确定清空 ${currentMsgCount.value} 条聊天记录？角色记忆不会随之删除。`,
    destructive: true
  })
  if (!confirmed) return
  const contactIndex = contactsStore.contacts.findIndex(x => x.id === editingContact.value.id)
  if (contactIndex !== -1) {
    contactsStore.contacts[contactIndex].msgs = []
    if (contactsStore.activeChat?.id === editingContact.value.id) {
      contactsStore.activeChat = contactsStore.contacts[contactIndex]
    }
  }
  scheduleSave()
  showToast('已清空')
}

async function deleteContact() {
  if (!props.isEdit || !editingContact.value) return
  const confirmed = await showConfirm({ message: '确定删除?', destructive: true })
  if (!confirmed) return
  if (typeof window === 'undefined' || typeof window.prompt !== 'function') return
  const input = window.prompt('请输入 delete 以确认删除联系人')
  if (input === null) return
  if (input.trim() !== 'delete') {
    showToast('输入错误，已取消删除')
    return
  }
  const deletedId = editingContact.value.id
  contactsStore.contacts = contactsStore.contacts.filter(c => c.id !== deletedId)
  if (contactsStore.activeChat?.id === deletedId) {
    contactsStore.activeChat = null
  }
  scheduleSave()
  showToast('已删除')
  emit('deleted')
  emit('close')
}
</script>
