import { describe, expect, it } from 'vitest'
import {
  estimateVoiceDuration,
  formatMusicToken,
  generateWaveform,
  parseMessageContent,
  rebuildMessageContent
} from './contentParts'

describe('message content parts', () => {
  it('parses narration and special tokens with inherited emotion', () => {
    const parts = parseMessageContent('*旁白*\n[emotion:happy](voice:你好呀)\n(sticker:wave)')

    expect(parts).toEqual([
      { type: 'narration', content: '旁白' },
      {
        type: 'voice',
        text: '你好呀',
        duration: estimateVoiceDuration('你好呀'),
        waveform: generateWaveform('你好呀'),
        emotion: 'happy'
      },
      { type: 'sticker', name: 'wave' }
    ])
  })

  it('treats disabled token types as normal text', () => {
    expect(parseMessageContent('(music:Song:Artist)', { allowMusic: false })).toEqual([
      { type: 'normal', content: '(music:Song:Artist)', emotion: 'normal' }
    ])
  })

  it('rebuilds parsed parts back into message tokens', () => {
    const content = rebuildMessageContent([
      { type: 'normal', content: 'hello' },
      { type: 'music', title: 'Song', artist: 'Artist', url: 'https://a.test/1', cover: '' }
    ])

    expect(content).toBe(`hello\n${formatMusicToken('Song', 'Artist', 'https://a.test/1')}`)
  })

  it('preserves voice emotion tags when rebuilding voice tokens', () => {
    const content = rebuildMessageContent([
      { type: 'voice', text: '你好呀', emotion: 'happy' }
    ])

    expect(content).toBe('(voice:[emotion:happy]你好呀)')
    expect(parseMessageContent(content)).toEqual([
      {
        type: 'voice',
        text: '你好呀',
        duration: estimateVoiceDuration('你好呀'),
        waveform: generateWaveform('你好呀'),
        emotion: 'happy'
      }
    ])
  })

  it('splits unicode line separators into independent normal parts', () => {
    expect(parseMessageContent('第一句\u2028第二句')).toEqual([
      { type: 'normal', content: '第一句', emotion: 'normal' },
      { type: 'normal', content: '第二句', emotion: 'normal' }
    ])
  })

  it('returns no parts for blank content', () => {
    expect(parseMessageContent('  \n  ')).toEqual([])
  })

  it('round-trips gift tokens with encoded custom values', () => {
    const content = rebuildMessageContent([
      { type: 'gift', item: '手作礼物:限定版', message: '打开看看（别在路上）' }
    ])

    expect(parseMessageContent(content)).toEqual([
      {
        type: 'gift',
        item: '手作礼物:限定版',
        message: '打开看看（别在路上）',
        imageUrl: null,
        price: null,
        description: null
      }
    ])
  })

  it('supports note-only meet tokens without losing the note field', () => {
    const content = rebuildMessageContent([
      { type: 'meet', location: '咖啡厅', time: '', note: '3:30后见（别迟到）' }
    ])

    expect(content.startsWith('(meet:咖啡厅::')).toBe(true)
    expect(parseMessageContent(content)).toEqual([
      {
        type: 'meet',
        location: '咖啡厅',
        time: '',
        note: '3:30后见（别迟到）'
      }
    ])
  })

  it('parses recall tokens and round-trips them', () => {
    const parts = parseMessageContent('其实我…\n(撤回:我好像有点喜欢你(认真的))\n没什么')

    expect(parts).toEqual([
      { type: 'normal', content: '其实我…', emotion: 'normal' },
      { type: 'recall', content: '我好像有点喜欢你(认真的)' },
      { type: 'normal', content: '没什么', emotion: 'normal' }
    ])
    expect(rebuildMessageContent(parts)).toBe('其实我…\n(recall:我好像有点喜欢你(认真的))\n没什么')
    expect(parseMessageContent('(recall:算了)', { allowRecall: false })).toEqual([
      { type: 'normal', content: '(recall:算了)', emotion: 'normal' }
    ])
  })
})
