import { computed, nextTick, ref, shallowRef } from 'vue'
import { moveInHomePages } from '../homeLayout'

const EDGE_PX = 28
const EDGE_FIRST_MS = 520
const EDGE_REPEAT_MS = 900
const HOVER_MS = 90
const SETTLE_MS = 240

/**
 * 桌面条目的自由拖拽，照着系统桌面的手感：
 * 拿起后条目跟着手指走，划过别的条目时其它条目让位重排，
 * 贴着屏幕左右边缘停一下就翻页，松手后飞回落点。
 *
 * 拖拽途中只改本地预览（displayPages），松手才通过 applyPages 落盘。
 *
 * @param {object} opts
 * @param {import('vue').Ref<HTMLElement|null>} opts.rootRef
 * @param {import('vue').Ref<HTMLElement|null>} opts.pagerRef
 * @param {import('vue').Ref<any[][]>} opts.pages
 * @param {import('vue').Ref<number>} opts.activePage
 * @param {(page: number, instant?: boolean) => void} opts.goPage
 * @param {(pages: any[][]) => void} opts.applyPages
 */
export function useHomeDrag({ rootRef, pagerRef, pages, activePage, goPage, applyPages }) {
  const drag = ref(null)
  const preview = shallowRef(null)

  let hoverKey = null
  let hoverTimer = null
  let edgeDir = 0
  let edgeTimer = null
  let settleTimer = null

  const displayPages = computed(() => {
    const d = drag.value
    if (!d || d.settling || !preview.value) return pages.value
    const list = preview.value
    // 拖动时尾部多给一张空白页，可以把条目放到新的一页
    return d.moved && list[list.length - 1]?.length ? [...list, []] : list
  })

  const ghostStyle = computed(() => {
    const d = drag.value
    if (!d) return null
    return {
      width: `${d.w}px`,
      height: `${d.h}px`,
      transform: `translate3d(${d.x}px, ${d.y}px, 0) scale(${d.settling ? 1 : 1.06})`
    }
  })

  function clearTimers() {
    clearTimeout(hoverTimer)
    clearTimeout(edgeTimer)
    hoverTimer = null
    edgeTimer = null
    hoverKey = null
    edgeDir = 0
  }

  /** 从原位拿起条目。 */
  function lift(el, item, clientX, clientY) {
    const root = rootRef.value
    if (!root || !el || !item) return
    clearTimeout(settleTimer)
    clearTimers()
    const rootRect = root.getBoundingClientRect()
    const rect = el.getBoundingClientRect()
    // 编辑态在摆动（rotate），包围盒会略大一圈，用 offset 尺寸取回真实大小
    const w = el.offsetWidth
    const h = el.offsetHeight
    const x = rect.left + (rect.width - w) / 2 - rootRect.left
    const y = rect.top + (rect.height - h) / 2 - rootRect.top
    drag.value = {
      id: item.id,
      item,
      w,
      h,
      x,
      y,
      ox: clientX - rootRect.left - x,
      oy: clientY - rootRect.top - y,
      rootLeft: rootRect.left,
      rootTop: rootRect.top,
      startX: clientX,
      startY: clientY,
      page: activePage.value,
      moved: false,
      settling: false
    }
    preview.value = pages.value.map(page => page.slice())
    navigator.vibrate?.(12)
  }

  function move(clientX, clientY) {
    const d = drag.value
    if (!d || d.settling) return
    d.x = clientX - d.rootLeft - d.ox
    d.y = clientY - d.rootTop - d.oy
    if (!d.moved && Math.hypot(clientX - d.startX, clientY - d.startY) > 4) d.moved = true
    if (!d.moved) return
    trackEdge(clientX)
    trackHover(clientX, clientY)
  }

  // ===== 落点判定 =====
  function pageEl(page) {
    return pagerRef.value?.children?.[page] || null
  }

  /** 手指下面是哪个条目（id），落在最后一个条目下方的空白处是 'end'，其它情况 null。 */
  function hoverTargetAt(clientX, clientY) {
    const d = drag.value
    const el = pageEl(d.page)
    if (!el) return null
    const pageRect = el.getBoundingClientRect()
    if (clientX < pageRect.left || clientX > pageRect.right || clientY < pageRect.top || clientY > pageRect.bottom) return null
    const hit = document.elementsFromPoint(clientX, clientY)
      .map(node => node.closest?.('.kk-item'))
      .find(node => node && el.contains(node))
    if (hit) return hit.dataset.id === d.id ? null : hit.dataset.id
    const items = el.querySelectorAll('.kk-grid > .kk-item')
    let bottom = -Infinity
    items.forEach(node => { bottom = Math.max(bottom, node.getBoundingClientRect().bottom) })
    return clientY > bottom ? 'end' : null
  }

  function trackHover(clientX, clientY) {
    const key = hoverTargetAt(clientX, clientY)
    if (key === hoverKey) return
    clearTimeout(hoverTimer)
    hoverKey = key
    if (key == null) return
    hoverTimer = setTimeout(() => applyTarget(key), HOVER_MS)
  }

  /**
   * 每次都从落盘前的原始分页重新排，被挤到下一页的条目在拖走后会回到原位。
   * key 是条目 id 时：拖动条目当前排在它前面就落到它后面，否则落到它前面。
   */
  function applyTarget(key) {
    const d = drag.value
    if (!d || d.settling) return
    const base = pages.value
    const rest = (base[d.page] || []).filter(item => item.id !== d.id)
    let index = rest.length
    if (key !== 'end') {
      const shown = preview.value?.[d.page] || []
      const self = shown.findIndex(item => item.id === d.id)
      const other = shown.findIndex(item => item.id === key)
      if (other < 0) return
      const at = rest.findIndex(item => item.id === key)
      // 从上一页挤过来的条目不在原始分页里，放到页首
      index = at < 0 ? 0 : at + (self >= 0 && self < other ? 1 : 0)
    }
    preview.value = moveInHomePages(base, d.id, d.page, index)
  }

  // ===== 贴边翻页 =====
  function trackEdge(clientX) {
    const rect = pagerRef.value?.getBoundingClientRect()
    if (!rect) return
    let dir = 0
    if (clientX < rect.left + EDGE_PX) dir = -1
    else if (clientX > rect.right - EDGE_PX) dir = 1
    if (dir === edgeDir) return
    clearTimeout(edgeTimer)
    edgeTimer = null
    edgeDir = dir
    if (dir) edgeTimer = setTimeout(flipPage, EDGE_FIRST_MS)
  }

  function flipPage() {
    const d = drag.value
    if (!d || d.settling || !edgeDir) return
    const next = d.page + edgeDir
    if (next >= 0 && next < displayPages.value.length) {
      d.page = next
      goPage(next)
      clearTimeout(hoverTimer)
      hoverKey = 'end'
      applyTarget('end')
    }
    edgeTimer = setTimeout(flipPage, EDGE_REPEAT_MS)
  }

  // ===== 松手 =====
  /** @returns {number|null} 落盘后条目所在页（没动过返回 null） */
  function drop() {
    const d = drag.value
    if (!d || d.settling) return null
    clearTimers()
    let landedPage = null
    if (d.moved && preview.value) {
      applyPages(preview.value)
      landedPage = d.item.page
    }
    d.settling = true
    nextTick(() => {
      const root = rootRef.value
      const el = pagerRef.value?.querySelector(`.kk-item[data-id="${d.id}"]`)
      if (root && el) {
        const rootRect = root.getBoundingClientRect()
        const rect = el.getBoundingClientRect()
        d.x = rect.left + (rect.width - d.w) / 2 - rootRect.left
        d.y = rect.top + (rect.height - d.h) / 2 - rootRect.top
      }
      settleTimer = setTimeout(() => {
        if (drag.value === d) drag.value = null
        preview.value = null
      }, SETTLE_MS)
    })
    return landedPage
  }

  function dispose() {
    clearTimers()
    clearTimeout(settleTimer)
  }

  return { drag, displayPages, ghostStyle, lift, move, drop, dispose }
}
