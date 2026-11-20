<template>
  <div class="kk-sticky">
    <textarea
      :value="item.config?.text || ''"
      spellcheck="false"
      aria-label="便利贴"
      placeholder="写点什么…"
      :readonly="preview"
      @input="emit('config', { text: $event.target.value })"
    ></textarea>
  </div>
</template>

<script setup>
defineProps({
  item: { type: Object, required: true },
  preview: { type: Boolean, default: false }
})
const emit = defineEmits(['config'])
</script>
