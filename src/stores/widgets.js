import { defineStore } from 'pinia'
import { reactive } from 'vue'

/**
 * 桌面条目（应用图标 + 小组件）。布局规则见 src/features/home/homeLayout.js，
 * 读写统一走 src/features/home/composables/useHomeLayout.js。
 */
export const useWidgetsStore = defineStore('widgets', () => {
  const widgets = reactive([])

  function setWidgets(newWidgets) {
    widgets.splice(0, widgets.length, ...(Array.isArray(newWidgets) ? newWidgets : []))
  }

  return {
    widgets,
    setWidgets
  }
})
