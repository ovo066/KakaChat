<template>
  <IosSheet
    :visible="visible"
    title="编辑资料"
    tall
    confirmable
    :confirm-disabled="!draft.name.trim()"
    @close="emit('close')"
    @confirm="confirm"
  >
    <div class="profile-avatar-wrap">
      <button type="button" class="profile-avatar" aria-label="更换照片" @click="avatarInput?.click()">
        <img v-if="draft.avatarType === 'image' && draft.avatar" :src="draft.avatar" alt="">
        <span v-else>{{ draft.avatar || '🤖' }}</span>
      </button>
      <div class="profile-avatar-actions">
        <button type="button" class="ios26-glass-pill" @click="avatarInput?.click()">
          <i class="ph-bold ph-image"></i> 照片
        </button>
        <button type="button" class="ios26-glass-pill" @click="fillAvatarUrl">
          <i class="ph-bold ph-link"></i> 链接
        </button>
      </div>
      <input ref="avatarInput" type="file" class="hidden" accept="image/*" @change="handleAvatarFile">
    </div>

    <section class="ios26-section">
      <div class="ios26-card">
        <label class="ios26-row">
          <span class="ios26-row-label">名称</span>
          <input v-model="draft.name" class="ios26-input is-right" maxlength="40" placeholder="必填">
        </label>
        <label class="ios26-row">
          <span class="ios26-row-label">Emoji 头像</span>
          <input
            :value="draft.avatarType === 'image' ? '' : draft.avatar"
            class="ios26-input is-right"
            maxlength="4"
            placeholder="用照片"
            @input="useEmoji($event.target.value)"
          >
        </label>
      </div>
    </section>

    <section class="ios26-section">
      <div class="ios26-section-header">人设</div>
      <div class="ios26-card">
        <div class="ios26-subrow">
          <textarea
            v-model="draft.prompt"
            class="ios26-textarea profile-prompt"
            rows="8"
            placeholder="系统提示词（角色设定），例如：你是一个友好的 AI 助手…"
          ></textarea>
        </div>
      </div>
      <p class="ios26-section-footer">人设会作为系统提示词发给模型。</p>
    </section>
  </IosSheet>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import IosSheet from '../../../../components/common/IosSheet.vue'
import { compressImage } from '../../../../composables/useImage'
import { useToast } from '../../../../composables/useToast'
import { normalizeImageUrlInput } from '../../../../utils/mediaUrl'

const props = defineProps({
  visible: { type: Boolean, default: false },
  contact: { type: Object, default: null }
})

const emit = defineEmits(['close', 'save'])

const { showToast } = useToast()
const avatarInput = ref(null)
const draft = reactive({ name: '', prompt: '', avatar: '🤖', avatarType: 'emoji' })

watch(() => props.visible, (visible) => {
  if (!visible) return
  draft.name = props.contact?.name || ''
  draft.prompt = props.contact?.prompt || ''
  draft.avatar = props.contact?.avatar || '🤖'
  draft.avatarType = props.contact?.avatarType === 'image' ? 'image' : 'emoji'
}, { immediate: true })

async function handleAvatarFile(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  draft.avatar = await compressImage(file, 200)
  draft.avatarType = 'image'
}

function fillAvatarUrl() {
  if (typeof window === 'undefined' || typeof window.prompt !== 'function') return
  const raw = window.prompt('请输入头像图床 URL（支持 http/https）', draft.avatarType === 'image' ? draft.avatar : '')
  if (raw === null) return
  const url = normalizeImageUrlInput(raw)
  if (url === null) {
    showToast('请输入有效的图片 URL')
    return
  }
  if (!url) return
  draft.avatar = url
  draft.avatarType = 'image'
}

function useEmoji(value) {
  const emoji = String(value || '').trim()
  if (!emoji) return
  draft.avatar = emoji
  draft.avatarType = 'emoji'
}

function confirm() {
  emit('save', { ...draft })
}
</script>

<style scoped>
.profile-avatar-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 6px 0 18px;
}

.profile-avatar {
  width: 112px;
  height: 112px;
  border-radius: 999px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 60px;
  background: var(--ios-fill);
  box-shadow: var(--ios-glass-shadow);
}

.profile-avatar > img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-avatar-actions {
  display: flex;
  gap: 8px;
}

.profile-prompt {
  min-height: 180px;
}
</style>
