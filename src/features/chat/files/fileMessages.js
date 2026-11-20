/**
 * 文件消息：用户上传的文本类文件 + AI 输出的 <file name="..."> 块。
 */

export const MAX_FILE_BYTES = 2 * 1024 * 1024
export const MAX_STORED_FILE_CHARS = 120000
export const MAX_MODEL_FILE_CHARS = 30000

const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'markdown', 'json', 'csv', 'tsv', 'log', 'xml', 'html', 'htm', 'css', 'js', 'mjs', 'ts',
  'jsx', 'tsx', 'vue', 'py', 'java', 'c', 'h', 'cpp', 'hpp', 'cs', 'go', 'rs', 'rb', 'php', 'sh', 'bat',
  'ps1', 'sql', 'yaml', 'yml', 'toml', 'ini', 'conf', 'env', 'srt', 'ass', 'lrc', 'tex', 'rtf'
])

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
export const MAX_DOCX_BYTES = 10 * 1024 * 1024

export const FILE_INPUT_ACCEPT = Array.from(TEXT_EXTENSIONS).map(ext => '.' + ext).join(',') + ',text/*,.docx,' + DOCX_MIME

const FILE_OPEN_REGEX = /<file(?=[\s>])/i
const FILE_BLOCK_REGEX = /<file\b([^>]*)>([\s\S]*?)(?:<\/file\s*>|$)/gi

export function getFileExtension(name) {
  const m = String(name || '').match(/\.([a-z0-9]+)$/i)
  return m ? m[1].toLowerCase() : ''
}

export function isDocxFile(file) {
  return !!file && (getFileExtension(file.name) === 'docx' || file.type === DOCX_MIME)
}

function decodeXmlEntities(text) {
  return String(text || '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&')
}

/** 把 word/document.xml 转成纯文本：段落换行、表格单元格用制表符分隔。 */
export function extractDocxXmlText(xml) {
  const body = String(xml || '')
    .replace(/<w:delText\b[^>]*>[\s\S]*?<\/w:delText>/g, '')
    .replace(/<w:tab\/>/g, '\t')
    .replace(/<w:(?:br|cr)\b[^>]*\/>/g, '\n')
    .replace(/<\/w:tc>/g, '\t')
    .replace(/<\/w:p>/g, '\n')
  let out = ''
  const re = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>|(\t|\n)/g
  let m
  while ((m = re.exec(body)) !== null) out += m[1] != null ? decodeXmlEntities(m[1]) : m[2]
  return out
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function readDocxText(file) {
  const { default: JSZip } = await import('jszip')
  let zip
  try {
    zip = await JSZip.loadAsync(await file.arrayBuffer())
  } catch {
    throw new Error(`无法解析 Word 文件：${file.name}（仅支持 .docx）`)
  }
  const doc = zip.file('word/document.xml')
  if (!doc) throw new Error(`无法解析 Word 文件：${file.name}`)
  return extractDocxXmlText(await doc.async('string'))
}

export function isTextLikeFile(file) {
  if (!file) return false
  if (String(file.type || '').startsWith('text/')) return true
  if (/json|xml|javascript|yaml|csv/i.test(String(file.type || ''))) return true
  return TEXT_EXTENSIONS.has(getFileExtension(file.name))
}

export function formatFileSize(bytes) {
  const n = Number(bytes) || 0
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

export function getTextByteSize(text) {
  return new Blob([String(text ?? '')]).size
}

export function guessMimeFromName(name) {
  const ext = getFileExtension(name)
  const map = {
    md: 'text/markdown', markdown: 'text/markdown', json: 'application/json', csv: 'text/csv',
    html: 'text/html', htm: 'text/html', xml: 'application/xml', js: 'text/javascript', css: 'text/css'
  }
  return map[ext] || 'text/plain'
}

export function getFileIconClass(name) {
  const ext = getFileExtension(name)
  if (ext === 'docx' || ext === 'doc') return 'ph-fill ph-file-doc'
  if (['md', 'markdown', 'txt', 'log', 'rtf'].includes(ext)) return 'ph-fill ph-file-text'
  if (['csv', 'tsv'].includes(ext)) return 'ph-fill ph-file-csv'
  if (['html', 'htm', 'xml'].includes(ext)) return 'ph-fill ph-file-html'
  if (ext === 'json' || ext === 'yaml' || ext === 'yml' || ext === 'toml') return 'ph-fill ph-brackets-curly'
  if (TEXT_EXTENSIONS.has(ext)) return 'ph-fill ph-file-code'
  return 'ph-fill ph-file'
}

/**
 * 读取用户选择的文件，生成消息字段。抛出 Error(message) 表示不支持。
 */
export async function readUserFile(file) {
  if (!file) throw new Error('未选择文件')
  const docx = isDocxFile(file)
  if (!docx && !isTextLikeFile(file)) throw new Error(`暂不支持该文件类型：${file.name}`)
  const limit = docx ? MAX_DOCX_BYTES : MAX_FILE_BYTES
  if (file.size > limit) throw new Error(`文件过大（>${formatFileSize(limit)}）：${file.name}`)
  const raw = docx ? await readDocxText(file) : await file.text()
  if (docx && !raw.trim()) throw new Error(`Word 文件里没有可读取的文字：${file.name}`)
  const truncated = raw.length > MAX_STORED_FILE_CHARS
  return {
    isFile: true,
    fileName: file.name,
    fileSize: file.size,
    fileMime: file.type || guessMimeFromName(file.name),
    fileText: truncated ? raw.slice(0, MAX_STORED_FILE_CHARS) : raw,
    fileTruncated: truncated,
    fileExtracted: docx ? 'docx' : '',
    content: `[文件] ${file.name}`
  }
}

function escapeAttr(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function unescapeAttr(value) {
  return String(value ?? '').replace(/&lt;/g, '<').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
}

/** 用户文件消息 → 发给模型的文本 */
export function buildFileMessageModelContent(message, maxChars = MAX_MODEL_FILE_CHARS) {
  const name = String(message?.fileName || '未命名文件')
  const text = String(message?.fileText ?? '')
  const cut = text.length > maxChars
  const body = cut ? text.slice(0, maxChars) : text
  const note = (cut || message?.fileTruncated) ? '\n[……文件过长，后续内容已省略]' : ''
  return `[用户发送了文件]\n<file name="${escapeAttr(name)}" size="${formatFileSize(message?.fileSize)}">\n${body}${note}\n</file>`
}

export function hasFileMarkup(content) {
  return FILE_OPEN_REGEX.test(String(content ?? ''))
}

function parseFileAttrs(attrText) {
  const attrs = {}
  const re = /([a-zA-Z_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g
  let m
  while ((m = re.exec(String(attrText || ''))) !== null) {
    attrs[m[1].toLowerCase()] = unescapeAttr(m[2] ?? m[3] ?? m[4] ?? '')
  }
  return attrs
}

/**
 * 把正文切成 text / file 片段。
 * @returns {Array<{type:'text',content:string}|{type:'file',name:string,content:string,complete:boolean}>}
 */
export function splitFileSegments(content) {
  const text = String(content ?? '')
  const segments = []
  let last = 0
  FILE_BLOCK_REGEX.lastIndex = 0
  let m
  while ((m = FILE_BLOCK_REGEX.exec(text)) !== null) {
    if (m.index > last) segments.push({ type: 'text', content: text.slice(last, m.index) })
    const attrs = parseFileAttrs(m[1])
    const complete = /<\/file\s*>$/i.test(m[0])
    const body = String(m[2] || '').replace(/^\r?\n/, '').replace(/\r?\n$/, '')
    segments.push({
      type: 'file',
      name: String(attrs.name || attrs.filename || attrs.title || '文件.txt').trim() || '文件.txt',
      content: body,
      complete
    })
    last = m.index + m[0].length
    if (m[0].length === 0) FILE_BLOCK_REGEX.lastIndex++
  }
  if (last < text.length) segments.push({ type: 'text', content: text.slice(last) })
  return segments
}

export function formatFileBlockToken(name, content) {
  return `<file name="${escapeAttr(name)}">\n${String(content ?? '')}\n</file>`
}

/** 提取出的文字另存时使用的文件名（如 报告.docx → 报告.txt） */
export function resolveDownloadName(name, extracted) {
  const n = String(name || 'file.txt')
  return extracted ? n.replace(/\.[a-z0-9]+$/i, '') + '.txt' : n
}

export function downloadTextFile(name, text, mime) {
  const blob = new Blob([String(text ?? '')], { type: (mime || guessMimeFromName(name)) + ';charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = String(name || 'file.txt')
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
