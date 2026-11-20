<template>
  <ChatMessageShell
    :block="block"
    :multi-select-mode="multiSelectMode"
    :selected="isSelected"
    :show-chat-avatars="showChatAvatars"
    :root-class="rootClass"
    @click="handleRootClick"
  >
    <template #default="{ isUser }">
      <div class="chat-album" :class="[isUser ? 'is-user' : 'is-ai', { 'is-stack': isStack }, block.animClass]">
        <div class="chat-album-media">
          <!-- 4 张及以上：iOS 26 的照片叠放，上方标注张数 -->
          <template v-if="isStack">
            <button type="button" class="chat-album-count" @click.stop="openViewer(0)">
              <i class="ph-fill ph-squares-four"></i>
              <span>{{ images.length }} 张照片</span>
            </button>
            <div
              class="chat-album-stack"
              role="button"
              tabindex="0"
              :aria-label="`查看 ${images.length} 张照片`"
              @click.stop="openViewer(0)"
              @keydown.enter.prevent="openViewer(0)"
              @contextmenu.prevent="emitItemMenu($event, 0)"
            >
              <div
                v-for="(item, idx) in stackBackLayers"
                :key="item.key"
                class="chat-album-stack-back"
                :class="'is-depth-' + (idx + 1)"
                :style="{ backgroundImage: cssUrl(item.imageUrl) }"
              ></div>
              <img :src="images[0].imageUrl" alt="" class="chat-album-stack-top" draggable="false">
            </div>
          </template>

          <!-- 2–3 张：错落叠放的拼贴 -->
          <div v-else class="chat-album-collage" :class="'is-count-' + images.length">
            <div
              v-for="(item, idx) in images"
              :key="item.key"
              class="chat-album-tile"
              role="button"
              tabindex="0"
              :aria-label="`查看第 ${idx + 1} 张照片`"
              @click.stop="openViewer(idx)"
              @keydown.enter.prevent="openViewer(idx)"
              @contextmenu.prevent="emitItemMenu($event, idx)"
            >
              <img :src="item.imageUrl" alt="" draggable="false">
            </div>
          </div>
        </div>

        <button
          v-if="!multiSelectMode"
          type="button"
          class="chat-album-save"
          :aria-label="`保存 ${images.length} 张照片`"
          @click.stop="saveAll"
        >
          <i class="ph-bold ph-download-simple"></i>
        </button>
      </div>
    </template>
  </ChatMessageShell>

  <ChatImageViewer v-if="viewerImages.length > 0" :images="viewerImages" :start-index="viewerIndex" @close="viewerImages = []" />
</template>

<script setup>
import { computed, ref } from 'vue'
import { downloadImageUrls } from '../../../../utils/imageDownload'
import { useToast } from '../../../../composables/useToast'
import ChatImageViewer from '../ChatImageViewer.vue'
import ChatMessageShell from './ChatMessageShell.vue'

const STACK_MIN_COUNT = 4

const props = defineProps({
  block: { type: Object, required: true },
  multiSelectMode: { type: Boolean, default: false },
  selected: { type: Boolean, default: false },
  showChatAvatars: { type: Boolean, default: false }
})

const emit = defineEmits(['toggle-select', 'context-menu'])

const { showToast } = useToast()
const viewerImages = ref([])
const viewerIndex = ref(0)

const isSelected = computed(() => props.multiSelectMode && props.selected)
const images = computed(() => (Array.isArray(props.block.images) ? props.block.images : []))
const isStack = computed(() => images.value.length >= STACK_MIN_COUNT)
// 叠在后面露边的两张，越靠后转得越多
const stackBackLayers = computed(() => images.value.slice(1, 3).reverse())
const rootClass = computed(() => {
  const align = props.block.isUser ? 'justify-end' : 'justify-start'
  return `flex w-full ${props.block.mb} ${align} items-end select-none`
})

function cssUrl(url) {
  // 引号、反斜杠、空白会截断 CSS url()，转成百分号编码
  return `url("${String(url || '').replace(/["\\\s]/g, encodeURIComponent)}")`
}

function handleRootClick() {
  if (props.multiSelectMode) emit('toggle-select', props.block.key)
}

function openViewer(index) {
  if (props.multiSelectMode) {
    emit('toggle-select', props.block.key)
    return
  }
  viewerIndex.value = index
  viewerImages.value = images.value.map(item => item.imageUrl)
}

// 长按某一张：菜单只作用于这张图对应的那条消息；多选时整组一起选中
function emitItemMenu(event, index) {
  if (props.multiSelectMode) return
  const item = images.value[index]
  if (!item) return
  emit('context-menu', event, {
    ...props.block,
    type: 'image',
    msgId: item.msgId,
    imageUrl: item.imageUrl,
    msgPartKey: item.msgPartKey,
    favorited: item.favorited,
    reactions: item.reactions,
    contextContent: '[图片]',
    images: undefined
  })
}

function saveAll() {
  downloadImageUrls(images.value.map(item => item.imageUrl))
  showToast(`正在保存 ${images.value.length} 张照片`)
}
</script>

<style scoped>
.chat-album {
  display: flex;
  align-items: center;
  gap: 10px;
}

.chat-album.is-user {
  flex-direction: row-reverse;
}

.chat-album-media {
  display: flex;
  flex-direction: column;
}

.chat-album.is-user .chat-album-media {
  align-items: flex-end;
}

.chat-album-count {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin: 0 4px 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--primary-color, #007AFF);
}

.chat-album-count > i {
  font-size: 15px;
}

/* 叠放：顶上一张完整，后面两张向外侧转开露边 */
.chat-album-stack {
  position: relative;
  width: 200px;
  height: 248px;
  cursor: pointer;
}

.chat-album-stack-top,
.chat-album-stack-back {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: 22px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16), 0 1px 3px rgba(0, 0, 0, 0.08);
}

.chat-album-stack-top {
  object-fit: cover;
  z-index: 3;
  transition: transform 0.2s ease;
}

.chat-album-stack:active .chat-album-stack-top {
  transform: scale(0.97);
}

.chat-album-stack-back {
  background-size: cover;
  background-position: center;
  background-color: var(--card-bg, #ddd);
  transform-origin: 50% 100%;
}

.chat-album-stack-back.is-depth-1 {
  z-index: 1;
  transform: translateX(16px) rotate(7deg) scale(0.92);
  filter: brightness(0.86);
}

.chat-album-stack-back.is-depth-2 {
  z-index: 2;
  transform: translateX(9px) rotate(3.5deg) scale(0.96);
  filter: brightness(0.93);
}

.chat-album.is-user .chat-album-stack-back.is-depth-1 {
  transform: translateX(-16px) rotate(-7deg) scale(0.92);
}

.chat-album.is-user .chat-album-stack-back.is-depth-2 {
  transform: translateX(-9px) rotate(-3.5deg) scale(0.96);
}

/* 拼贴：每张约 2/3 宽，左右错开、上下压一点 */
.chat-album-collage {
  display: flex;
  flex-direction: column;
  width: 220px;
}

.chat-album-tile {
  position: relative;
  width: 66%;
  border-radius: 20px;
  overflow: hidden;
  cursor: pointer;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.16), 0 1px 3px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s ease;
}

.chat-album-tile:active {
  transform: scale(0.97);
}

.chat-album-tile + .chat-album-tile {
  margin-top: -26px;
}

.chat-album-tile:nth-child(1) { z-index: 1; }
.chat-album-tile:nth-child(2) { z-index: 2; }
.chat-album-tile:nth-child(3) { z-index: 3; }

.chat-album-collage.is-count-2 .chat-album-tile:nth-child(1) { align-self: flex-start; }
.chat-album-collage.is-count-2 .chat-album-tile:nth-child(2) { align-self: flex-end; }
.chat-album-collage.is-count-3 .chat-album-tile:nth-child(1) { align-self: flex-end; }
.chat-album-collage.is-count-3 .chat-album-tile:nth-child(2) { align-self: flex-start; }
.chat-album-collage.is-count-3 .chat-album-tile:nth-child(3) { align-self: center; }

.chat-album-tile > img {
  display: block;
  width: 100%;
  max-height: 200px;
  min-height: 96px;
  object-fit: cover;
}

.chat-album-save {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: var(--primary-color, #007AFF);
  background: var(--chat-album-save-bg, rgba(120, 120, 128, 0.14));
  transition: transform 0.2s ease;
}

/* 叠放的后两张向外转开约 30px，保存键让开 */
.chat-album.is-stack.is-ai .chat-album-save { margin-left: 28px; }
.chat-album.is-stack.is-user .chat-album-save { margin-right: 28px; }

.chat-album-save:active {
  transform: scale(0.9);
}
</style>
