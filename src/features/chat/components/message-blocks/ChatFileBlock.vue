<template>
  <ChatMessageShell
    :block="block"
    :multi-select-mode="multiSelectMode"
    :selected="selected"
    :show-chat-avatars="showChatAvatars"
    :root-class="['flex w-full', block.isUser ? 'justify-end' : 'justify-start', block.mb]"
    @click="handleRootClick"
  >
    <div
      class="chat-file-card"
      :class="[block.isUser ? 'chat-file-card-user' : 'chat-file-card-ai', block.animClass]"
      @click.stop="openPreview"
      @contextmenu.prevent="emit('context-menu', $event, block)"
    >
      <div class="chat-file-icon"><i :class="iconClass"></i></div>
      <div class="chat-file-info">
        <div class="chat-file-name">{{ block.fileName }}</div>
        <div class="chat-file-meta">{{ block.generating ? '生成中…' : metaText }}</div>
      </div>
      <button
        v-if="!block.generating"
        class="chat-file-download"
        aria-label="下载"
        @click.stop="download"
      >
        <i class="ph ph-download-simple"></i>
      </button>
    </div>
  </ChatMessageShell>

  <Teleport to="body">
    <div v-if="previewOpen" class="chat-file-preview-mask" @click.self="previewOpen = false">
      <div class="chat-file-preview">
        <div class="chat-file-preview-header">
          <span class="chat-file-preview-title">{{ block.fileName }}</span>
          <button class="chat-file-preview-btn" @click="copyText"><i class="ph ph-copy"></i></button>
          <button class="chat-file-preview-btn" @click="download"><i class="ph ph-download-simple"></i></button>
          <button class="chat-file-preview-btn" @click="previewOpen = false"><i class="ph ph-x"></i></button>
        </div>
        <pre class="chat-file-preview-body">{{ block.fileText }}</pre>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, ref } from 'vue'
import ChatMessageShell from './ChatMessageShell.vue'
import { downloadTextFile, formatFileSize, getFileExtension, getFileIconClass, resolveDownloadName } from '../../files/fileMessages'

const props = defineProps({
  block: { type: Object, required: true },
  multiSelectMode: { type: Boolean, default: false },
  selected: { type: Boolean, default: false },
  showChatAvatars: { type: Boolean, default: false }
})
const emit = defineEmits(['toggle-select', 'context-menu'])

const previewOpen = ref(false)
const iconClass = computed(() => getFileIconClass(props.block.fileName))
const metaText = computed(() => {
  const ext = getFileExtension(props.block.fileName).toUpperCase()
  const extra = props.block.fileExtracted ? '已提取文字' : ''
  return [ext, formatFileSize(props.block.fileSize), extra].filter(Boolean).join(' · ')
})

function handleRootClick() {
  if (props.multiSelectMode) emit('toggle-select', props.block.key)
}

function openPreview() {
  if (props.multiSelectMode) {
    emit('toggle-select', props.block.key)
    return
  }
  previewOpen.value = true
}

function download() {
  downloadTextFile(resolveDownloadName(props.block.fileName, props.block.fileExtracted), props.block.fileText, props.block.fileMime)
}

function copyText() {
  navigator.clipboard?.writeText(String(props.block.fileText || '')).catch(() => {})
}
</script>
