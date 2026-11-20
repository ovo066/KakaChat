export const appRoutes = [
  {
    path: '/settings',
    name: 'settings',
    component: () => import('../../views/SettingsView.vue')
  },
  {
    path: '/settings/storage',
    name: 'storage-analysis',
    component: () => import('../../views/StorageAnalysisView.vue')
  },
  {
    path: '/debug-logs',
    name: 'debug-logs',
    component: () => import('../../views/DebugLogView.vue')
  },
  {
    path: '/lorebook',
    name: 'lorebook',
    component: () => import('../../views/LorebookView.vue')
  },
  {
    path: '/lorebook/:bookId',
    name: 'lorebook-entries',
    component: () => import('../../views/LorebookView.vue')
  },
  {
    path: '/persona',
    name: 'persona',
    component: () => import('../../views/PersonaView.vue')
  },
  {
    path: '/theme',
    name: 'theme',
    component: () => import('../../views/ThemeView.vue')
  },
  // --- 相册 ---
  {
    path: '/album',
    name: 'album',
    component: () => import('../../views/AlbumView.vue')
  },
  // --- 收藏 ---
  {
    path: '/favorites',
    name: 'favorites',
    component: () => import('../../views/FavoritesView.vue')
  }
]
