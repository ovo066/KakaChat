/**
 * 深浅色外观模式：
 * - manual   手动（以 isDark 为准）
 * - system   跟随系统 prefers-color-scheme
 * - schedule 定时（darkScheduleStart ~ darkScheduleEnd 之间为深色，可跨午夜）
 */

export const APPEARANCE_MODE_MANUAL = 'manual'
export const APPEARANCE_MODE_SYSTEM = 'system'
export const APPEARANCE_MODE_SCHEDULE = 'schedule'

const APPEARANCE_MODES = new Set([APPEARANCE_MODE_MANUAL, APPEARANCE_MODE_SYSTEM, APPEARANCE_MODE_SCHEDULE])
const CLOCK_TIME_RE = /^(\d{1,2}):(\d{2})$/

export const DEFAULT_DARK_SCHEDULE_START = '19:00'
export const DEFAULT_DARK_SCHEDULE_END = '07:00'

/**
 * @param {unknown} value
 * @returns {'manual'|'system'|'schedule'}
 */
export function normalizeAppearanceMode(value) {
  const mode = String(value || '').trim().toLowerCase()
  return APPEARANCE_MODES.has(mode) ? mode : APPEARANCE_MODE_MANUAL
}

/**
 * @param {unknown} mode
 * @returns {boolean}
 */
export function isAutoAppearanceMode(mode) {
  const normalized = normalizeAppearanceMode(mode)
  return normalized === APPEARANCE_MODE_SYSTEM || normalized === APPEARANCE_MODE_SCHEDULE
}

/**
 * 规范成 HH:mm，非法值返回 fallback。
 * @param {unknown} value
 * @param {string} fallback
 * @returns {string}
 */
export function normalizeClockTime(value, fallback) {
  const match = String(value || '').trim().match(CLOCK_TIME_RE)
  if (!match) return fallback
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return fallback
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function toMinutes(clock, fallback) {
  const [hours, minutes] = normalizeClockTime(clock, fallback).split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * @param {Date} date
 * @param {string} start
 * @param {string} end
 * @returns {boolean}
 */
export function isWithinDarkSchedule(date, start, end) {
  const now = date.getHours() * 60 + date.getMinutes()
  const from = toMinutes(start, DEFAULT_DARK_SCHEDULE_START)
  const to = toMinutes(end, DEFAULT_DARK_SCHEDULE_END)
  if (from === to) return false
  return from < to ? (now >= from && now < to) : (now >= from || now < to)
}

/**
 * 距离下一个定时切换点的毫秒数（至少 1 秒）。
 * @param {Date} date
 * @param {string} start
 * @param {string} end
 * @returns {number}
 */
export function msUntilNextScheduleBoundary(date, start, end) {
  const nowMs = date.getHours() * 3600000 + date.getMinutes() * 60000 + date.getSeconds() * 1000 + date.getMilliseconds()
  const boundaries = [toMinutes(start, DEFAULT_DARK_SCHEDULE_START), toMinutes(end, DEFAULT_DARK_SCHEDULE_END)]
    .map(minutes => minutes * 60000)
  const waits = boundaries.map(ms => (ms > nowMs ? ms - nowMs : ms + 86400000 - nowMs))
  return Math.max(1000, Math.min(...waits))
}

/**
 * @returns {boolean}
 */
export function systemPrefersDark() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/**
 * @param {{ mode?: unknown, isDark?: boolean, start?: string, end?: string, now?: Date, systemDark?: boolean }} options
 * @returns {boolean}
 */
export function resolveEffectiveDark({ mode, isDark = false, start, end, now = new Date(), systemDark } = {}) {
  const normalized = normalizeAppearanceMode(mode)
  if (normalized === APPEARANCE_MODE_SYSTEM) return systemDark ?? systemPrefersDark()
  if (normalized === APPEARANCE_MODE_SCHEDULE) return isWithinDarkSchedule(now, start, end)
  return !!isDark
}
