import { toLocalDateKey } from '../../utils/dateKey'

const DAY_MS = 864e5
const WEEK_SHORT = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function keyToUtc(key) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ''))
  if (!m) return NaN
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

/** 两个 YYYY-MM-DD 之间差几天（b - a） */
export function daysBetweenKeys(a, b) {
  const da = keyToUtc(a)
  const db = keyToUtc(b)
  if (!Number.isFinite(da) || !Number.isFinite(db)) return NaN
  return Math.round((db - da) / DAY_MS)
}

export function todayKey(ts = Date.now()) {
  return toLocalDateKey(new Date(ts))
}

export function isDateKey(value) {
  return Number.isFinite(keyToUtc(value))
}

/** '2026-10-18' → '10 月 18 日 · 周六' */
export function describeDateKey(key) {
  const utc = keyToUtc(key)
  if (!Number.isFinite(utc)) return ''
  const d = new Date(utc)
  return `${d.getUTCMonth() + 1} 月 ${d.getUTCDate()} 日 · ${WEEK_SHORT[d.getUTCDay()]}`
}
