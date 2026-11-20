<template>
  <section v-if="photos.length > 0" class="cc-glass cc-group">
    <button type="button" class="cc-row" @click="emit('open', 0)">
      <span class="cc-row-icon" style="--icon-bg: #FF375F"><i class="ph-fill ph-images"></i></span>
      <span class="cc-row-title">照片</span>
      <span class="cc-row-value">{{ photos.length }}</span>
      <i class="ph-bold ph-caret-right"></i>
    </button>
    <div class="cc-photos">
      <button
        v-for="(url, idx) in photos.slice(0, previewCount)"
        :key="idx"
        type="button"
        class="cc-photo"
        :aria-label="`查看第 ${idx + 1} 张照片`"
        @click="emit('open', idx)"
      >
        <img :src="url" alt="" loading="lazy">
      </button>
    </div>
  </section>
</template>

<script setup>
defineProps({
  photos: { type: Array, default: () => [] },
  previewCount: { type: Number, default: 6 }
})

const emit = defineEmits(['open'])
</script>
