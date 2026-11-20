// 预设主题列表
export const presetThemes = [
  {
    id: 'default',
    name: '默认 (iMessage)',
    preview: {
      bg: '#fff',
      userBubble: '#007AFF',
      aiBubble: '#E9E9EB'
    },
    data: null // null 表示使用默认/重置
  },
  {
    id: 'line',
    name: 'LINE',
    preview: {
      bg: '#7494C0',
      userBubble: '#8DE055',
      aiBubble: '#FFFFFF'
    },
    data: {
      inputPlaceholder: 'Aa',
      showEmojiButton: true,
      emojiButtonPosition: 'inside',
      plusButtonPosition: 'left',
      showCameraButton: true,
      showImageButton: true,
      showMicButton: false,
      headerActions: ['video', 'search', 'list'],
      bubbleShowAvatar: true,
      bubbleTailStyle: 'line',

      primaryColor: '#06C755',
      backgroundColor: '#7494C0',
      navbarBg: 'rgba(240, 240, 240, 0.92)',
      navbarBlur: '10px',
      navbarBorder: 'rgba(0,0,0,0.1)',

      bubbleUserBg: '#8DE055',
      bubbleUserText: '#000000',
      bubbleAiBg: '#FFFFFF',
      bubbleAiText: '#000000',
      bubbleRadius: '18px',
      bubbleShadow: '0 1px 1px rgba(0,0,0,0.1)',

      inputBg: '#F3F3F3',
      inputBorder: 'transparent',
      inputRadius: '20px',

      fontFamily: "'Noto Sans JP', -apple-system, sans-serif",
      fontImport: 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap',

      customCSS: `/* LINE 主题 */

/* 聊天背景 */
.chat-messages {
  background-color: #7494C0 !important;
}

/* 头部样式 */
.chat-header {
  background: rgba(240, 240, 240, 0.92) !important;
  backdrop-filter: blur(10px) !important;
  -webkit-backdrop-filter: blur(10px) !important;
  min-height: 100px !important;
}
.chat-header-back {
  color: #000 !important;
}
.chat-header-actions {
  color: #000 !important;
}
.chat-header-avatar {
  display: none !important;
}
.chat-header-name-text {
  font-size: 17px !important;
  font-weight: 700 !important;
}
.chat-header-name-arrow {
  display: none !important;
}

/* 统一气泡尾巴与圆角，避免最后一条和中间条样式不一致 */
.bubble-user,
.bubble-user.has-tail {
  border-top-right-radius: 4px !important;
  border-bottom-right-radius: var(--bubble-radius) !important;
  margin-right: 0 !important;
  position: relative !important;
}
.bubble-ai,
.bubble-ai.has-tail {
  border-top-left-radius: 4px !important;
  border-bottom-left-radius: var(--bubble-radius) !important;
  margin-left: 0 !important;
  position: relative !important;
}

/* LINE 风格顶部尾巴 - 用户(右) */
.bubble-user::before,
.bubble-user.has-tail::before {
  content: '' !important;
  display: block !important;
  position: absolute !important;
  top: 0 !important;
  right: -6px !important;
  left: auto !important;
  bottom: auto !important;
  width: 10px !important;
  height: 12px !important;
  background-color: var(--bubble-user-bg, #8DE055) !important;
  clip-path: path('M 0 0 L 8 0 Q 4 5 0 10 Z') !important;
  -webkit-mask-image: none !important;
  mask-image: none !important;
}
.bubble-user::after,
.bubble-user.has-tail::after {
  display: none !important;
}

/* LINE 风格顶部尾巴 - AI(左) */
.bubble-ai::before,
.bubble-ai.has-tail::before {
  content: '' !important;
  display: block !important;
  position: absolute !important;
  top: 0 !important;
  left: -6px !important;
  right: auto !important;
  bottom: auto !important;
  width: 10px !important;
  height: 12px !important;
  background-color: var(--bubble-ai-bg, #FFFFFF) !important;
  clip-path: path('M 10 0 L 2 0 Q 6 5 10 10 Z') !important;
  -webkit-mask-image: none !important;
  mask-image: none !important;
}
.bubble-ai::after,
.bubble-ai.has-tail::after {
  display: none !important;
}

/* 彻底抹平 has-tail / in-group 差异，最后一条与其他条保持同形态 */
.bubble-user.in-group,
.bubble-ai.in-group {
  margin-bottom: 0 !important;
}
.bubble-user.has-tail {
  border-radius: var(--bubble-radius) !important;
  border-top-right-radius: 4px !important;
}
.bubble-ai.has-tail {
  border-radius: var(--bubble-radius) !important;
  border-top-left-radius: 4px !important;
}

/* 头像开启时贴近气泡，间距更接近原版 LINE */
.chat-message-user .avatar-right.avatar-visible {
  margin-left: 4px !important;
}
.chat-message-ai .avatar-left.avatar-visible {
  margin-right: 4px !important;
}
.chat-message-row .avatar-slot.avatar-visible {
  align-self: flex-start !important;
  margin-top: 2px !important;
}
.chat-message-row .chat-avatar {
  width: 30px !important;
  height: 30px !important;
}
.chat-message-row .avatar-slot {
  width: 30px !important;
}

/* 时间戳样式 */
.chat-timestamp {
  background: rgba(0,0,0,0.15) !important;
  color: #fff !important;
  font-size: 11px !important;
  padding: 4px 12px !important;
  border-radius: 20px !important;
  backdrop-filter: blur(4px) !important;
}

/* 消息时间/已读 - 在蓝色背景上用深色 */
.msg-meta {
  color: #3d5a73 !important;
}

/* 旁白样式 - 在蓝色背景上更清晰 */
.narration {
  background: rgba(255,255,255,0.85) !important;
  color: #333 !important;
  backdrop-filter: blur(8px) !important;
}

/* 输入区域 */
.glass-input-area {
  background: #fff !important;
  border-top: 1px solid rgba(0,0,0,0.1) !important;
}
.chat-input-field {
  background: #F3F3F3 !important;
  border: none !important;
}
.chat-input-left {
  color: #1E2329 !important;
}
.chat-input-plus,
.chat-input-camera,
.chat-input-image {
  color: #1E2329 !important;
}
.chat-input-emoji-inside {
  color: #888 !important;
}
.chat-input-mic {
  color: #1E2329 !important;
}

/* 发送按钮 LINE 风格 */
.chat-input-send-icon {
  background: #06C755 !important;
  color: #fff !important;
}

/* 还原 LINE 的裸加号图标（默认主题的加号带灰色圆底） */
.chat-input-plus {
  background: transparent !important;
}

/* 深色模式覆盖 */
.dark .chat-messages {
  background-color: #1a1a2e !important;
}
.dark .chat-header {
  background: rgba(30, 30, 30, 0.92) !important;
}
.dark .chat-header-back,
.dark .chat-header-actions,
.dark .chat-header-name-text {
  color: #fff !important;
}
.dark .msg-meta {
  color: #a0b0c0 !important;
}
.dark .narration {
  background: rgba(0,0,0,0.5) !important;
  color: #ddd !important;
}
.dark .glass-input-area {
  background: #1c1c1e !important;
}
.dark .chat-input-field {
  background: #2c2c2e !important;
}
.dark .chat-input-plus,
.dark .chat-input-camera,
.dark .chat-input-image,
.dark .chat-input-mic {
  color: #fff !important;
}`
    }
  },
  {
    id: 'pixel',
    name: '像素梦核',
    preview: {
      bg: '#E0D8EA',
      userBubble: '#FF69B4',
      aiBubble: '#00FFFF'
    },
    data: {
      primaryColor: '#FF00FF',
      backgroundColor: '#E0D8EA',
      cardBackground: '#FFFFFF',
      textPrimary: '#2D004F',
      textSecondary: '#6A4A93',
      borderColor: '#2D004F',
      bubbleUserBg: '#FF69B4',
      bubbleUserText: '#FFFFFF',
      bubbleAiBg: '#00FFFF',
      bubbleAiText: '#000000',
      bubbleRadius: '0px',
      bubbleShadow: '4px 4px 0px rgba(0,0,0,0.5)',
      bubbleBorder: '2px solid #2D004F',
      navbarBg: '#E0D8EA',
      navbarBlur: '0px',
      navbarBorder: '2px solid #2D004F',
      inputBg: '#FFFFFF',
      inputBorder: '2px solid #2D004F',
      inputRadius: '0px',
      buttonRadius: '0px',
      fontFamily: 'DotGothic16, sans-serif',
      fontImport: 'https://fonts.googleapis.com/css2?family=DotGothic16&display=swap',
      fontSize: '16px',
      globalRadius: '0px',
      headerActions: ['video'],
      customCSS: `/* 像素梦核 - 布局重构版 */

/* === 1. 全局基础 === */
* { border-radius: 0 !important; }
.glass-panel, .glass-input-area { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }

/* === 2. 聊天头部 (Header) 重构 === */
/* 容器：改为弹性布局，内容两端对齐 */
.chat-header-inner {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  padding-left: 8px !important;
  padding-right: 8px !important;
}

/* 中间区域：取消绝对定位，改为靠左排列 */
.chat-header-center {
  position: static !important;
  flex: 1 !important;
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  justify-content: flex-start !important;
  padding: 0 !important;
  margin-left: 8px !important;
  pointer-events: auto !important;
}

/* 头像：方形、加框、调整大小 */
.chat-header-avatar,
.chat-header-avatar-group {
  width: 32px !important;
  height: 32px !important;
  margin: 0 10px 0 0 !important;
  border: 2px solid #2D004F !important;
  background: #FFF !important;
  box-shadow: 2px 2px 0px rgba(0,0,0,0.2) !important;
}

/* 名字：调整字号 */
.chat-header-name-text {
  font-size: 16px !important;
  font-weight: bold !important;
}

/* 隐藏不需要的元素 */
.chat-header-subtitle { display: none !important; }
.chat-header-name-arrow { display: none !important; }
.chat-watermark { display: none; }

/* 右侧按钮区保留通话入口 */
.chat-header-actions {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
}

/* === 3. 气泡与消息 === */
/* 去除气泡小尾巴 */
.bubble::before, .bubble::after { display: none !important; }

.bubble {
  border: 2px solid #2D004F !important;
  padding: 10px 14px !important;
  image-rendering: pixelated;
}

/* 消息行头像：方形 */
.chat-avatar {
  border: 2px solid #2D004F !important;
  box-shadow: 2px 2px 0px rgba(0,0,0,0.2) !important;
}

/* === 4. 输入区与菜单 === */
/* 扩展菜单 (Plus Menu) 改为 Grid 布局 */
.chat-input-menu-left {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px !important;
  width: auto !important;
  min-width: 180px;
  background: #E0D8EA !important;
  border: 2px solid #2D004F !important;
  box-shadow: 4px 4px 0px #2D004F !important;
  padding: 10px !important;
  bottom: 70px !important;
  left: 10px !important;
}

.chat-input-menu-item {
  flex-direction: column !important;
  background: #FFF !important;
  border: 2px solid #2D004F !important;
  box-shadow: 2px 2px 0px rgba(0,0,0,0.2) !important;
  padding: 8px !important;
}
.chat-input-menu-item:active {
  transform: translate(2px, 2px);
  box-shadow: none !important;
}

/* 菜单图标去圆角 */
.chat-input-menu-icon {
  background: transparent !important;
  width: 32px !important;
  height: 32px !important;
  box-shadow: none !important;
  ring: 0 !important;
}

/* 底部输入框样式 */
.chat-input-wrapper {
  border-top: 3px solid #2D004F !important;
  background: #D4C5E8 !important;
}
.chat-input-field {
  border: 2px solid #2D004F !important;
  background: #FFF !important;
  box-shadow: inset 2px 2px 0px rgba(0,0,0,0.1) !important;
}
.chat-input-send-icon {
  background: #FF00FF !important;
  border: 2px solid #2D004F !important;
  color: #FFF !important;
  box-shadow: 2px 2px 0px #000 !important;
}
.chat-input-send-icon:active {
  transform: translate(2px, 2px);
  box-shadow: none !important;
}

/* 底部加号和表情按钮 */
.chat-input-plus, .chat-input-emoji {
  border: 1px dashed transparent;
  background: transparent !important;
}
.chat-input-plus:hover, .chat-input-emoji:hover {
  border: 1px dashed #2D004F;
  background: rgba(255,255,255,0.3);
}`
    }
  },
  {
    id: 'liquidGlass',
    name: '液态玻璃 (iOS 26)',
    preview: {
      bg: 'linear-gradient(160deg, #BFD5FF 0%, #D8CDFF 45%, #FFD6E8 100%)',
      userBubble: '#0A84FF',
      aiBubble: 'rgba(255,255,255,0.7)'
    },
    data: {
      inputPlaceholder: 'iMessage 信息',
      // 不开 showMicButton：空输入时保留灰色发送箭头（可点击=空发送催回复），
      // 麦克风会替换发送键导致空发送入口丢失
      headerActions: ['video'],
      contactCardStyle: 'ios26',

      primaryColor: '#0A84FF',
      // 应用级颜色（背景/卡片/文字/边框/导航）不在此覆盖：inline 主题变量会压过
      // .dark 的暗色变量导致深色模式失效，玻璃质感统一在 customCSS 里分深浅色实现
      bubbleUserBg: '#0A84FF',
      bubbleUserText: '#FFFFFF',
      bubbleAiBg: 'rgba(255,255,255,0.60)',
      bubbleAiText: '#000000',
      bubbleRadius: '20px',
      bubbleShadow: 'none',

      inputBg: 'transparent',
      inputBorder: 'transparent',
      inputRadius: '20px',

      buttonRadius: '16px',
      globalRadius: '18px',

      customCSS: `/* 液态玻璃 (iOS 26) —— 复刻 iOS 26 信息：全屏壁纸 / 悬浮玻璃控件 / 无边框气泡 */

/* === 玻璃材质：深浅色各一套变量，所有悬浮控件共用 === */
:root {
  --lg-fill: rgba(255,255,255,0.38);
  --lg-fill-solid: rgba(246,246,248,0.92);
  --lg-card: rgba(255,255,255,0.72);
  --lg-rim: inset 1.5px 1.5px 1px -1px rgba(255,255,255,0.95), inset -1.5px -1.5px 1px -1px rgba(255,255,255,0.70), inset 0 0 0 0.5px rgba(255,255,255,0.40), inset 0 0 16px rgba(255,255,255,0.18);
  --lg-drop: 0 6px 20px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.06);
  --lg-blur: blur(10px) saturate(1.8) brightness(1.08);
  --lg-ink: #000;
  --lg-ink-soft: rgba(60,60,67,0.62);
  --lg-scrim: rgba(255,255,255,0.45);
  --lg-badge-bg: rgba(0,0,0,0.78);
  --lg-badge-ink: #fff;
  --lg-bubble-hl: rgba(255,255,255,0.85);
  --lg-bubble-blur: blur(14px) saturate(1.8) brightness(1.06);
}
html.dark {
  --lg-fill: rgba(28,28,32,0.30);
  --lg-fill-solid: rgba(38,38,42,0.92);
  --lg-card: rgba(30,30,34,0.66);
  --lg-rim: inset 1.5px 1.5px 1px -1px rgba(255,255,255,0.60), inset -1.5px -1.5px 1px -1px rgba(255,255,255,0.30), inset 0 0 0 0.5px rgba(255,255,255,0.12), inset 0 0 16px rgba(255,255,255,0.05);
  --lg-drop: 0 8px 24px rgba(0,0,0,0.35);
  --lg-blur: blur(10px) saturate(1.6) brightness(0.82);
  --lg-ink: #fff;
  --lg-ink-soft: rgba(235,235,245,0.62);
  --lg-scrim: rgba(0,0,0,0.38);
  --lg-badge-bg: rgba(255,255,255,0.88);
  --lg-badge-ink: #000;
  /* 深色 AI 气泡：半透明灰玻璃，透出壁纸（inline 主题变量压不过 !important） */
  --lg-bubble-hl: rgba(255,255,255,0.14);
  --lg-bubble-blur: blur(14px) saturate(1.6) brightness(0.9);
  --bubble-ai-bg: rgba(52,52,56,0.58) !important;
  --bubble-ai-text: #FFFFFF !important;
}

/* === 背景：无壁纸时用柔和渐变；联系人壁纸（内联样式）仍优先 === */
.chat-view {
  background-image:
    radial-gradient(1200px 800px at 85% -10%, rgba(255,214,232,0.55), transparent 60%),
    radial-gradient(1000px 700px at -15% 30%, rgba(191,213,255,0.60), transparent 55%),
    linear-gradient(160deg, #EAF1FE 0%, #E9E4FB 50%, #FBEAF3 100%);
}
.dark .chat-view {
  background-image:
    radial-gradient(1200px 800px at 85% -10%, rgba(64,45,90,0.50), transparent 60%),
    radial-gradient(1000px 700px at -15% 30%, rgba(30,50,95,0.55), transparent 55%),
    linear-gradient(160deg, #0B0F1A 0%, #131226 55%, #1A1024 100%);
}
/* 导航悬浮不占布局，消息区从屏幕顶端开始，预留头像+名字胶囊高度 */
.chat-messages {
  background-color: transparent !important;
  padding-top: calc(var(--app-pt, 0px) + 88px) !important;
}
.chat-view:has(> .chat-header.is-group) .chat-messages {
  padding-top: calc(var(--app-pt, 0px) + 104px) !important;
}
/* 消息区延伸到输入栏下方：壁纸铺满全屏、气泡从悬浮输入框下滑过。
   回复条/图片预览/群成员栏出现时（输入框不再紧跟消息区）自动退回普通布局；
   不支持 :has() 的旧内核同样退回普通布局 */
.chat-view > div:has(> .chat-messages):has(+ .chat-input-wrapper) {
  margin-bottom: calc(-48px - var(--app-pb, 0px));
}
.chat-view > div:has(> .chat-messages):has(+ .chat-input-wrapper) > .chat-messages {
  padding-bottom: calc(58px + var(--app-pb, 0px)) !important;
}
.chat-view > div:has(> .chat-messages):has(+ .chat-input-wrapper) > button {
  bottom: calc(60px + var(--app-pb, 0px)) !important;
}
.chat-input-wrapper { position: relative; z-index: 20; }

/* === 全局玻璃面板（信息列表等非聊天页头部） === */
.glass-panel:not(.chat-header) {
  background-color: rgba(255,255,255,0.60) !important;
  backdrop-filter: blur(24px) saturate(1.5) !important;
  -webkit-backdrop-filter: blur(24px) saturate(1.5) !important;
}
.dark .glass-panel:not(.chat-header) {
  background-color: rgba(22,27,38,0.68) !important;
  border-bottom-color: rgba(255,255,255,0.08) !important;
}

/* === 悬浮玻璃控件：返回 / 名字胶囊 / 视频 / 加号 / 输入框 === */
.chat-header-back,
.chat-header-action,
.chat-header-name,
.chat-input-plus,
.chat-input-field {
  background: var(--lg-fill) !important;
  border: none !important;
  box-shadow: var(--lg-rim), var(--lg-drop) !important;
  backdrop-filter: var(--lg-blur) !important;
  -webkit-backdrop-filter: var(--lg-blur) !important;
}
.chat-header-back:active,
.chat-header-action:active,
.chat-input-plus:active {
  transform: scale(0.92);
}
/* 无模糊时（键盘弹起的性能降级 / 不支持 backdrop-filter）换更实的底色保证可读 */
:root.keyboard-open .chat-header-back,
:root.keyboard-open .chat-header-action,
:root.keyboard-open .chat-header-name,
:root.keyboard-open .chat-input-plus,
:root.keyboard-open .chat-input-field {
  background: var(--lg-fill-solid) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .chat-header-back,
  .chat-header-action,
  .chat-header-name,
  .chat-input-plus,
  .chat-input-field {
    background: var(--lg-fill-solid) !important;
  }
}

/* === 顶部导航：导航条本体透明，只留悬浮控件 === */
.chat-header {
  position: absolute !important;
  top: 0 !important; left: 0 !important; right: 0 !important;
  background: transparent !important;
  border-bottom: none !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  min-height: 0 !important;
  pointer-events: none !important;
}
/* 滚动边缘：消息滑入导航区时渐隐，控件始终清晰 */
.chat-header::before {
  content: "";
  position: absolute;
  top: 0; left: 0; right: 0;
  height: calc(var(--app-pt, 0px) + 96px);
  background: linear-gradient(to bottom, var(--lg-scrim), transparent);
  pointer-events: none;
  z-index: -1;
}
.chat-header .chat-header-inner {
  align-items: flex-start !important;
  padding: calc(var(--app-pt, 0px) + 4px) 14px 0 !important;
}
/* 返回：圆形玻璃钮，有未读时伸长成胶囊 */
.chat-header-back {
  pointer-events: auto !important;
  height: 44px;
  min-width: 44px;
  justify-content: center;
  gap: 5px;
  padding: 0 10px 0 8px !important;
  border-radius: 999px;
  color: var(--lg-ink) !important;
  transition: transform 0.2s ease, opacity 0.2s ease !important;
}
.chat-header-back > i { font-size: 22px !important; }
.chat-header-badge {
  margin-left: 0 !important;
  min-width: 22px !important;
  height: 22px !important;
  padding: 0 6px !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  background: var(--lg-badge-bg) !important;
  color: var(--lg-badge-ink) !important;
  box-shadow: none !important;
}
/* 中间：大头像 + 下方名字玻璃胶囊 */
.chat-header-center {
  pointer-events: auto !important;
  position: absolute !important;
  inset: auto !important;
  top: calc(var(--app-pt, 0px) + 2px) !important;
  left: 50% !important;
  transform: translateX(-50%);
  width: max-content;
  max-width: 58%;
  padding: 0 !important;
}
.chat-header-avatar {
  width: 54px !important;
  height: 54px !important;
  margin-bottom: -5px !important;
  position: relative;
  z-index: 1;
  font-size: 28px;
  box-shadow: 0 4px 14px rgba(0,0,0,0.18) !important;
}
.chat-header-name {
  opacity: 1 !important;
  max-width: 100%;
  padding: 7px 13px 4px;
  border-radius: 999px;
}
.chat-header-name-text {
  font-size: 14px !important;
  font-weight: 600 !important;
  letter-spacing: 0 !important;
  color: var(--lg-ink) !important;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.chat-header-name-arrow { display: none !important; }
.chat-header-subtitle {
  margin-top: 4px !important;
  opacity: 1 !important;
  font-weight: 500;
  color: var(--lg-ink-soft) !important;
}
/* 右侧：圆形玻璃钮 */
.chat-header-actions {
  pointer-events: auto !important;
  gap: 10px !important;
  padding-right: 0 !important;
  color: var(--lg-ink) !important;
}
.chat-header-action {
  width: 44px !important;
  height: 44px !important;
  border-radius: 999px !important;
  transition: transform 0.2s ease !important;
}
.chat-header-action > i { font-size: 22px !important; }

/* === 气泡 === */
.bubble { border: none !important; }
/* 用户气泡：iMessage 蓝 + 顶部釉面柔光（渐变在下部收成纯色，与尾巴无缝） */
.bubble-user {
  background-image: linear-gradient(180deg, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0.08) 40%, rgba(255,255,255,0) 72%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.40) !important;
}
/* AI 气泡：磨砂玻璃。底色+模糊放在 ::after 底板上，尾巴 ::before 同样模糊，
   两块互不重叠，拼起来是一整块玻璃 */
.bubble-ai {
  background-color: transparent !important;
  box-shadow: none !important;
}
.bubble-ai::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  background-color: var(--bubble-ai-bg);
  box-shadow: inset 0 1px 0 var(--lg-bubble-hl);
  backdrop-filter: var(--lg-bubble-blur);
  -webkit-backdrop-filter: var(--lg-bubble-blur);
}
/* 新消息入场动画的 will-change: opacity 会截断模糊取景，玻璃气泡上关掉 */
.bubble-ai.bubble-appear { will-change: transform; }
/* 长按聚焦的克隆气泡会隐藏 ::after，给回实底 */
.focused-bubble-wrapper .bubble-ai { background-color: var(--bubble-ai-bg) !important; }
/* 尾巴与默认主题同形，直接给它同样的磨砂 */
.bubble-ai.has-tail::before {
  backdrop-filter: var(--lg-bubble-blur);
  -webkit-backdrop-filter: var(--lg-bubble-blur);
}
/* 引用缩略气泡（在回复气泡上方）：一片薄玻璃 */
.reply-context {
  background: rgba(255,255,255,0.42);
  border-color: rgba(255,255,255,0.72);
  backdrop-filter: blur(12px) saturate(1.6);
  -webkit-backdrop-filter: blur(12px) saturate(1.6);
}
.dark .reply-context {
  background: rgba(44,44,48,0.45);
  border-color: rgba(255,255,255,0.14);
}
/* 支持 shape() 的内核：底板向下多铺 8px，按默认主题的尾巴形状把圆角气泡+尾巴裁成
   同一块玻璃——分成两片时尾巴与圆角重叠处半透明会叠深、拼缝处还有细线；尾巴 ::before 退场 */
@supports (clip-path: shape(from 0 0, line to 1px 1px)) {
  .bubble-ai.has-tail::after {
    bottom: -8px;
    border-radius: 0;
    clip-path: shape(from 20px 0, arc to 0 20px of 20px, vline to calc(100% - 28px),
      arc to 8.64px calc(100% - 11.54px) of 20px,
      curve to 10.45px calc(100% - 7.33px) with 9.93px calc(100% - 10.64px) / 10.51px calc(100% - 9.01px),
      curve to 8.37px calc(100% - 2.55px) with 10.39px calc(100% - 5.08px) / 8.37px calc(100% - 3.62px),
      curve to 9.55px calc(100% - 0.75px) with 8.37px calc(100% - 1.71px) / 8.93px calc(100% - 0.75px),
      curve to 11.12px calc(100% - 1.88px) with 10.11px calc(100% - 0.75px) / 10.56px calc(100% - 1.48px),
      curve to 20px calc(100% - 7.49px) with 14.16px calc(100% - 3.56px) / 17.19px calc(100% - 5.53px),
      curve to 21.8px calc(100% - 8px) with 20.56px calc(100% - 7.83px) / 21.01px calc(100% - 8px),
      hline to calc(100% - 20px), arc to 100% calc(100% - 28px) of 20px,
      vline to 20px, arc to calc(100% - 20px) 0 of 20px, close);
  }
  .bubble-ai.has-tail::before { display: none; }
}
/* 键盘弹起时停掉气泡模糊（安卓键盘动画掉帧），不支持模糊时换实底 */
:root.keyboard-open .bubble-ai::after,
:root.keyboard-open .bubble-ai.has-tail::before {
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  :root { --bubble-ai-bg: rgba(236,236,240,0.95) !important; }
  html.dark { --bubble-ai-bg: rgba(52,52,56,0.95) !important; }
}

/* === 时间戳 / 已送达：iOS 26 是纯文字，不加底板 === */
.chat-timestamp {
  font-size: 12px !important;
  font-weight: 500 !important;
  margin: 14px 0 8px !important;
  color: var(--lg-ink-soft) !important;
}
.msg-meta {
  font-weight: 600 !important;
  color: var(--lg-ink-soft) !important;
}
.chat-sender-name { color: var(--lg-ink-soft) !important; }
/* 有壁纸时文字改白色 + 阴影，任何壁纸上都看得清 */
.chat-messages[style*="background-image"] .chat-timestamp,
.chat-messages[style*="background-image"] .msg-meta,
.chat-messages[style*="background-image"] .chat-sender-name {
  color: rgba(255,255,255,0.92) !important;
  text-shadow: 0 1px 3px rgba(0,0,0,0.45);
}

/* === 旁白：轻玻璃卡片（数量多，不用 backdrop-filter） === */
.narration {
  background: var(--lg-card) !important;
  border: none !important;
  border-radius: 16px !important;
  box-shadow: var(--lg-rim) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  color: var(--lg-ink-soft) !important;
}

/* === 输入区：底栏透明，加号与输入框各自悬浮 === */
.glass-input-area {
  background: linear-gradient(to top, var(--lg-scrim), transparent) !important;
  border-top: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  padding-left: 14px !important;
  padding-right: 14px !important;
  gap: 10px !important;
}
.chat-input-plus {
  width: 40px !important;
  height: 40px !important;
  margin-bottom: 0 !important;
  color: var(--lg-ink) !important;
  transition: transform 0.2s ease !important;
}
.chat-input-plus > i { font-size: 20px !important; }
.chat-input-field {
  min-height: 40px;
  border-radius: 20px !important;
  padding-top: 8px !important;
  padding-bottom: 8px !important;
  padding-left: 16px !important;
}
.chat-input-send {
  right: 5px !important;
  bottom: 5px !important;
}
.chat-input-textarea::placeholder {
  color: var(--lg-ink-soft) !important;
  opacity: 1 !important;
}
/* 发送键：iMessage 蓝；空输入置灰但常驻可点（空发送 = 让 AI 回复） */
.chat-input-send-icon {
  background: #0A84FF !important;
  box-shadow: none !important;
}
.chat-input-field:has(.chat-input-textarea:placeholder-shown) .chat-input-send-icon {
  background: rgba(120,120,128,0.24) !important;
  color: var(--lg-ink-soft) !important;
}
.dark .chat-input-field:has(.chat-input-textarea:placeholder-shown) .chat-input-send-icon {
  background: rgba(235,235,245,0.16) !important;
}

/* 回到底部按钮 */
.chat-messages ~ button {
  background: var(--lg-fill-solid) !important;
  border: none !important;
  box-shadow: var(--lg-rim), var(--lg-drop) !important;
}

/* === 卡片：iOS 26 信息里的分享卡片都是大圆角、无描边、柔和投影 === */
html {
  --lg-sheet: rgba(255,255,255,0.80);
  --lg-sheet-2: rgba(236,236,241,0.94);
  --lg-map: #EFEAE1;
  --lg-map-road: #FFFFFF;
  --lg-map-park: #CFE6C2;
  --lg-map-water: #BBD7F2;
  --lg-card-drop: 0 6px 22px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.05);
}
html.dark {
  --lg-sheet: rgba(44,44,48,0.78);
  --lg-sheet-2: rgba(44,44,48,0.92);
  --lg-map: #2A2C30;
  --lg-map-road: #44474D;
  --lg-map-park: #29402C;
  --lg-map-water: #1F3550;
  --lg-card-drop: 0 6px 22px rgba(0,0,0,0.35);
}

/* 图片：单张圆角加大；多张的拼贴/叠放与保存按钮用玻璃 */
.chat-messages .chat-image-single { border-radius: 22px !important; }
.chat-messages .chat-album-save {
  background: var(--lg-fill) !important;
  box-shadow: var(--lg-rim), var(--lg-drop);
  backdrop-filter: var(--lg-blur);
  -webkit-backdrop-filter: var(--lg-blur);
}
.chat-messages .chat-album-count { color: #0A84FF; }
.chat-messages[style*="background-image"] .chat-album-count {
  color: #fff;
  text-shadow: 0 1px 3px rgba(0,0,0,0.45);
}

/* 音乐：仿 Apple Music 分享卡片——底色取自封面，右侧红色播放键 */
.chat-view .chat-messages .music-card-wrap { max-width: 286px; }
.chat-view .chat-messages .music-card {
  background: var(--music-tint, #3A2A26);
  border: none;
  border-radius: 22px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.12), var(--lg-card-drop);
}
.chat-view .chat-messages .music-card-body {
  align-items: center;
  gap: 12px;
  padding: 11px 12px 11px 11px;
}
.chat-view .chat-messages .music-card-thumb {
  width: 64px;
  height: 64px;
  border-radius: 9px;
}
.chat-view .chat-messages .music-card-play-overlay,
.chat-view .chat-messages .music-card-footer { display: none; }
.chat-view .chat-messages .music-card-title {
  color: #fff;
  font-size: 16px;
  margin-bottom: 1px;
}
.chat-view .chat-messages .music-card-artist {
  color: rgba(255,255,255,0.84);
  font-size: 14px;
}
.chat-view .chat-messages .music-card-source {
  display: flex;
  align-items: center;
  gap: 3px;
  margin-top: 3px;
  font-size: 13px;
  font-weight: 500;
  color: rgba(255,255,255,0.58);
}
.chat-view .chat-messages .music-card-cta {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  font-size: 16px;
  color: #fff;
  background: #FA2D48;
  box-shadow: 0 3px 10px rgba(250,45,72,0.35);
}

/* 见面邀请：仿地图位置卡片——上半截地图 + 定位针，下半截地址 */
.chat-view .meet-card {
  width: 264px;
  padding: 0 0 13px;
  gap: 2px;
  border: none;
  border-radius: 22px;
  color: var(--lg-ink);
  background: var(--lg-sheet-2);
  box-shadow: var(--lg-card-drop);
}
.chat-view .meet-card::before {
  content: "";
  display: block;
  height: 138px;
  margin-bottom: 10px;
  background:
    radial-gradient(circle at 50% 40%, rgba(10,132,255,0.16) 0 30px, transparent 31px),
    radial-gradient(70px 46px at 18% 22%, var(--lg-map-park) 0 97%, transparent 100%),
    radial-gradient(90px 60px at 96% 96%, var(--lg-map-water) 0 97%, transparent 100%),
    linear-gradient(24deg, transparent 46%, var(--lg-map-road) 46% 50.5%, transparent 50.5%),
    linear-gradient(-64deg, transparent 60%, var(--lg-map-road) 60% 63%, transparent 63%),
    linear-gradient(90deg, transparent 74%, #F7C873 74% 76%, transparent 76%),
    repeating-linear-gradient(116deg, transparent 0 24px, var(--lg-map-road) 24px 25.5px),
    repeating-linear-gradient(26deg, transparent 0 30px, var(--lg-map-road) 30px 31px),
    var(--lg-map);
}
.chat-view .meet-card-header {
  position: absolute;
  top: 26px;
  left: 50%;
  transform: translateX(-50%);
  flex-direction: column;
  gap: 4px;
  margin: 0;
}
.chat-view .meet-card .meet-card-icon {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: #fff;
  background: #FF3B30;
  box-shadow: 0 0 0 3px #fff, 0 5px 12px rgba(0,0,0,0.25);
}
.chat-view .meet-card-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0;
  opacity: 1;
  color: #1C1C1E;
  white-space: nowrap;
  text-shadow: 0 0 3px #fff, 0 0 3px #fff, 0 0 3px #fff;
}
.dark .chat-view .meet-card-title {
  color: #fff;
  text-shadow: 0 0 3px #000, 0 0 3px #000;
}
.chat-view .meet-card-location,
.chat-view .meet-card-time,
.chat-view .meet-card-note,
.chat-view .meet-card-footer { padding: 0 16px; }
.chat-view .meet-card-location { font-size: 17px; font-weight: 600; }
.chat-view .meet-card-time,
.chat-view .meet-card-note {
  font-size: 15px;
  line-height: 1.35;
  opacity: 1;
  color: var(--lg-ink-soft);
}
.chat-view .meet-card-divider { display: none; }
.chat-view .meet-card-footer {
  margin-top: 6px;
  justify-content: flex-start;
  font-size: 12px;
}
.chat-view .meet-card-user .interaction-status { color: var(--lg-ink-soft); }

/* 转账：深色现金卡，金额用大号无衬线字 */
.chat-view .transfer-card {
  width: 244px;
  align-items: flex-start;
  gap: 4px;
  padding: 18px 18px 14px;
  border: none;
  border-radius: 22px;
  color: #fff;
  background:
    radial-gradient(130% 100% at 0% 0%, rgba(255,255,255,0.16) 0%, transparent 55%),
    linear-gradient(160deg, #2C2C2E 0%, #111113 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.16), var(--lg-card-drop);
}
.chat-view .transfer-card-accent { display: none; }
.chat-view .transfer-card-label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  opacity: 0.66;
}
.chat-view .transfer-card .transfer-card-amount {
  font-family: inherit;
  font-size: 38px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #fff !important;
}
.chat-view .transfer-card-amount .currency { font-size: 22px; font-weight: 600; opacity: 0.8; }
.chat-view .transfer-card-note { text-align: left; font-size: 14px; opacity: 0.72; }
.chat-view .transfer-card-divider { background: #fff; opacity: 0.14; }
.chat-view .transfer-card-footer { font-size: 11px; opacity: 0.66; letter-spacing: 0; }

/* 连着发的几张卡片之间留一点缝 */
.chat-view .chat-messages .music-card-wrap,
.chat-view .meet-card,
.chat-view .transfer-card,
.chat-view .gift-card { margin-top: 3px; margin-bottom: 3px; }

/* 礼物 / 文件 / 通话：一片轻玻璃 */
.chat-view .gift-card,
.chat-view .chat-file-card,
.chat-view .call-bubble-ai,
.chat-view .call-record-card {
  border: none !important;
  border-radius: 22px !important;
  background: var(--lg-sheet) !important;
  box-shadow: var(--lg-rim), var(--lg-card-drop) !important;
}
.chat-view .gift-card-image,
.chat-view .gift-card-body { background: transparent; }
.chat-view .call-bubble-user {
  border: none;
  border-radius: 22px;
  background: #0A84FF;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.35), var(--lg-card-drop);
}

/* 语音：AI 侧与气泡同一片玻璃，用户侧 iMessage 蓝 */
.chat-view .voice-bubble { border: none; border-radius: 22px; }
.chat-view .voice-bubble-user {
  background: #0A84FF;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.35);
}
.chat-view .voice-bubble-ai {
  background: var(--bubble-ai-bg);
  box-shadow: inset 0 1px 0 var(--lg-bubble-hl);
  backdrop-filter: var(--lg-bubble-blur);
  -webkit-backdrop-filter: var(--lg-bubble-blur);
}
:root.keyboard-open .chat-view .voice-bubble-ai,
:root.keyboard-open .chat-messages .chat-album-save {
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

/* 移动端：非聊天页的整条玻璃面板改实底（大面积模糊最吃 GPU）；
   聊天页的悬浮控件面积小，保留模糊 */
@media (hover: none) and (pointer: coarse) {
  .glass-panel:not(.chat-header) {
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    background-color: rgba(255,255,255,0.92) !important;
  }
  .dark .glass-panel:not(.chat-header) { background-color: rgba(22,27,38,0.94) !important; }
}`
    }
  }
]

export default presetThemes
