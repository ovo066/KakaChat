/**
 * 自动深浅色：跟随系统 / 定时切换。
 * isDark 始终是"当前生效"的值（桌面日夜纸张等都读它），自动模式下由这里负责写入。
 */
import { watch } from 'vue'
import { useBootstrapStore } from '../stores/bootstrap'
import { useSettingsStore } from '../stores/settings'
import {
  APPEARANCE_MODE_SCHEDULE,
  APPEARANCE_MODE_SYSTEM,
  isAutoAppearanceMode,
  msUntilNextScheduleBoundary,
  normalizeAppearanceMode,
  resolveEffectiveDark
} from '../utils/appearance'

const APPEARANCE_HINT_KEY = 'kk_appearance_hint'

function readHint() {
  try {
    const raw = localStorage.getItem(APPEARANCE_HINT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeHint(hint) {
  try {
    localStorage.setItem(APPEARANCE_HINT_KEY, JSON.stringify(hint))
  } catch {
    // 隐私模式 / 配额不足时忽略
  }
}

/**
 * 启动早期（数据还在 IndexedDB 里恢复时）按上次的外观设置先给 <html> 打上 .dark，避免深色用户白屏闪烁。
 */
export function applyEarlyAppearanceHint() {
  if (typeof document === 'undefined') return
  const hint = readHint()
  if (!hint) return
  const dark = resolveEffectiveDark({
    mode: hint.mode,
    isDark: hint.dark,
    start: hint.start,
    end: hint.end
  })
  document.documentElement.classList.toggle('dark', dark)
}

let installed = false

export function installAppearanceAutoSwitch() {
  if (installed || typeof window === 'undefined') return
  installed = true

  const store = useSettingsStore()
  const bootstrapStore = useBootstrapStore()
  const media = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null
  let scheduleTimer = null

  function clearScheduleTimer() {
    if (!scheduleTimer) return
    clearTimeout(scheduleTimer)
    scheduleTimer = null
  }

  function apply() {
    const mode = normalizeAppearanceMode(store.appearanceMode)
    const auto = isAutoAppearanceMode(mode)
    const dark = auto
      ? resolveEffectiveDark({
          mode,
          start: store.darkScheduleStart,
          end: store.darkScheduleEnd,
          systemDark: media ? media.matches : undefined
        })
      : !!store.isDark
    const htmlDark = document.documentElement.classList.contains('dark')
    // 恢复数据前手动模式下 store 里还是默认值，不要摘掉启动时按提示打上的 .dark
    if ((auto || !bootstrapStore.isHydrating) && (dark !== !!store.isDark || dark !== htmlDark)) {
      store.setDarkMode(dark)
    }

    clearScheduleTimer()
    if (mode === APPEARANCE_MODE_SCHEDULE) {
      const wait = msUntilNextScheduleBoundary(new Date(), store.darkScheduleStart, store.darkScheduleEnd)
      // 休眠/后台节流会让长定时器漂移，最多 10 分钟复查一次
      scheduleTimer = setTimeout(apply, Math.min(wait + 500, 10 * 60 * 1000))
    }

    // 数据恢复完成前 store 里还是默认值，不能拿它覆盖上次保存的外观提示
    if (bootstrapStore.isHydrating) return
    writeHint({
      mode,
      dark,
      start: store.darkScheduleStart,
      end: store.darkScheduleEnd
    })
  }

  watch(
    () => [store.appearanceMode, store.darkScheduleStart, store.darkScheduleEnd, store.isDark, bootstrapStore.isHydrating],
    apply,
    { immediate: true }
  )

  const handleSystemChange = () => {
    if (normalizeAppearanceMode(store.appearanceMode) === APPEARANCE_MODE_SYSTEM) apply()
  }
  if (media?.addEventListener) media.addEventListener('change', handleSystemChange)
  else if (media?.addListener) media.addListener(handleSystemChange)

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') apply()
  })
}
