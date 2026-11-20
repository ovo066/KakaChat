import { describe, expect, it } from 'vitest'
import {
  isWithinDarkSchedule,
  msUntilNextScheduleBoundary,
  normalizeAppearanceMode,
  normalizeClockTime,
  resolveEffectiveDark
} from './appearance'

function at(hours, minutes = 0) {
  const date = new Date(2026, 9, 30, hours, minutes, 0, 0)
  return date
}

describe('appearance helpers', () => {
  it('normalizes modes and clock times', () => {
    expect(normalizeAppearanceMode('SYSTEM')).toBe('system')
    expect(normalizeAppearanceMode('bogus')).toBe('manual')
    expect(normalizeClockTime('7:05', '19:00')).toBe('07:05')
    expect(normalizeClockTime('25:00', '19:00')).toBe('19:00')
  })

  it('handles dark windows across midnight', () => {
    expect(isWithinDarkSchedule(at(23), '19:00', '07:00')).toBe(true)
    expect(isWithinDarkSchedule(at(6, 59), '19:00', '07:00')).toBe(true)
    expect(isWithinDarkSchedule(at(7), '19:00', '07:00')).toBe(false)
    expect(isWithinDarkSchedule(at(12), '19:00', '07:00')).toBe(false)
  })

  it('handles same-day dark windows', () => {
    expect(isWithinDarkSchedule(at(13), '12:00', '14:00')).toBe(true)
    expect(isWithinDarkSchedule(at(15), '12:00', '14:00')).toBe(false)
  })

  it('computes the wait until the next switch', () => {
    expect(msUntilNextScheduleBoundary(at(18, 30), '19:00', '07:00')).toBe(30 * 60 * 1000)
    expect(msUntilNextScheduleBoundary(at(20), '19:00', '07:00')).toBe(11 * 3600 * 1000)
  })

  it('resolves the effective dark state per mode', () => {
    expect(resolveEffectiveDark({ mode: 'manual', isDark: true })).toBe(true)
    expect(resolveEffectiveDark({ mode: 'system', systemDark: true })).toBe(true)
    expect(resolveEffectiveDark({ mode: 'system', systemDark: false, isDark: true })).toBe(false)
    expect(resolveEffectiveDark({ mode: 'schedule', start: '19:00', end: '07:00', now: at(22) })).toBe(true)
  })
})
