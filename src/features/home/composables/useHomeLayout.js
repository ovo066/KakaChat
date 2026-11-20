import { computed, watch } from 'vue'
import { useBootstrapStore } from '../../../stores/bootstrap'
import { useWidgetsStore } from '../../../stores/widgets'
import { useStorage } from '../../../composables/useStorage'
import {
  createDefaultHomeLayout,
  createHomeItem,
  getMissingDesktopApps,
  groupHomePages,
  isHomeLayout,
  isValidHomeItem,
  migrateLegacyWidgets,
  normalizeHomeLayout,
  placeHomeItem
} from '../homeLayout'

/**
 * 桌面布局的读写。条目存在 widgets store 里，改完统一走 scheduleSave。
 */
export function useHomeLayout() {
  const widgetsStore = useWidgetsStore()
  const bootstrapStore = useBootstrapStore()
  const { scheduleSave } = useStorage()

  const pages = computed(() => groupHomePages(widgetsStore.widgets.filter(isValidHomeItem)))
  const missingApps = computed(() => getMissingDesktopApps(widgetsStore.widgets))

  function commit(items) {
    widgetsStore.setWidgets(normalizeHomeLayout(items))
    scheduleSave()
  }

  // 首次进入新桌面：空数组给默认布局，旧版小组件迁移过来。
  function ensureLayout() {
    if (bootstrapStore.isHydrating) return
    if (isHomeLayout(widgetsStore.widgets)) return
    const legacy = widgetsStore.widgets.slice()
    commit(legacy.length ? migrateLegacyWidgets(legacy) : createDefaultHomeLayout())
  }

  watch(() => [bootstrapStore.isHydrating, isHomeLayout(widgetsStore.widgets)], ensureLayout, { immediate: true })

  function findItem(id) {
    return widgetsStore.widgets.find(item => item.id === id) || null
  }

  /** @returns {{ id: string, page: number }} */
  function addItem(type, size, config = {}, preferredPage = 0) {
    const items = widgetsStore.widgets.slice()
    const item = createHomeItem(type, size, config)
    placeHomeItem(items, item, preferredPage)
    commit(items)
    // normalizeHomeLayout 会就地重排 page，这里读到的是最终页码
    return { id: item.id, page: item.page }
  }

  function removeItem(id) {
    commit(widgetsStore.widgets.filter(item => item.id !== id))
  }

  /** 按拖拽预览出来的分页落盘（见 moveInHomePages）。 */
  function applyPages(nextPages) {
    nextPages.forEach((page, pi) => {
      page.forEach((item, position) => {
        item.page = pi
        item.position = position
      })
    })
    commit(widgetsStore.widgets.slice())
  }

  function updateConfig(id, patch) {
    const item = findItem(id)
    if (!item) return
    item.config = { ...(item.config || {}), ...patch }
    scheduleSave()
  }

  function resetLayout() {
    commit(createDefaultHomeLayout())
  }

  return {
    pages,
    missingApps,
    findItem,
    addItem,
    removeItem,
    applyPages,
    updateConfig,
    resetLayout
  }
}
