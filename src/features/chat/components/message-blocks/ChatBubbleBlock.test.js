import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRenderer, h } from 'vue'
import ChatBubbleBlock from './ChatBubbleBlock.vue'
import { useMessageParser } from '../../composables/useMessageParser'

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

function findQuote(node) {
  if (node.props.class?.includes('reply-context')) return node
  for (const child of node.children) {
    const found = findQuote(child)
    if (found) return found
  }
  return null
}

const roots = []
function clickQuote(block, container, multiSelectMode = false) {
  const root = makeNode('root')
  roots.push(root)
  renderer.render(h(ChatBubbleBlock, { block, multiSelectMode }), root)
  const event = {
    stopPropagation: vi.fn(),
    currentTarget: { closest: () => container }
  }
  findQuote(root).props.onClick(event)
  return event
}

function makeTarget(msgPart, top) {
  return {
    dataset: { msgId: 'original', msgPart },
    getBoundingClientRect: () => ({ top, height: 40 }),
    classList: { add: vi.fn(), remove: vi.fn() }
  }
}

function makeContainer(nodes) {
  return {
    scrollTop: 100,
    clientHeight: 400,
    querySelectorAll: () => nodes,
    getBoundingClientRect: () => ({ top: 0 }),
    scrollTo: vi.fn()
  }
}

afterEach(() => {
  roots.splice(0).forEach(root => renderer.render(null, root))
  vi.useRealTimers()
})

describe('ChatBubbleBlock quote navigation', () => {
  it('scrolls to and highlights the specific bubble resolved by the message parser', () => {
    vi.useFakeTimers()
    const { blocks } = useMessageParser({
      getMessages: () => [
        { id: 'original', role: 'assistant', content: '第一句\n指定气泡\n最后一句' },
        { id: 'reply', role: 'user', content: '收到', replyTo: 'original', replyToText: '指定气泡' }
      ],
      getStickerUrl: () => ''
    })
    const first = makeTarget('0', 200)
    const quoted = makeTarget('1', 600)
    const container = makeContainer([first, quoted, makeTarget('2', 800)])

    clickQuote(blocks.value.at(-1), container)

    expect(container.scrollTo).toHaveBeenCalledWith({ top: 520, behavior: 'smooth' })
    expect(first.classList.add).not.toHaveBeenCalled()
    expect(quoted.classList.add).toHaveBeenCalledWith('search-highlight-flash')
    vi.advanceTimersByTime(2000)
    expect(quoted.classList.remove).toHaveBeenLastCalledWith('search-highlight-flash')
  })

  it.each(['', 'missing', '0'])('supports legacy fallback and part zero (%s)', replyToPartKey => {
    vi.useFakeTimers()
    const first = makeTarget('0', 300)
    const container = makeContainer([first, makeTarget('1', 600)])

    clickQuote({ key: 'reply', replyText: '引用', replyToMsgId: 'original', replyToPartKey }, container)

    expect(container.scrollTo).toHaveBeenCalledWith({ top: 220, behavior: 'smooth' })
    expect(first.classList.add).toHaveBeenCalledWith('search-highlight-flash')
    vi.runAllTimers()
  })

  it('leaves quote navigation disabled during multi-select', () => {
    const container = makeContainer([makeTarget('1', 600)])
    const event = clickQuote({ key: 'reply', replyText: '引用', replyToMsgId: 'original', replyToPartKey: '1' }, container, true)

    expect(container.scrollTo).not.toHaveBeenCalled()
    expect(event.stopPropagation).not.toHaveBeenCalled()
  })
})
