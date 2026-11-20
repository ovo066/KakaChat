import { describe, expect, it } from 'vitest'
import { buildFileMessageModelContent, splitFileSegments } from './fileMessages'
import { parseMessageContent } from '../composables/messageParser/contentParts'

describe('file messages', () => {
  it('splits AI file blocks', () => {
    const segs = splitFileSegments('给你\n<file name="plan.md">\n# Day 1\n- 看海\n</file>\n收好哦')
    expect(segs.map(s => s.type)).toEqual(['text', 'file', 'text'])
    expect(segs[1]).toMatchObject({ name: 'plan.md', content: '# Day 1\n- 看海', complete: true })
  })

  it('marks unclosed block as incomplete (streaming)', () => {
    const segs = splitFileSegments('<file name="a.txt">\nabc')
    expect(segs[0]).toMatchObject({ type: 'file', complete: false, content: 'abc' })
  })

  it('parses into parts and respects allowFile', () => {
    const text = '好的\n<file name="a.json">\n{"a":(1)}\n</file>'
    const parts = parseMessageContent(text, { allowFile: true })
    expect(parts.map(p => p.type)).toEqual(['normal', 'file'])
    expect(parts[1].content).toBe('{"a":(1)}')
    expect(parseMessageContent(text, { allowFile: false }).some(p => p.type === 'file')).toBe(false)
  })

  it('builds model content for user file', () => {
    const out = buildFileMessageModelContent({ fileName: 'x.txt', fileSize: 3, fileText: 'abc' })
    expect(out).toContain('<file name="x.txt" size="3 B">\nabc\n</file>')
  })
})

describe('docx extraction', () => {
  it('extracts paragraphs, tabs, tables and entities', async () => {
    const { extractDocxXmlText, readUserFile } = await import('./fileMessages')
    const xml = '<w:document><w:body>'
      + '<w:p><w:r><w:t>标题 &amp; 说明</w:t></w:r></w:p>'
      + '<w:p><w:r><w:t xml:space="preserve">第一行 </w:t></w:r><w:r><w:br/><w:t>第二行</w:t></w:r></w:p>'
      + '<w:tbl><w:tr><w:tc><w:p><w:r><w:t>A</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>B</w:t></w:r></w:p></w:tc></w:tr></w:tbl>'
      + '<w:p><w:del><w:r><w:delText>删掉</w:delText></w:r></w:del></w:p>'
      + '</w:body></w:document>'
    const text = extractDocxXmlText(xml)
    expect(text).toContain('标题 & 说明')
    expect(text).toContain('第一行\n第二行')
    expect(text).toMatch(/A\n\tB|A\tB/)
    expect(text).not.toContain('删掉')

    const { default: JSZip } = await import('jszip')
    const zip = new JSZip()
    zip.file('word/document.xml', xml)
    const blob = await zip.generateAsync({ type: 'uint8array' })
    const file = new File([blob], '报告.docx')
    const fields = await readUserFile(file)
    expect(fields).toMatchObject({ isFile: true, fileName: '报告.docx', fileExtracted: 'docx' })
    expect(fields.fileText).toContain('标题 & 说明')
  })
})
