<template>
  <div class="kk-polaroid" @click="onTap">
    <span class="kk-tape t-butter stripe"></span>
    <div class="mo-photo">
      <img v-if="item.config?.src" :src="item.config.src" alt="" draggable="false">
      <div v-else class="mo-ph"><i class="ph-duotone ph-camera-plus"></i></div>
    </div>
    <div class="mo-foot"><span class="mo-cap">{{ item.config?.caption || (item.config?.src ? '' : '点一下放张照片') }}</span></div>
  </div>
</template>

<script setup>
const props = defineProps({
  item: { type: Object, required: true },
  preview: { type: Boolean, default: false }
})
const emit = defineEmits(['configure'])

function onTap() {
  // 有照片时点着不动，换图走编辑态的齿轮
  if (!props.preview && !props.item.config?.src) emit('configure')
}
</script>
