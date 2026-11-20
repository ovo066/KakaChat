<template>
  <Teleport to="body">
    <Transition name="chat-threads-fade">
      <div v-if="visible" class="fixed inset-0 z-[1250] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div class="chat-threads-backdrop absolute inset-0" @click="close"></div>

        <section
          class="chat-threads-panel relative w-full max-w-[460px] max-h-[88vh] sm:max-h-[82vh] overflow-hidden rounded-t-[30px] sm:rounded-[30px] flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label="对话存档"
        >
          <header class="chat-threads-header px-6 pt-6 pb-4">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="chat-threads-kicker">conversations</p>
                <h3 class="chat-threads-title">对话存档</h3>
                <p class="chat-threads-subtitle truncate">{{ contact?.name || '当前角色' }} · {{ threads.length }} 段对话</p>
              </div>
              <button class="chat-threads-close" aria-label="关闭" @click="close">
                <i class="ph-bold ph-x text-[15px]"></i>
              </button>
            </div>

            <div v-if="composing" class="chat-threads-compose mt-4">
              <input
                ref="composeInput"
                v-model="composeTitle"
                class="chat-threads-input"
                maxlength="24"
                placeholder="给新对话起个名字（可选）"
                @keydown.enter.prevent="confirmNewThread"
                @keydown.esc.prevent="composing = false"
              >
              <div class="flex gap-2 mt-2">
                <button class="chat-threads-btn is-ghost flex-1" @click="composing = false">取消</button>
                <button class="chat-threads-btn is-primary flex-1" @click="confirmNewThread">开始</button>
              </div>
              <p class="chat-threads-hint">当前对话会被存档，随时可以切回来。角色的核心记忆在各段对话间共享。</p>
            </div>
            <button v-else class="chat-threads-new mt-4" @click="openCompose">
              <i class="ph-bold ph-plus text-[15px]"></i>
              <span>开启新对话</span>
            </button>
          </header>

          <div class="chat-threads-list no-scrollbar">
            <article
              v-for="(thread, idx) in threads"
              :key="thread.id || `current-${idx}`"
              class="chat-thread-card"
              :class="{ 'is-current': thread.isCurrent }"
              @click="handleSelect(thread)"
            >
              <div class="chat-thread-icon">
                <i :class="thread.isCurrent ? 'ph-fill ph-chat-circle-dots' : 'ph ph-archive'"></i>
              </div>

              <div class="min-w-0 flex-1">
                <div v-if="renamingId === thread.id" class="flex items-center gap-2" @click.stop>
                  <input
                    ref="renameInput"
                    v-model="renameDraft"
                    class="chat-threads-input is-compact"
                    maxlength="24"
                    :placeholder="thread.fallbackTitle"
                    @keydown.enter.prevent="confirmRename(thread)"
                    @keydown.esc.prevent="renamingId = ''"
                    @blur="confirmRename(thread)"
                  >
                </div>
                <div v-else class="flex items-center gap-1.5 min-w-0">
                  <span class="chat-thread-name truncate">{{ thread.title || thread.fallbackTitle }}</span>
                  <span v-if="thread.isCurrent" class="chat-thread-badge">当前</span>
                </div>
                <p class="chat-thread-preview truncate">{{ thread.preview || '还没有消息' }}</p>
                <p class="chat-thread-meta">{{ thread.msgCount }} 条消息 · {{ formatTime(thread.updatedAt) }}</p>
              </div>

              <div class="chat-thread-actions" @click.stop>
                <button class="chat-thread-action" aria-label="重命名" @click="startRename(thread)">
                  <i class="ph ph-pencil-simple"></i>
                </button>
                <button
                  v-if="!thread.isCurrent"
                  class="chat-thread-action is-danger"
                  aria-label="删除对话"
                  @click="handleDelete(thread)"
                >
                  <i class="ph ph-trash"></i>
                </button>
              </div>
            </article>
          </div>

          <div class="h-6 sm:h-4 shrink-0"></div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useChatStore } from '../../../stores/chat'
import { useStorage } from '../../../composables/useStorage'
import { useToast } from '../../../composables/useToast'
import { showConfirm } from '../../../composables/useConfirm'
import { useMemory } from '../../../composables/useMemory'
import { formatRelativeTime } from '../../../utils/relativeTime'
import {
  deleteChatThread,
  listChatThreads,
  renameChatThread,
  startNewChatThread,
  switchChatThread
} from '../composables/chatThreads'

const props = defineProps({
  visible: { type: Boolean, default: false },
  contact: { type: Object, default: null }
})

const emit = defineEmits(['close'])

const chatStore = useChatStore()
const { scheduleSave } = useStorage()
const { showToast } = useToast()
const { invalidateRoundVectors } = useMemory()

const composing = ref(false)
const composeTitle = ref('')
const composeInput = ref(null)
const renamingId = ref('')
const renameDraft = ref('')
const renameInput = ref(null)

const threads = computed(() => listChatThreads(props.contact))

watch(() => props.visible, (visible) => {
  if (visible) return
  composing.value = false
  renamingId.value = ''
})

function close() {
  emit('close')
}

function formatTime(ts) {
  return ts ? formatRelativeTime(ts, { maxRelativeDays: 7 }) : '--'
}

function isBusy() {
  if (!chatStore.ui.isTyping && !chatStore.ui.isThinking) return false
  showToast('角色正在回复，稍后再切换对话')
  return true
}

function afterTimelineChanged() {
  chatStore.clearReply()
  chatStore.clearEdit()
  chatStore.ui.animateMsgId = null
  invalidateRoundVectors(props.contact)
  scheduleSave()
}

function openCompose() {
  if (isBusy()) return
  composeTitle.value = ''
  composing.value = true
  nextTick(() => composeInput.value?.focus?.())
}

function confirmNewThread() {
  if (!props.contact || isBusy()) return
  try {
    const { archived } = startNewChatThread(props.contact, { title: composeTitle.value })
    composing.value = false
    if (!archived) {
      scheduleSave()
      showToast('当前对话还是空的，已直接使用')
      close()
      return
    }
    afterTimelineChanged()
    showToast('已开启新对话')
    close()
  } catch (error) {
    showToast(error?.message || '开启新对话失败')
  }
}

function handleSelect(thread) {
  if (renamingId.value) return
  if (thread.isCurrent) {
    close()
    return
  }
  if (!props.contact || isBusy()) return
  if (!switchChatThread(props.contact, thread.id)) {
    showToast('没有找到这段对话')
    return
  }
  afterTimelineChanged()
  close()
}

function startRename(thread) {
  renamingId.value = thread.id
  renameDraft.value = thread.title
  nextTick(() => {
    const input = Array.isArray(renameInput.value) ? renameInput.value[0] : renameInput.value
    input?.focus?.()
  })
}

function confirmRename(thread) {
  if (renamingId.value !== thread.id) return
  renamingId.value = ''
  if (!props.contact) return
  if (renameChatThread(props.contact, thread.id, renameDraft.value)) scheduleSave()
}

async function handleDelete(thread) {
  if (!props.contact) return
  const ok = await showConfirm({
    title: '删除这段对话？',
    message: `「${thread.title || thread.fallbackTitle}」中的 ${thread.msgCount} 条消息将被永久删除。`,
    confirmText: '删除',
    destructive: true
  })
  if (!ok) return
  if (deleteChatThread(props.contact, thread.id)) {
    scheduleSave()
    showToast('已删除')
  }
}
</script>

<style scoped>
.chat-threads-backdrop {
  background: rgba(9, 10, 16, 0.32);
  backdrop-filter: blur(6px) saturate(120%);
  -webkit-backdrop-filter: blur(6px) saturate(120%);
}

.chat-threads-panel {
  border: 1px solid rgba(255, 255, 255, 0.55);
  background:
    linear-gradient(160deg, rgba(255, 255, 255, 0.88), rgba(246, 248, 255, 0.74)),
    radial-gradient(120% 90% at 100% -10%, color-mix(in srgb, var(--primary-color, #007AFF) 18%, transparent), transparent 60%);
  box-shadow: 0 26px 60px rgba(15, 18, 30, 0.26);
  backdrop-filter: blur(24px) saturate(140%);
  -webkit-backdrop-filter: blur(24px) saturate(140%);
}

.dark .chat-threads-panel {
  border-color: rgba(255, 255, 255, 0.14);
  background:
    linear-gradient(160deg, rgba(26, 27, 34, 0.94), rgba(30, 32, 42, 0.82)),
    radial-gradient(120% 90% at 100% -10%, color-mix(in srgb, var(--primary-color, #0A84FF) 22%, transparent), transparent 60%);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
}

.chat-threads-header {
  border-bottom: 1px solid rgba(17, 24, 39, 0.06);
}

.dark .chat-threads-header {
  border-bottom-color: rgba(255, 255, 255, 0.08);
}

.chat-threads-kicker {
  margin: 0;
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-secondary, #7f8698);
  opacity: 0.75;
}

.chat-threads-title {
  margin: 3px 0 0;
  font-size: 21px;
  line-height: 1.1;
  font-weight: 700;
  color: var(--text-primary, #171923);
}

.chat-threads-subtitle {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-secondary, #7f8698);
}

.chat-threads-close {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary, #7f8698);
  background: rgba(17, 24, 39, 0.05);
  transition: transform 0.2s ease;
}

.chat-threads-close:active {
  transform: scale(0.92);
}

.dark .chat-threads-close {
  background: rgba(255, 255, 255, 0.1);
}

.chat-threads-new {
  width: 100%;
  height: 42px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  background: var(--primary-color, #007AFF);
  box-shadow: 0 8px 20px color-mix(in srgb, var(--primary-color, #007AFF) 30%, transparent);
  transition: transform 0.18s ease;
}

.chat-threads-new:active,
.chat-threads-btn:active {
  transform: scale(0.97);
}

.chat-threads-input {
  width: 100%;
  height: 40px;
  padding: 0 14px;
  border-radius: 14px;
  font-size: 15px;
  color: var(--text-primary, #171923);
  background: rgba(17, 24, 39, 0.05);
  border: 1px solid transparent;
  outline: none;
}

.chat-threads-input:focus {
  border-color: color-mix(in srgb, var(--primary-color, #007AFF) 45%, transparent);
}

.chat-threads-input.is-compact {
  height: 30px;
  padding: 0 10px;
  border-radius: 10px;
  font-size: 14px;
}

.dark .chat-threads-input {
  background: rgba(255, 255, 255, 0.08);
}

.chat-threads-btn {
  height: 36px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  transition: transform 0.18s ease;
}

.chat-threads-btn.is-primary {
  color: #fff;
  background: var(--primary-color, #007AFF);
}

.chat-threads-btn.is-ghost {
  color: var(--text-secondary, #7f8698);
  background: rgba(17, 24, 39, 0.05);
}

.dark .chat-threads-btn.is-ghost {
  background: rgba(255, 255, 255, 0.08);
}

.chat-threads-hint {
  margin: 8px 2px 0;
  font-size: 11px;
  line-height: 1.5;
  color: var(--text-secondary, #7f8698);
}

.chat-threads-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 16px 4px;
}

.chat-thread-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 12px 12px 14px;
  margin-bottom: 10px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.62);
  background: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: transform 0.18s ease, background-color 0.2s ease;
}

.chat-thread-card:active {
  transform: scale(0.985);
}

.chat-thread-card.is-current {
  border-color: color-mix(in srgb, var(--primary-color, #007AFF) 35%, transparent);
  background: color-mix(in srgb, var(--primary-color, #007AFF) 8%, rgba(255, 255, 255, 0.7));
}

.dark .chat-thread-card {
  border-color: rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
}

.dark .chat-thread-card.is-current {
  border-color: color-mix(in srgb, var(--primary-color, #0A84FF) 45%, transparent);
  background: color-mix(in srgb, var(--primary-color, #0A84FF) 14%, transparent);
}

.chat-thread-icon {
  width: 38px;
  height: 38px;
  border-radius: 13px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: var(--text-secondary, #7f8698);
  background: rgba(17, 24, 39, 0.05);
}

.chat-thread-card.is-current .chat-thread-icon {
  color: #fff;
  background: var(--primary-color, #007AFF);
}

.dark .chat-thread-icon {
  background: rgba(255, 255, 255, 0.08);
}

.chat-thread-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #171923);
}

.chat-thread-badge {
  flex-shrink: 0;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  color: var(--primary-color, #007AFF);
  background: color-mix(in srgb, var(--primary-color, #007AFF) 14%, transparent);
}

.chat-thread-preview {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--text-secondary, #7f8698);
}

.chat-thread-meta {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--text-secondary, #7f8698);
  opacity: 0.7;
}

.chat-thread-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.chat-thread-action {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: var(--text-secondary, #7f8698);
}

.chat-thread-action:active {
  background: rgba(17, 24, 39, 0.06);
}

.chat-thread-action.is-danger {
  color: #ff3b30;
}

.chat-threads-fade-enter-active,
.chat-threads-fade-leave-active {
  transition: opacity 0.22s ease;
}

.chat-threads-fade-enter-active .chat-threads-panel,
.chat-threads-fade-leave-active .chat-threads-panel {
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

.chat-threads-fade-enter-from,
.chat-threads-fade-leave-to {
  opacity: 0;
}

.chat-threads-fade-enter-from .chat-threads-panel,
.chat-threads-fade-leave-to .chat-threads-panel {
  transform: translateY(24px);
}
</style>
