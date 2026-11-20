<template>
  <div
    class="agent-trace-row"
    :class="{ 'agent-trace-row-offset': showChatAvatars || block.isGroupChat }"
    :data-msg-id="block.msgId"
    data-msg-part="agent-trace"
  >
    <div
      class="agent-trace"
      :class="{
        'agent-trace-open': expanded,
        'agent-trace-error': isError,
        'agent-trace-live': isLive
      }"
    >
      <button
        type="button"
        class="agent-trace-trigger"
        :aria-expanded="expanded"
        :aria-controls="detailsId"
        @click="expanded = !expanded"
      >
        <i class="agent-trace-icon" :class="iconClass" aria-hidden="true"></i>
        <span class="agent-trace-label">{{ label }}</span>
        <span v-if="hint" class="agent-trace-hint">{{ hint }}</span>
        <i v-if="isError" class="ph ph-warning-circle agent-trace-error-icon" aria-label="调用失败"></i>
        <i class="ph ph-caret-right agent-trace-chevron" aria-hidden="true"></i>
      </button>

      <Transition name="agent-trace-expand">
        <div v-if="expanded" :id="detailsId" class="agent-trace-details">
          <template v-if="block.type === 'reasoning'">
            <div class="agent-trace-reasoning-text">{{ block.content }}</div>
            <div v-if="block.round > 1" class="agent-trace-meta">
              <span>第 {{ block.round }} 轮</span>
            </div>
          </template>

          <template v-else>
            <div class="agent-trace-meta">
              <span :class="block.success ? 'agent-trace-ok' : 'agent-trace-fail'">{{ block.success ? '已完成' : '失败' }}</span>
              <span v-if="block.durationLabel">{{ block.durationLabel }}</span>
              <span>{{ block.sourceLabel }}</span>
              <span>第 {{ block.round }} 轮</span>
            </div>
            <div v-if="block.summary" class="agent-trace-summary">{{ block.summary }}</div>
            <div v-if="block.argsPreview" class="agent-trace-section">
              <div class="agent-trace-section-label">参数</div>
              <pre class="agent-trace-code">{{ block.argsPreview }}</pre>
            </div>
            <div v-if="block.resultPreview" class="agent-trace-section">
              <div class="agent-trace-section-label">结果</div>
              <pre class="agent-trace-code">{{ block.resultPreview }}</pre>
            </div>
            <div v-else-if="block.errorText" class="agent-trace-error-text">{{ block.errorText }}</div>
          </template>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  block: { type: Object, required: true },
  showChatAvatars: { type: Boolean, default: false }
})

const expanded = ref(false)

const detailsId = computed(() => `agent-trace-${String(props.block.key || props.block.msgId || 'item').replace(/[^a-zA-Z0-9_-]/g, '-')}`)

const isReasoning = computed(() => props.block.type === 'reasoning')
const isLive = computed(() => isReasoning.value && !!props.block.streaming)
const isError = computed(() => props.block.type === 'toolLog' && !props.block.success)

const label = computed(() => {
  if (isReasoning.value) return isLive.value ? '思考中' : '已思考'
  return props.block.title || '工具调用'
})

// 标签后的浅色补充：思考显示内容摘要，工具显示副标题
const hint = computed(() => {
  if (isReasoning.value) return props.block.summary || ''
  return props.block.subtitle || ''
})

const iconClass = computed(() => {
  if (isReasoning.value) return 'ph ph-sparkle'

  const name = `${props.block.title || ''} ${props.block.subtitle || ''}`.toLowerCase()
  if (name.includes('web') || name.includes('browser') || name.includes('网页')) return 'ph ph-globe-hemisphere-west'
  if (name.includes('search') || name.includes('搜索')) return 'ph ph-magnifying-glass'
  if (name.includes('calendar') || name.includes('event') || name.includes('日程')) return 'ph ph-calendar-dots'
  if (name.includes('file') || name.includes('read') || name.includes('文件')) return 'ph ph-file-text'
  if (name.includes('image') || name.includes('图片')) return 'ph ph-image'
  if (name.includes('notion') || name.includes('page')) return 'ph ph-note-pencil'
  return 'ph ph-wrench'
})
</script>

<style scoped>
/* 无底板、无边框：直接以浅色文字铺在聊天背景上，跟时间戳/已送达同一套颜色 */
.agent-trace-row {
  --trace-ink: var(--meta-color, #8E8E93);
  --trace-ink-strong: color-mix(in srgb, var(--text-primary, #111) 72%, var(--meta-color, #8E8E93));
  --trace-rule: color-mix(in srgb, var(--meta-color, #8E8E93) 32%, transparent);
  display: flex;
  justify-content: flex-start;
  width: 100%;
  margin: 0 0 2px;
}

.agent-trace-row-offset {
  padding-left: 40px;
}

.agent-trace {
  min-width: 0;
  max-width: min(86%, 520px);
  padding-left: 8px;
}

.agent-trace-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  min-height: 28px;
  padding: 3px 0;
  border: 0;
  background: none;
  color: var(--trace-ink);
  font: inherit;
  text-align: left;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: opacity 140ms ease;
}

.agent-trace-trigger:active {
  opacity: 0.55;
}

.agent-trace-icon {
  flex: 0 0 16px;
  width: 16px;
  font-size: 15px;
  text-align: center;
}

.agent-trace-label {
  flex: 0 0 auto;
  font-size: 13px;
  line-height: 18px;
  font-weight: 500;
  white-space: nowrap;
}

.agent-trace-hint {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  line-height: 18px;
  opacity: 0.72;
}

.agent-trace-error-icon {
  flex: 0 0 auto;
  font-size: 14px;
  color: #E5484D;
}

.agent-trace-chevron {
  flex: 0 0 auto;
  font-size: 11px;
  opacity: 0.6;
  transition: transform 200ms ease;
}

.agent-trace-open .agent-trace-chevron {
  transform: rotate(90deg);
}

/* 思考中：文字上扫过一道柔光 */
.agent-trace-live .agent-trace-label {
  background: linear-gradient(90deg, var(--trace-ink) 35%, var(--text-primary, #111) 50%, var(--trace-ink) 65%) 0 0 / 300% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: agent-trace-shimmer 1.8s linear infinite;
}

/* 展开内容：挂在标签下方，左侧一根细线对齐图标中心 */
.agent-trace-details {
  position: relative;
  margin: 2px 0 6px;
  padding: 2px 0 2px 22px;
}

.agent-trace-details::before {
  content: "";
  position: absolute;
  left: 7.5px;
  top: 2px;
  bottom: 2px;
  width: 1px;
  border-radius: 1px;
  background: var(--trace-rule);
}

.agent-trace-reasoning-text {
  max-height: 320px;
  overflow: auto;
  color: var(--trace-ink-strong);
  font-size: 13px;
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
}

.agent-trace-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 0;
  color: var(--trace-ink);
  font-size: 11.5px;
  line-height: 16px;
}

.agent-trace-meta > span + span::before {
  content: "·";
  margin: 0 6px;
  opacity: 0.6;
}

.agent-trace-reasoning-text + .agent-trace-meta {
  margin-top: 6px;
}

.agent-trace-ok {
  color: #30A46C;
}

.agent-trace-fail {
  color: #E5484D;
}

.agent-trace-summary {
  margin-top: 6px;
  color: var(--trace-ink-strong);
  font-size: 12.5px;
  line-height: 1.55;
  word-break: break-word;
}

.agent-trace-section {
  margin-top: 8px;
}

.agent-trace-section-label {
  margin-bottom: 2px;
  color: var(--trace-ink);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.04em;
}

.agent-trace-code {
  max-height: 220px;
  margin: 0;
  padding: 0;
  overflow: auto;
  background: none;
  color: var(--trace-ink-strong);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 11.5px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.agent-trace-error-text {
  margin-top: 6px;
  color: #E5484D;
  font-size: 12.5px;
  line-height: 1.55;
  word-break: break-word;
}

.agent-trace-expand-enter-active,
.agent-trace-expand-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.agent-trace-expand-enter-from,
.agent-trace-expand-leave-to {
  opacity: 0;
  transform: translateY(-3px);
}

@keyframes agent-trace-shimmer {
  from { background-position: 100% 0; }
  to { background-position: 0 0; }
}

@media (prefers-reduced-motion: reduce) {
  .agent-trace-live .agent-trace-label {
    animation: none;
    color: var(--trace-ink);
    background: none;
  }
}
</style>
