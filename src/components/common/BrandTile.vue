<template>
  <span
    class="brand-tile"
    :class="variant === 'tinted' ? 'is-tinted' : 'is-solid'"
    :style="tileStyle"
    aria-hidden="true"
  >
    <span v-if="svg" class="brand-tile-glyph" v-html="svg"></span>
    <i v-else-if="icon" :class="['ph-bold', icon]"></i>
    <span v-else class="brand-tile-text">{{ text || '?' }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { getBrandSvg } from '../../composables/api/brandIcons'

const props = defineProps({
  brand: { type: String, default: '' },
  icon: { type: String, default: '' },
  text: { type: String, default: '' },
  // solid：品牌底色 + 白色图形（供应商）；tinted：浅色底 + 品牌色图形（模型）
  variant: { type: String, default: 'solid' },
  tint: { type: String, default: '' },
  glyph: { type: String, default: '' },
  color: { type: String, default: '' },
  size: { type: Number, default: 30 }
})

const svg = computed(() => getBrandSvg(props.brand))

const tileStyle = computed(() => {
  const size = props.size
  const style = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: `${Math.round(size * 0.25)}px`,
    fontSize: `${Math.round(size * (props.text ? 0.46 : 0.54))}px`
  }
  if (props.variant === 'tinted') {
    style['--brand'] = props.color || 'var(--text-primary, #000)'
    return style
  }
  style.background = props.tint || 'linear-gradient(140deg, #A1A1A8, #6D6D73)'
  style.color = props.glyph || '#fff'
  return style
})
</script>

<style scoped>
.brand-tile {
  display: inline-grid;
  flex-shrink: 0;
  place-items: center;
  overflow: hidden;
}

.brand-tile.is-solid {
  box-shadow: inset 0 0 0 0.5px rgba(0, 0, 0, 0.1);
}

.dark .brand-tile.is-solid {
  box-shadow: inset 0 0 0 0.5px rgba(255, 255, 255, 0.16);
}

.brand-tile.is-tinted {
  background: color-mix(in srgb, var(--brand) 13%, transparent);
  color: var(--brand);
}

.brand-tile-glyph {
  display: block;
  width: 60%;
  height: 60%;
}

.brand-tile-glyph :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
}

.brand-tile-text {
  font-weight: 700;
  line-height: 1;
}
</style>
