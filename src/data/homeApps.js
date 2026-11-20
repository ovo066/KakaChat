export const DESKTOP_APPS = [
  {
    key: 'messages',
    label: '消息',
    route: '/messages',
    icon: 'ph-fill ph-chat-circle-dots',
    paperBackground: '#BFD8C2',
    duoIcon: 'ph-duotone ph-chat-circle-dots',
    previewBackground: 'linear-gradient(180deg, #34C759 0%, #1FA447 100%)'
  },
  {
    key: 'persona',
    label: '面具',
    route: '/persona',
    icon: 'ph-fill ph-mask-happy',
    paperBackground: '#D8C8E6',
    duoIcon: 'ph-duotone ph-mask-happy',
    previewBackground: 'linear-gradient(180deg, #AF52DE 0%, #8944AB 100%)'
  },
  {
    key: 'settings',
    label: '设置',
    route: '/settings',
    icon: 'ph-fill ph-gear',
    paperBackground: '#D9D3C7',
    duoIcon: 'ph-duotone ph-gear-six',
    previewBackground: 'linear-gradient(180deg, #A1A1A6 0%, #636366 100%)'
  },
  {
    key: 'debugLogs',
    label: '日志',
    route: '/debug-logs',
    icon: 'ph-fill ph-terminal-window',
    paperBackground: '#C6D7E0',
    duoIcon: 'ph-duotone ph-terminal-window',
    previewBackground: 'linear-gradient(180deg, #38BDF8 0%, #0284C7 100%)'
  },
  {
    key: 'lorebook',
    label: '世界书',
    route: '/lorebook',
    icon: 'ph-fill ph-book-open',
    paperBackground: '#E7D4AE',
    duoIcon: 'ph-duotone ph-book-open-text',
    previewBackground: 'linear-gradient(180deg, #FF9500 0%, #FF6B00 100%)'
  },
  {
    key: 'forum',
    label: '动态',
    route: '/moments',
    icon: 'ph-fill ph-shooting-star',
    paperBackground: '#F1C8B8',
    duoIcon: 'ph-duotone ph-shooting-star',
    previewBackground: 'linear-gradient(180deg, #8E8E93 0%, #636366 100%)'
  },
  {
    key: 'theme',
    label: '美化',
    route: '/theme',
    icon: 'ph-fill ph-paint-brush',
    paperBackground: '#F0C3CC',
    duoIcon: 'ph-duotone ph-paint-brush-household',
    previewBackground: 'linear-gradient(180deg, #FF2D55 0%, #D91A45 100%)'
  },
  {
    key: 'album',
    label: '相册',
    route: '/album',
    icon: 'ph-fill ph-images-square',
    paperBackground: '#E9CDA8',
    duoIcon: 'ph-duotone ph-images-square',
    previewBackground: 'linear-gradient(180deg, #FFB340 0%, #FF7A00 100%)'
  },
  {
    key: 'meet',
    label: '见面',
    route: '/meet',
    icon: 'ph-fill ph-heart',
    paperBackground: '#EBB8B6',
    duoIcon: 'ph-duotone ph-heart',
    previewBackground: 'linear-gradient(180deg, #FF5D8F 0%, #E23370 100%)'
  },
  {
    key: 'planner',
    label: '日程',
    route: '/planner',
    icon: 'ph-fill ph-calendar-check',
    paperBackground: '#C8D3EC',
    duoIcon: 'ph-duotone ph-calendar-check',
    previewBackground: 'linear-gradient(180deg, #FFB6B9 0%, #FF8A8F 100%)'
  },
  {
    key: 'favorites',
    label: '收藏',
    route: '/favorites',
    icon: 'ph-fill ph-star',
    paperBackground: '#F2DE97',
    duoIcon: 'ph-duotone ph-star',
    previewBackground: 'linear-gradient(180deg, #FFD95A 0%, #FFB300 100%)'
  },
  {
    key: 'games',
    label: '游戏',
    route: '/games',
    icon: 'ph-fill ph-game-controller',
    paperBackground: '#BFD3D6',
    duoIcon: 'ph-duotone ph-game-controller',
    previewBackground: 'linear-gradient(180deg, #3E7C82 0%, #183B47 100%)'
  }
]

export const DESKTOP_APP_KEYS = DESKTOP_APPS.map((app) => app.key)
