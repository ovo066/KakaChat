<template>
  <div
    ref="rootRef"
    class="kk-home"
    :class="{ editing: isEdit, 'item-dragging': !!drag }"
    :data-theme="settingsStore.isDark ? 'night' : 'day'"
    :data-paper="paper"
    :style="paperStyle"
    @contextmenu="onContextMenu"
    @click.capture="onClickCapture"
  >
    <main
      ref="pagerRef"
      class="kk-pager"
      :class="{ dragging: mouseDrag?.moved }"
      @scroll.passive="onPagerScroll"
      @wheel="onWheel"
      @pointerdown="onPointerDown"
      @dragstart.prevent
    >
      <section v-for="(pageItems, pi) in displayPages" :key="'page-' + pi" class="kk-page" @click="onPageClick">
        <TransitionGroup tag="div" class="kk-grid" move-class="kk-move">
          <div
            v-for="item in pageItems"
            :key="item.id"
            class="kk-item"
            :class="['s-' + item.size, 'w-' + item.type, {
              gone: goneId === item.id,
              pop: popId === item.id,
              lifted: drag?.id === item.id
            }]"
            :data-id="item.id"
          >
            <button class="kk-del" type="button" aria-label="移除" @click.stop="removeWithAnim(item.id)"><i class="ph-bold ph-minus"></i></button>
            <button
              v-if="HOME_CONFIGURABLE_TYPES.has(item.type)"
              class="kk-del kk-gear"
              type="button"
              aria-label="设置"
              @click.stop="openSettings(item.id)"
            ><i class="ph-bold ph-sliders-horizontal"></i></button>
            <HomeWidget
              :item="item"
              :companion-id="companionId"
              :message-badge="messageBadge"
              @open-app="openApp"
              @gallery="openGallery"
              @config="updateConfig(item.id, $event)"
              @configure="openSettings(item.id)"
            />
          </div>
        </TransitionGroup>
      </section>
    </main>

    <div v-if="drag" class="kk-drag-ghost" :class="{ settling: drag.settling }" :style="ghostStyle">
      <div class="kk-item" :class="['s-' + drag.item.size, 'w-' + drag.item.type]">
        <HomeWidget :item="drag.item" :companion-id="companionId" :message-badge="messageBadge" />
      </div>
    </div>

    <nav v-if="displayPages.length > 1" class="kk-dots">
      <button
        v-for="(_, i) in displayPages"
        :key="'dot-' + i"
        type="button"
        :class="{ on: i === activePage }"
        :aria-label="`第 ${i + 1} 页`"
        @click="goPage(i)"
      ></button>
    </nav>

    <footer class="kk-dock">
      <HomeAppIcon
        v-for="app in dockApps"
        :key="app.key"
        :app="app"
        :badge="app.key === 'messages' ? messageBadge : 0"
        @open="openApp"
      />
    </footer>

    <div class="kk-editbar">
      <button class="eb-add" type="button" @click="openGallery"><i class="ph-bold ph-plus"></i>添加小组件</button>
      <button class="eb-done" type="button" @click="exitEdit">完成</button>
    </div>

    <HomeWidgetGallery
      :open="galleryOpen"
      :missing-apps="missingApps"
      :companion-id="companionId"
      @close="galleryOpen = false"
      @add="onAddWidget"
      @add-app="onAddApp"
    />
    <HomeWidgetSettings
      :open="!!settingsItem"
      :item="settingsItem"
      @close="settingsItemId = ''"
      @config="updateConfig(settingsItemId, $event)"
    />
  </div>
</template>

<script setup>
import '@phosphor-icons/web/duotone'
import '../home.css'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useContactsStore } from '../../../stores/contacts'
import { useSettingsStore } from '../../../stores/settings'
import { DESKTOP_APPS } from '../../../data/homeApps'
import { HOME_CONFIGURABLE_TYPES, HOME_DOCK_APP_KEYS, HOME_PAPERS } from '../homeLayout'
import { useHomeDrag } from '../composables/useHomeDrag'
import { useHomeLayout } from '../composables/useHomeLayout'
import HomeAppIcon from '../components/HomeAppIcon.vue'
import HomeWidget from '../components/HomeWidget.vue'
import HomeWidgetGallery from '../components/HomeWidgetGallery.vue'
import HomeWidgetSettings from '../components/HomeWidgetSettings.vue'

const HOME_FONT_LINKS = [
  ['kk-font-wenkai', 'https://cdn.jsdelivr.net/npm/lxgw-wenkai-screen-webfont/lxgwwenkaiscreen.css'],
  ['kk-font-caveat-500', 'https://cdn.jsdelivr.net/npm/@fontsource/caveat/500.css'],
  ['kk-font-caveat-700', 'https://cdn.jsdelivr.net/npm/@fontsource/caveat/700.css']
]
const LONG_PRESS_MS = 520
const DRAG_SLOP_PX = 6

const router = useRouter()
const route = useRoute()
const contactsStore = useContactsStore()
const settingsStore = useSettingsStore()
const { pages, missingApps, findItem, addItem, removeItem, applyPages, updateConfig, resetLayout } = useHomeLayout()

const rootRef = ref(null)
const pagerRef = ref(null)
const activePage = ref(0)
const isEdit = ref(false)
const galleryOpen = ref(false)
const settingsItemId = ref('')
const goneId = ref('')
const popId = ref('')
const mouseDrag = ref(null)

const { drag, displayPages, ghostStyle, lift, move: moveDrag, drop: dropDrag, dispose: disposeDrag } = useHomeDrag({
  rootRef,
  pagerRef,
  pages,
  activePage,
  goPage,
  applyPages
})

// ===== 外观 =====
const paper = computed(() => {
  const value = settingsStore.theme?.homePaper
  if (value === 'photo') return settingsStore.wallpaper ? 'photo' : 'dots'
  return HOME_PAPERS.some(p => p.value === value) ? value : 'dots'
})
const paperStyle = computed(() => (paper.value === 'photo' ? { backgroundImage: `url("${settingsStore.wallpaper}")` } : null))

const dockApps = computed(() => HOME_DOCK_APP_KEYS.map(key => DESKTOP_APPS.find(a => a.key === key)).filter(Boolean))
const messageBadge = computed(() => (contactsStore.contacts || []).reduce((sum, c) => sum + Math.max(0, Number(c?.unreadCount || 0)), 0))

/** 桌面的「TA」：第一张角色卡绑定的人；没绑就让各小组件自己取最近聊过的 */
const companionId = computed(() => {
  for (const page of pages.value) {
    const card = page.find(item => item.type === 'companion')
    if (card) return String(card.config?.contactId || '')
  }
  return ''
})

const settingsItem = computed(() => (settingsItemId.value ? findItem(settingsItemId.value) : null))

function ensureFonts() {
  for (const [id, href] of HOME_FONT_LINKS) {
    if (document.getElementById(id)) continue
    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = href
    document.head.appendChild(link)
  }
}

// ===== 翻页 =====
function clampPage(p) {
  return Math.min(Math.max(p, 0), Math.max(displayPages.value.length - 1, 0))
}

function goPage(idx, instant = false) {
  const el = pagerRef.value
  activePage.value = clampPage(idx)
  el?.scrollTo({ left: activePage.value * el.clientWidth, behavior: instant ? 'auto' : 'smooth' })
}

function syncPagerScroll() {
  const el = pagerRef.value
  if (el) el.scrollLeft = activePage.value * el.clientWidth
}

function onPagerScroll(e) {
  if (mouseDrag.value?.moved || drag.value) return
  const el = e.target
  activePage.value = clampPage(Math.round(el.scrollLeft / (el.clientWidth || 1)))
}

let wheelLock = false
function onWheel(e) {
  if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
  if (e.target.closest('textarea')) return
  // 页面内容比屏幕高时让它自己滚
  const pageEl = e.target.closest('.kk-page')
  if (pageEl && pageEl.scrollHeight > pageEl.clientHeight + 2) return
  e.preventDefault()
  if (wheelLock || Math.abs(e.deltaY) < 6) return
  wheelLock = true
  setTimeout(() => { wheelLock = false }, 650)
  goPage(activePage.value + (e.deltaY > 0 ? 1 : -1))
}

// ===== 鼠标拖拽翻页 + 长按拿起条目 =====
// 非编辑态：长按进编辑并直接拿起，不松手就能接着拖（和系统桌面一样）。
// 编辑态：按住条目一挪动就拿起。
let longPressTimer = null
let pressStart = null
let suppressClickUntil = 0

function liftPressed() {
  const press = pressStart
  const item = press && findItem(press.id)
  pressStart = null
  if (!item) return
  mouseDrag.value = null
  lift(press.el, item, press.lastX, press.lastY)
}

function onPointerDown(e) {
  if (drag.value || e.target.closest('textarea, input, .kk-del')) return
  const onItem = e.target.closest('.kk-item')
  if (e.pointerType === 'mouse' && e.button === 0 && !(isEdit.value && onItem)) {
    mouseDrag.value = { x: e.clientX, start: pagerRef.value.scrollLeft, moved: false }
  }
  if (!onItem || (e.pointerType === 'mouse' && e.button !== 0)) return
  pressStart = { id: onItem.dataset.id, el: onItem, x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY }
  if (isEdit.value) return
  clearTimeout(longPressTimer)
  longPressTimer = setTimeout(() => {
    longPressTimer = null
    suppressClickUntil = Date.now() + 400
    enterEdit()
    liftPressed()
  }, LONG_PRESS_MS)
}

function onPointerMove(e) {
  if (drag.value) {
    moveDrag(e.clientX, e.clientY)
    return
  }
  if (pressStart) {
    pressStart.lastX = e.clientX
    pressStart.lastY = e.clientY
    const dist = Math.hypot(e.clientX - pressStart.x, e.clientY - pressStart.y)
    if (longPressTimer && dist > 8) {
      clearTimeout(longPressTimer)
      longPressTimer = null
      pressStart = null
    } else if (isEdit.value && dist > DRAG_SLOP_PX) {
      liftPressed()
      moveDrag(e.clientX, e.clientY)
      return
    }
  }
  const md = mouseDrag.value
  if (!md) return
  const dx = e.clientX - md.x
  if (!md.moved && Math.abs(dx) > 6) md.moved = true
  if (md.moved) pagerRef.value.scrollLeft = md.start - dx
}

function onPointerUp(e) {
  clearTimeout(longPressTimer)
  longPressTimer = null
  pressStart = null
  if (drag.value) {
    if (drag.value.moved) suppressClickUntil = Date.now() + 350
    const landed = dropDrag()
    if (landed != null) {
      activePage.value = clampPage(landed)
      nextTick(syncPagerScroll)
    }
    return
  }
  const md = mouseDrag.value
  mouseDrag.value = null
  if (!md?.moved) return
  const dx = e.clientX - md.x
  let p = Math.round(md.start / (pagerRef.value?.clientWidth || 1))
  if (dx < -40) p += 1
  else if (dx > 40) p -= 1
  goPage(p)
  suppressClickUntil = Date.now() + 350
}

// 长按拿起后手指再动，别让浏览器把它当成横向翻页滚动
function onTouchMove(e) {
  if (drag.value && e.cancelable) e.preventDefault()
}

function onClickCapture(e) {
  if (Date.now() < suppressClickUntil) {
    e.preventDefault()
    e.stopPropagation()
  }
}

function onContextMenu(e) {
  if (e.target.closest('textarea, input')) return
  e.preventDefault()
  if (e.target.closest('.kk-item')) enterEdit()
}

// ===== 编辑 =====
function enterEdit() {
  isEdit.value = true
}

function exitEdit() {
  isEdit.value = false
  galleryOpen.value = false
}

function onPageClick(e) {
  // 编辑态点空白处退出，和系统桌面一样
  if (isEdit.value && !galleryOpen.value && !e.target.closest('.kk-item')) exitEdit()
}

function openGallery() {
  if (!isEdit.value) enterEdit()
  galleryOpen.value = true
}

function openSettings(id) {
  settingsItemId.value = id
}

function flashPop(id) {
  popId.value = id
  setTimeout(() => { if (popId.value === id) popId.value = '' }, 700)
}

async function placeAndReveal(result) {
  galleryOpen.value = false
  await nextTick()
  goPage(result.page)
  flashPop(result.id)
}

function onAddWidget(entry) {
  placeAndReveal(addItem(entry.type, entry.size, {}, activePage.value))
}

function onAddApp(appKey) {
  placeAndReveal(addItem('app', '1x1', { appKey }, activePage.value))
}

function removeWithAnim(id) {
  goneId.value = id
  setTimeout(() => {
    removeItem(id)
    goneId.value = ''
  }, 260)
}

// ===== 打开应用 =====
function openApp(app) {
  if (isEdit.value || !app?.route) return
  router.push(app.route)
}

function onKeydown(e) {
  if (e.target.closest?.('textarea, input, [contenteditable="true"]')) return
  if (e.key === 'ArrowRight') goPage(activePage.value + 1)
  else if (e.key === 'ArrowLeft') goPage(activePage.value - 1)
  else if (e.key === 'Escape') {
    if (settingsItemId.value) settingsItemId.value = ''
    else if (galleryOpen.value) galleryOpen.value = false
    else if (isEdit.value) exitEdit()
  }
}

// 美化页的「整理桌面 / 还原桌面」通过 query 进来
watch(() => route.query.edit, (value) => {
  if (!value) return
  if (value === 'reset') resetLayout()
  enterEdit()
  router.replace({ query: {} })
}, { immediate: true })

watch(() => pages.value.length, () => {
  activePage.value = clampPage(activePage.value)
  nextTick(syncPagerScroll)
})

onMounted(() => {
  ensureFonts()
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('resize', syncPagerScroll)
  pagerRef.value?.addEventListener('touchmove', onTouchMove, { passive: false })
  syncPagerScroll()
})

onBeforeUnmount(() => {
  clearTimeout(longPressTimer)
  disposeDrag()
  pagerRef.value?.removeEventListener('touchmove', onTouchMove)
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', syncPagerScroll)
})
</script>
