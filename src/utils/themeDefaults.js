import { DESKTOP_APP_KEYS } from '../data/homeApps'

const THEME_COLOR_KEYS = [
  'primaryColor',
  'backgroundColor',
  'cardBackground',
  'textPrimary',
  'textSecondary',
  'borderColor',
  'darkBackgroundColor',
  'darkCardBackground',
  'darkTextPrimary',
  'darkTextSecondary',
  'darkBorderColor'
]

const THEME_BUBBLE_KEYS = [
  'bubbleUserBg',
  'bubbleUserText',
  'bubbleAiBg',
  'bubbleAiText',
  'bubbleRadius',
  'bubbleShadow',
  'bubbleBorder'
]

const THEME_LAYOUT_KEYS = [
  'navbarBg',
  'navbarBlur',
  'navbarBorder',
  'inputBg',
  'inputBorder',
  'inputRadius',
  'buttonRadius',
  'fontFamily',
  'fontImport',
  'fontSize',
  'globalRadius',
  'customCSS'
]

const THEME_CHAT_UI_KEYS = [
  'inputPlaceholder',
  'inputLayout',
  'sendButtonStyle',
  'sendButtonText',
  'emojiButtonPosition',
  'plusButtonPosition',
  'mockImagePlaceholder',
  'headerStyle',
  'headerAvatarPosition',
  'lockScreenUnlockMode',
  'bubbleTailStyle',
  // 'ios26'：点聊天顶部的头像/名字先打开 iOS 26 联系人卡片
  'contactCardStyle',
  'timestampPosition',
  'homePaper'
]

export const THEME_STRING_KEYS = [
  ...THEME_COLOR_KEYS,
  ...THEME_BUBBLE_KEYS,
  ...THEME_LAYOUT_KEYS,
  ...THEME_CHAT_UI_KEYS
]

export const THEME_ARRAY_DEFAULTS = {
  headerActions: []
}

export const THEME_BOOLEAN_DEFAULTS = {
  showEmojiButton: false,
  showCameraButton: false,
  showImageButton: false,
  showMicButton: false,
  bubbleShowAvatar: false,
  showPhoneStatusBar: true,
  // 常驻显示顶部灵动岛；关闭时只在通知/音乐等活动时出现
  showDynamicIsland: false
}

export function createDefaultThemeAppIcons() {
  return Object.fromEntries(DESKTOP_APP_KEYS.map((key) => [key, null]))
}

export function createDefaultThemeState() {
  const theme = Object.fromEntries(THEME_STRING_KEYS.map((key) => [key, '']))

  Object.entries(THEME_ARRAY_DEFAULTS).forEach(([key, fallback]) => {
    theme[key] = [...fallback]
  })

  Object.entries(THEME_BOOLEAN_DEFAULTS).forEach(([key, fallback]) => {
    theme[key] = fallback
  })

  theme.appIcons = createDefaultThemeAppIcons()
  return theme
}

// Keys that represent user preferences rather than visual theme properties.
// When applying a preset/theme that omits these, the existing value is preserved.
const THEME_PRESERVE_KEYS = new Set(['lockScreenUnlockMode', 'homePaper'])
const THEME_PRESERVE_BOOLEAN_KEYS = new Set(['showDynamicIsland'])

export function applyThemeFieldDefaults(target, data = {}) {
  const source = data && typeof data === 'object' ? data : {}

  THEME_STRING_KEYS.forEach((key) => {
    if (source[key] !== undefined) {
      target[key] = source[key]
    } else if (THEME_PRESERVE_KEYS.has(key) && target[key]) {
      // preserve existing user preference
    } else {
      target[key] = ''
    }
  })

  Object.entries(THEME_ARRAY_DEFAULTS).forEach(([key, fallback]) => {
    target[key] = Array.isArray(source[key]) ? [...source[key]] : [...fallback]
  })

  Object.entries(THEME_BOOLEAN_DEFAULTS).forEach(([key, fallback]) => {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      target[key] = !!source[key]
      return
    }
    if (THEME_PRESERVE_BOOLEAN_KEYS.has(key) && typeof target[key] === 'boolean') return
    target[key] = fallback
  })
}

/**
 * 当前是否是 iOS 26（液态玻璃）主题：联系人卡片、音乐卡片取色等只在这个主题里启用。
 * 旧版本套用的液态玻璃主题没有 contactCardStyle 字段，按主题 id 兜底。
 * @param {{ theme?: { contactCardStyle?: string }, activeThemeId?: string }} settingsStore
 */
export function isIos26ThemeActive(settingsStore) {
  return settingsStore?.theme?.contactCardStyle === 'ios26' || settingsStore?.activeThemeId === 'preset_liquidGlass'
}
