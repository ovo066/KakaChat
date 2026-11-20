<template>
  <header class="ios26-nav">
    <div class="ios26-nav-leading">
      <button v-if="showBack" type="button" class="ios26-glass-btn" :aria-label="backLabel" @click="$emit('back')">
        <i class="ph-bold ph-caret-left"></i>
      </button>
    </div>
    <div class="ios26-nav-title" :class="{ 'is-hidden': titleHidden }">{{ title }}</div>
    <div class="ios26-nav-trailing">
      <slot name="trailing"></slot>
    </div>
  </header>
</template>

<script setup>
defineProps({
  title: { type: String, default: '' },
  titleHidden: { type: Boolean, default: false },
  showBack: { type: Boolean, default: true },
  backLabel: { type: String, default: '返回' }
})

defineEmits(['back'])
</script>
