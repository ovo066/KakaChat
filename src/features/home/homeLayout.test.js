import { describe, expect, it } from 'vitest'
import {
  HOME_PAGE_ROWS,
  countPackedRows,
  createDefaultHomeLayout,
  createHomeItem,
  getMissingDesktopApps,
  groupHomePages,
  isHomeLayout,
  migrateLegacyWidgets,
  moveInHomePages,
  normalizeHomeLayout,
  placeHomeItem
} from './homeLayout'

describe('homeLayout', () => {
  it('default layout fits every page and places every app', () => {
    const items = createDefaultHomeLayout()
    expect(isHomeLayout(items)).toBe(true)
    const pages = groupHomePages(items)
    expect(pages).toHaveLength(3)
    pages.forEach(page => expect(countPackedRows(page)).toBeLessThanOrEqual(HOME_PAGE_ROWS))
    expect(getMissingDesktopApps(items)).toEqual([])
  })

  it('packs like grid dense flow', () => {
    const rows = countPackedRows([
      createHomeItem('weather', '2x2'),
      createHomeItem('app', '1x1'),
      createHomeItem('app', '1x1'),
      createHomeItem('app', '1x1'),
      createHomeItem('app', '1x1')
    ])
    expect(rows).toBe(2)
  })

  it('places into a new page when the preferred page is full', () => {
    const items = createDefaultHomeLayout()
    const page = placeHomeItem(items, createHomeItem('year', '2x1'), 0)
    expect(page).toBe(2)
    const big = placeHomeItem(items, createHomeItem('music', '4x2'), 2)
    expect(big).toBe(3)
  })

  it('normalizes away empty pages', () => {
    const items = createDefaultHomeLayout().filter(item => item.page !== 1)
    normalizeHomeLayout(items)
    expect(groupHomePages(items)).toHaveLength(2)
    expect(items.every(item => item.page <= 1)).toBe(true)
  })

  it('migrates user content from legacy widgets', () => {
    const items = migrateLegacyWidgets([
      { id: 'a', type: 'weather', position: 0, config: { city: '北京' } },
      { id: 'b', type: 'image', position: 1, config: { src: 'data:image/png;base64,x', caption: 'hi' } },
      { id: 'c', type: 'image', position: 2, config: { src: '' } },
      { id: 'd', type: 'quote', position: 3, config: { text: '生活不止眼前的苟且，还有诗和远方。' } },
      { id: 'e', type: 'quote', position: 4, config: { text: '自己写的', author: '我' } },
      { id: 'f', type: 'todo', position: 5, config: { title: 'TODO', items: [{ text: '买伞', done: true }] } }
    ])
    const images = items.filter(item => item.type === 'image')
    expect(images).toHaveLength(1)
    expect(images[0].config.caption).toBe('hi')
    const notes = items.filter(item => item.type === 'sticky').map(item => item.config.text)
    expect(notes).toContain('自己写的\n—— 我')
    expect(notes).toContain('TODO\n☑ 买伞')
    groupHomePages(items).forEach(page => expect(countPackedRows(page)).toBeLessThanOrEqual(HOME_PAGE_ROWS))
  })

  it('moves an item within a page without touching the source pages', () => {
    const pages = groupHomePages(createDefaultHomeLayout())
    const [first, second] = pages[0]
    const moved = moveInHomePages(pages, first.id, 0, 1)
    expect(moved[0][0]).toBe(second)
    expect(moved[0][1]).toBe(first)
    expect(pages[0][0]).toBe(first)
  })

  it('pushes overflow to the next page when the target page is full', () => {
    const pages = groupHomePages(createDefaultHomeLayout())
    const quote = pages[2][0]
    const lastOnFirst = pages[0][pages[0].length - 1]
    const moved = moveInHomePages(pages, quote.id, 0, 0)
    expect(moved[0][0]).toBe(quote)
    expect(moved.flat()).toHaveLength(pages.flat().length)
    moved.forEach(page => expect(countPackedRows(page)).toBeLessThanOrEqual(HOME_PAGE_ROWS))
    expect(moved[0]).not.toContain(lastOnFirst)
  })

  it('keeps emptied pages in place and can open a new trailing page', () => {
    const solo = createHomeItem('clock', '2x2')
    const pages = [[createHomeItem('weather', '2x2')], [solo]]
    const moved = moveInHomePages(pages, solo.id, 2, 0)
    expect(moved.map(page => page.length)).toEqual([1, 0, 1])
  })
})
