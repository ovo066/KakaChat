import { DESKTOP_APPS } from '../../data/homeApps'
import { makeId } from '../../utils/id'

/**
 * 手账桌面布局模型。
 *
 * 桌面条目存放在 widgets store 的同一个数组里（沿用原有持久化通道），
 * 每一项：{ id, type, size, page, position, config }。
 * 应用图标也是条目（type: 'app', config.appKey），这样可以和小组件一起排版、移除、加回。
 * 底栏的应用固定，不进数组。
 */

export const HOME_GRID_COLS = 4
export const HOME_PAGE_ROWS = 6

export const HOME_DOCK_APP_KEYS = ['messages', 'meet', 'forum', 'settings']

export const HOME_PAPERS = [
  { value: 'dots', label: '点阵' },
  { value: 'lines', label: '横线' },
  { value: 'grid', label: '方格' },
  { value: 'plain', label: '素纸' }
]

/** 抽屉里可添加的小组件 */
export const HOME_WIDGET_CATALOG = [
  { type: 'companion', size: '4x2', name: '角色卡' },
  { type: 'music', size: '4x2', name: '磁带播放器' },
  { type: 'clock', size: '2x2', name: '手绘时钟' },
  { type: 'mood', size: '2x2', name: '心情打卡' },
  { type: 'sticky', size: '2x2', name: '便利贴' },
  { type: 'image', size: '2x2', name: '拍立得' },
  { type: 'moment', size: '2x2', name: '最新动态' },
  { type: 'schedule', size: '2x2', name: 'TA 的今天' },
  { type: 'weather', size: '2x2', name: '天气' },
  { type: 'todo', size: '2x2', name: '待办' },
  { type: 'countdown', size: '2x1', name: '倒计时' },
  { type: 'anniv', size: '2x1', name: '纪念日' },
  { type: 'year', size: '2x1', name: '年进度' },
  { type: 'battery', size: '2x1', name: '电量' },
  { type: 'quote', size: '4x2', name: '收藏的句子' },
  { type: 'hero', size: '4x1', name: '日期问候' }
]

/** 可以指定绑定哪个角色的小组件 */
export const HOME_CONTACT_WIDGET_TYPES = new Set(['companion', 'schedule', 'anniv'])

/** 编辑态右上角带齿轮、能打开设置抽屉的小组件 */
export const HOME_CONFIGURABLE_TYPES = new Set([...HOME_CONTACT_WIDGET_TYPES, 'countdown', 'image'])

const HOME_ITEM_TYPES = new Set(['app', 'add', ...HOME_WIDGET_CATALOG.map(c => c.type)])
const HOME_ITEM_SIZES = new Set(['1x1', '2x1', '2x2', '4x1', '4x2'])

export function getDefaultWidgetConfig(type) {
  if (type === 'sticky') return { text: '' }
  if (type === 'image') return { src: '', caption: '' }
  return {}
}

export function createHomeItem(type, size, config = {}) {
  return {
    id: makeId('widget'),
    type,
    size,
    page: 0,
    position: 0,
    enabled: true,
    config: { ...getDefaultWidgetConfig(type), ...config }
  }
}

function app(key) {
  return createHomeItem('app', '1x1', { appKey: key })
}

function widget(type, config) {
  const entry = HOME_WIDGET_CATALOG.find(c => c.type === type)
  return createHomeItem(type, entry?.size || '2x2', config)
}

function placePages(pages) {
  const out = []
  pages.forEach((items, page) => {
    items.forEach((item, position) => {
      out.push({ ...item, page, position })
    })
  })
  return out
}

export function createDefaultHomeLayout() {
  return placePages([
    [widget('hero'), widget('companion'), widget('weather'), widget('schedule'), app('persona'), app('lorebook'), app('album'), app('planner')],
    [widget('music'), widget('moment'), widget('anniv'), widget('year'), widget('todo'), app('theme'), app('favorites'), app('debugLogs'), createHomeItem('add', '1x1')],
    [widget('quote'), widget('sticky', { text: '给明天的自己：\n' }), widget('mood'), widget('countdown'), widget('battery'), app('games')]
  ])
}

/** 新布局的每一项都带整数 page；旧版小组件没有。 */
export function isHomeLayout(items) {
  return Array.isArray(items) && items.some(item => Number.isInteger(item?.page))
}

function parseSize(size) {
  const [w, h] = String(size || '1x1').split('x').map(Number)
  return [Math.min(HOME_GRID_COLS, w || 1), h || 1]
}

/** 按 CSS grid `row dense` 的规则模拟摆放，返回占用的行数。 */
export function countPackedRows(items) {
  const occ = []
  let maxRow = 0
  for (const item of items) {
    const [w, h] = parseSize(item.size)
    let placed = false
    for (let r = 0; r < 200 && !placed; r++) {
      for (let c = 0; c <= HOME_GRID_COLS - w; c++) {
        let ok = true
        for (let dr = 0; dr < h && ok; dr++) {
          for (let dc = 0; dc < w; dc++) {
            if (occ[r + dr]?.[c + dc]) { ok = false; break }
          }
        }
        if (!ok) continue
        for (let dr = 0; dr < h; dr++) {
          occ[r + dr] ||= []
          for (let dc = 0; dc < w; dc++) occ[r + dr][c + dc] = true
        }
        maxRow = Math.max(maxRow, r + h)
        placed = true
        break
      }
    }
  }
  return maxRow
}

export function fitsOnPage(pageItems, item) {
  return countPackedRows([...pageItems, item]) <= HOME_PAGE_ROWS
}

/** 把条目分成页，每页按 position 排好。 */
export function groupHomePages(items) {
  const pages = []
  for (const item of Array.isArray(items) ? items : []) {
    if (!item || !Number.isInteger(item.page) || item.page < 0) continue
    ;(pages[item.page] ||= []).push(item)
  }
  const compact = pages.filter(page => page && page.length)
  compact.forEach(page => page.sort((a, b) => (a.position || 0) - (b.position || 0)))
  return compact.length ? compact : [[]]
}

/** 去掉空页、把 page/position 重新编号成连续的整数。 */
export function normalizeHomeLayout(items) {
  const pages = groupHomePages(items)
  const out = []
  pages.forEach((page, pi) => {
    page.forEach((item, position) => {
      item.page = pi
      item.position = position
      out.push(item)
    })
  })
  return out
}

/** 放进第一个放得下的页：优先 preferredPage，不行就开新页。返回页码。 */
export function placeHomeItem(items, item, preferredPage = 0) {
  const pages = groupHomePages(items)
  const order = [preferredPage, ...pages.map((_, i) => i).filter(i => i !== preferredPage)]
  let target = order.find(pi => pages[pi] && fitsOnPage(pages[pi], item))
  if (target == null) target = pages[0]?.length ? pages.length : 0
  item.page = target
  item.position = (pages[target] || []).length
  items.push(item)
  return target
}

/**
 * 把一个条目挪到 targetPage 的第 targetIndex 位（不改动原条目，返回新的分页数组）。
 * 目标页放不下时，和系统桌面一样把页尾的条目挤到下一页，必要时开新页。
 * 拖走后变空的页保留成空数组，页码不会在拖拽途中错位，提交时再由 normalizeHomeLayout 清掉。
 */
export function moveInHomePages(pages, id, targetPage, targetIndex) {
  const moving = pages.flat().find(item => item.id === id)
  const out = pages.map(page => page.filter(item => item.id !== id))
  if (!moving) return out
  const pageIdx = Math.max(0, targetPage)
  while (out.length <= pageIdx) out.push([])
  const target = out[pageIdx]
  target.splice(Math.min(Math.max(targetIndex, 0), target.length), 0, moving)

  for (let pi = pageIdx; pi < out.length; pi++) {
    const page = out[pi]
    while (page.length > 1 && countPackedRows(page) > HOME_PAGE_ROWS) {
      const last = page[page.length - 1] === moving ? page.length - 2 : page.length - 1
      const [overflow] = page.splice(last, 1)
      ;(out[pi + 1] ||= []).unshift(overflow)
    }
  }
  return out
}

/** 不在桌面也不在底栏的应用，抽屉里可以加回来。 */
export function getMissingDesktopApps(items) {
  const placed = new Set(HOME_DOCK_APP_KEYS)
  for (const item of Array.isArray(items) ? items : []) {
    if (item?.type === 'app' && item.config?.appKey) placed.add(item.config.appKey)
  }
  return DESKTOP_APPS.filter(appDef => !placed.has(appDef.key))
}

export function isValidHomeItem(item) {
  return !!item && HOME_ITEM_TYPES.has(item.type) && HOME_ITEM_SIZES.has(item.size)
}

const DEFAULT_LEGACY_QUOTE = '生活不止眼前的苟且，还有诗和远方。'

/**
 * 旧版小组件 → 新桌面。天气/日历/统计这类现在由真实数据驱动，不再搬；
 * 只把用户自己写的内容带过来：照片、自定义语录、手写待办。
 */
export function migrateLegacyWidgets(legacy) {
  const items = createDefaultHomeLayout()
  const list = Array.isArray(legacy) ? [...legacy] : []
  list.sort((a, b) => (a?.position || 0) - (b?.position || 0))

  for (const old of list) {
    const cfg = old?.config || {}
    let next = null
    if (old?.type === 'image' && (cfg.src || cfg.srcRef)) {
      next = widget('image', { src: cfg.src || '', srcRef: cfg.srcRef || '', caption: cfg.caption || '' })
    } else if (old?.type === 'quote' && cfg.text && cfg.text.trim() !== DEFAULT_LEGACY_QUOTE) {
      const author = cfg.author ? `\n—— ${cfg.author}` : ''
      next = widget('sticky', { text: `${cfg.text.trim()}${author}` })
    } else if (old?.type === 'todo' && Array.isArray(cfg.items) && cfg.items.length) {
      const lines = cfg.items.map(t => `${t.done ? '☑' : '☐'} ${t.text || ''}`).join('\n')
      next = widget('sticky', { text: `${cfg.title || '待办'}\n${lines}` })
    }
    if (next) placeHomeItem(items, next, Math.max(0, groupHomePages(items).length - 1))
  }
  return items
}
