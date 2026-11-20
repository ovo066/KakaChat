export const gamesRoutes = [
  {
    path: '/games',
    name: 'games',
    component: () => import('./views/GamesLobbyView.vue')
  },
  {
    path: '/games/soup',
    name: 'games-soup',
    component: () => import('./views/SoupPickerView.vue')
  },
  {
    path: '/games/soup/:id',
    name: 'games-soup-play',
    component: () => import('./views/SoupPlayView.vue')
  }
]
