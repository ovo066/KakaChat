import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRenderer, h, nextTick } from 'vue'
import ChatMediaBlock from './ChatMediaBlock.vue'

// Exercise component updates and image events without a browser or network requests.
const makeNode = type => ({ type, props: {}, children: [], parent: null })
function removeNode(node) {
  const parent = node.parent
  if (parent) parent.children.splice(parent.children.indexOf(node), 1)
  node.parent = null
}

const renderer = createRenderer({
  createElement: makeNode,
  createText: () => makeNode('#text'),
  createComment: () => makeNode('#comment'),
  setText: (node, text) => { node.text = text },
  setElementText: (node, text) => { node.text = text },
  patchProp: (node, key, _previous, value) => { node.props[key] = value },
  parentNode: node => node.parent,
  nextSibling: node => node.parent?.children[node.parent.children.indexOf(node) + 1] || null,
  insert(node, parent, anchor = null) {
    if (node.parent) removeNode(node)
    const index = anchor ? parent.children.indexOf(anchor) : parent.children.length
    parent.children.splice(index, 0, node)
    node.parent = parent
  },
  remove: removeNode
})

function findNode(node, predicate) {
  if (predicate(node)) return node
  for (const child of node.children) {
    const found = findNode(child, predicate)
    if (found) return found
  }
  return null
}

const roots = []
function mountSticker(overrides = {}) {
  const root = makeNode('root')
  roots.push(root)
  let block = {
    type: 'stickerMessage', key: 'sticker-1', isUser: true, mb: 'mb-2',
    stickerName: 'wave', stickerUrl: 'https://example.com/wave.gif', ...overrides
  }
  const render = () => renderer.render(h(ChatMediaBlock, { block }), root)
  render()
  return {
    image: () => findNode(root, node => node.type === 'img'),
    loading: () => !!findNode(root, node => node.props.class?.includes('chat-sticker-loading')),
    async update(changes = {}) {
      // The message parser builds new block objects whenever messages change.
      block = { ...block, ...changes }
      render()
      await nextTick()
    }
  }
}

afterEach(() => {
  roots.splice(0).forEach(root => renderer.render(null, root))
  vi.useRealTimers()
})

describe('ChatMediaBlock sticker loading', () => {
  it.each([
    ['stickerMessage', true, 'https://example.com/wave.gif'],
    ['sticker', false, 'https://example.com/wave.gif'],
    ['stickerMessage', true, 'blob:local-sticker'],
    ['sticker', false, 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///w==']
  ])('keeps a loaded %s visible after message updates (%s, %s)', async (type, isUser, stickerUrl) => {
    const sticker = mountSticker({ type, isUser, stickerUrl })
    const image = sticker.image()
    expect(sticker.loading()).toBe(true)
    image.props.onLoad()
    await nextTick()
    expect(sticker.loading()).toBe(false)

    for (let index = 0; index < 3; index += 1) {
      await sticker.update({ mb: 'mb-[2px]', metaText: `update-${index}` })
      expect(sticker.image()).toBe(image)
      expect(sticker.image().props.src).toBe(stickerUrl)
      expect(sticker.loading()).toBe(false)
    }
  })

  it('keeps a pending retry when another message updates the block', async () => {
    vi.useFakeTimers()
    const sticker = mountSticker()
    sticker.image().props.onError()
    await nextTick()
    expect(sticker.image() === null).toBe(true)

    await sticker.update({ metaText: 'new message' })
    expect(sticker.image() === null).toBe(true)
    await vi.advanceTimersByTimeAsync(800)
    expect(sticker.image().props.src).toBe('https://example.com/wave.gif?_retry=1')
    sticker.image().props.onLoad()
    await nextTick()

    await sticker.update()
    expect(sticker.image().props.src).toBe('https://example.com/wave.gif?_retry=1')
    expect(sticker.loading()).toBe(false)
  })

  it.each([
    { stickerUrl: 'https://example.com/other.gif' },
    { key: 'sticker-2' }
  ])('resets loading when the sticker identity changes: %j', async (changes) => {
    const sticker = mountSticker()
    sticker.image().props.onLoad()
    await nextTick()
    await sticker.update(changes)
    expect(sticker.loading()).toBe(true)
  })

  it('cancels the previous sticker retry when its URL changes', async () => {
    vi.useFakeTimers()
    const sticker = mountSticker()
    sticker.image().props.onError()
    await nextTick()
    await sticker.update({ stickerUrl: 'https://example.com/other.gif' })
    sticker.image().props.onLoad()
    await nextTick()

    await vi.advanceTimersByTimeAsync(800)
    expect(sticker.image().props.src).toBe('https://example.com/other.gif')
    expect(sticker.loading()).toBe(false)
  })
})
