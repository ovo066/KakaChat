import { beforeEach, describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useContactsStore } from '../../../stores/contacts'
import { useMomentsStore } from '../../../stores/moments'
import { usePlannerStore } from '../../../stores/planner'
import { toLocalDateKey } from '../../../utils/dateKey'
import { HOME_WIDGET_CATALOG, createDefaultHomeLayout, getDefaultWidgetConfig } from '../homeLayout'
import HomeWidget from './HomeWidget.vue'

let pinia

async function render(item, extra = {}) {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { render: () => null } }] })
  const app = createSSRApp({ render: () => h(HomeWidget, { item, ...extra }) })
  app.use(pinia)
  app.use(router)
  return renderToString(app)
}

function seed() {
  const now = Date.now()
  useContactsStore().contacts = [{
    id: 'c1',
    name: '沈遥',
    type: 'single',
    avatar: '遥',
    unreadCount: 2,
    msgs: [
      { id: 'm1', role: 'user', content: '在干嘛', time: now - 60000 },
      { id: 'm2', role: 'assistant', content: '在店里擦杯子。', time: now - 30000, favoritePartIndexes: [0] }
    ]
  }]
  useMomentsStore().addMoment({ content: '楼下的胖橘', authorId: 'c1', authorName: '沈遥', images: [] })
  const planner = usePlannerStore()
  planner.addEvent({ title: '买一把伞', startDate: toLocalDateKey() })
  planner.setCharacterSchedule('c1', toLocalDateKey(), {
    slots: [
      { startTime: '00:00', endTime: '12:00', activity: '图书馆还书', interruptible: true },
      { startTime: '12:00', endTime: '23:59', activity: '咖啡店打工', interruptible: false }
    ]
  })
}

describe('HomeWidget', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('renders every catalog widget with empty stores', async () => {
    for (const entry of HOME_WIDGET_CATALOG) {
      const html = await render({ id: 'w', type: entry.type, size: entry.size, config: getDefaultWidgetConfig(entry.type) })
      expect(html, entry.type).not.toBe('<!---->')
    }
  })

  it('renders real data into the companion-driven widgets', async () => {
    seed()
    const card = await render({ id: 'w', type: 'companion', size: '4x2', config: {} })
    expect(card).toContain('沈遥')
    expect(card).toContain('在店里擦杯子。')
    expect(card).toContain('2 条新消息')

    const schedule = await render({ id: 'w', type: 'schedule', size: '2x2', config: {} })
    expect(schedule).toContain('咖啡店打工')

    const todo = await render({ id: 'w', type: 'todo', size: '2x2', config: {} })
    expect(todo).toContain('买一把伞')

    const moment = await render({ id: 'w', type: 'moment', size: '2x2', config: {} })
    expect(moment).toContain('楼下的胖橘')

    const quote = await render({ id: 'w', type: 'quote', size: '4x2', config: {} })
    expect(quote).toContain('在店里擦杯子。')
  })

  it('renders every item of the default layout', async () => {
    seed()
    for (const item of createDefaultHomeLayout()) {
      const html = await render(item, { companionId: 'c1', messageBadge: 2 })
      expect(html, item.type).not.toBe('<!---->')
    }
  })
})
