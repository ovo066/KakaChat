<template>
  <div
    :class="[rootClass, { 'chat-row-has-reactions': hasReactions }]"
    :data-msg-id="block.msgId"
    :data-msg-part="block.msgPartKey || 'message'"
    @click="emit('click', $event)"
  >
    <ChatMultiSelectCheckbox :visible="multiSelectMode" :selected="selected" />

    <template v-if="block.isUser">
      <div v-if="showChatAvatars && !block.showAvatar" class="w-8 ml-2 shrink-0"></div>
      <div class="flex flex-col items-end max-w-[75%]">
        <div v-if="hasReactions" class="chat-reaction-anchor is-shell">
          <slot :is-user="true" />
          <ChatReactionBadges :reactions="block.reactions" :is-user="true" />
        </div>
        <slot v-else :is-user="true" />
        <div v-if="block.metaText" class="msg-meta user-meta">{{ block.metaText }}</div>
      </div>
      <div
        v-if="block.showAvatar"
        class="w-8 h-8 rounded-full chat-avatar-bg flex items-center justify-center text-sm overflow-hidden shrink-0 ml-2 self-end"
      >
        <img v-if="block.senderAvatarType === 'image'" :src="block.senderAvatar" class="w-full h-full object-cover">
        <span v-else>{{ block.senderAvatar || '😊' }}</span>
      </div>
    </template>

    <template v-else>
      <div
        v-if="block.showAvatar"
        class="w-8 h-8 rounded-full chat-avatar-bg flex items-center justify-center text-sm overflow-hidden shrink-0 mr-2 self-end"
      >
        <img v-if="block.senderAvatarType === 'image'" :src="block.senderAvatar" class="w-full h-full object-cover">
        <span v-else>{{ block.senderAvatar || '🤖' }}</span>
      </div>
      <div v-else-if="block.isGroupChat || showChatAvatars" class="w-8 mr-2 shrink-0"></div>
      <div class="flex flex-col items-start max-w-[75%]">
        <div
          v-if="block.senderName"
          class="text-[12px] mb--1 ml-3"
          style="color: var(--meta-color, #8E8E93);"
        >
          {{ block.senderName }}
        </div>
        <div v-if="hasReactions" class="chat-reaction-anchor is-shell">
          <slot :is-user="false" />
          <ChatReactionBadges :reactions="block.reactions" :is-user="false" />
        </div>
        <slot v-else :is-user="false" />
        <div v-if="block.metaText" class="msg-meta ai-meta">{{ block.metaText }}</div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import ChatMultiSelectCheckbox from './ChatMultiSelectCheckbox.vue'
import ChatReactionBadges from './ChatReactionBadges.vue'

const props = defineProps({
  block: { type: Object, required: true },
  multiSelectMode: { type: Boolean, default: false },
  selected: { type: Boolean, default: false },
  showChatAvatars: { type: Boolean, default: false },
  rootClass: { type: [String, Array, Object], default: '' }
})

const emit = defineEmits(['click'])

const hasReactions = computed(() => Array.isArray(props.block.reactions) && props.block.reactions.length > 0)
</script>
