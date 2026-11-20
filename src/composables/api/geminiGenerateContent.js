import { resolveOptionalMaxTokens, parseOptionalTemperature } from './chatCompletions'
import { prepareApiKey } from '../../utils/httpHeaders'
import { applyGeminiThinking } from './thinkingConfig'

const DEFAULT_ERROR_TEXT_LIMIT = 200

export function resolveGeminiGenerateContentUrl(baseUrl, model, options = {}) {
  const stream = options.stream !== false
  const action = stream ? 'streamGenerateContent' : 'generateContent'
  const raw = String(baseUrl || '').trim().replace(/\/+$/, '')
  if (!raw) return `/v1beta/models/${encodeURIComponent(String(model || '').trim())}:${action}`
  if (/:(?:streamGenerateContent|generateContent)$/i.test(raw)) return raw
  const modelId = encodeURIComponent(String(model || '').trim())
  if (/\/models\/[^/]+$/i.test(raw)) return raw + ':' + action
  return raw + `/models/${modelId}:${action}`
}

function extractTextFromContent(content) {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return String(content || '')
  return content.map(part => {
    if (typeof part === 'string') return part
    if (typeof part?.text === 'string') return part.text
    return ''
  }).join('')
}

function normalizeGeminiParts(content) {
  if (Array.isArray(content)) {
    const parts = []
    for (const part of content) {
      if (typeof part === 'string') {
        if (part.trim()) parts.push({ text: part })
        continue
      }
      if (!part || typeof part !== 'object') continue
      if (part.type == null && ['text', 'inlineData', 'fileData', 'functionCall', 'functionResponse', 'thoughtSignature'].some(key => key in part)) {
        parts.push(part)
        continue
      }
      if (part.type === 'text' && typeof part.text === 'string') {
        if (part.text.trim()) parts.push({ text: part.text })
        continue
      }
      if (part.type === 'image_url' && part.image_url?.url) {
        const inlineData = normalizeGeminiInlineData(part.image_url.url)
        if (inlineData) parts.push({ inlineData })
      }
    }
    return parts
  }
  const text = extractTextFromContent(content)
  return text.trim() ? [{ text }] : []
}

function safeJsonParseObject(value) {
  try {
    const parsed = JSON.parse(String(value || '{}'))
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : { value: parsed }
  } catch {
    return { text: String(value || '') }
  }
}

export function normalizeGeminiToolResultMessage(message) {
  const name = String(message?.name || message?.function?.name || '').trim()
  return {
    role: 'user',
    parts: [
      {
        functionResponse: {
          name,
          ...(message?.tool_call_id && !String(message.tool_call_id).startsWith('gemini_call_') ? { id: message.tool_call_id } : {}),
          response: safeJsonParseObject(message?.content)
        }
      }
    ]
  }
}

function safeParseToolArguments(value) {
  try {
    const parsed = JSON.parse(String(value || '{}'))
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : { value: parsed }
  } catch {
    return {}
  }
}

function normalizeGeminiAssistantToolCalls(message) {
  if (!Array.isArray(message?.tool_calls) || message.tool_calls.length === 0) return null
  const parts = []
  const visibleText = extractTextFromContent(message.content).trim()
  if (visibleText) parts.push({ text: visibleText })
  for (const call of message.tool_calls) {
    const name = String(call?.function?.name || '').trim()
    if (!name) continue
    parts.push({
      functionCall: {
        name,
        args: safeParseToolArguments(call.function?.arguments)
      }
    })
  }
  return parts.length > 0 ? parts : null
}

function normalizeGeminiInlineData(url) {
  const value = String(url || '').trim()
  const dataMatch = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
  if (!dataMatch) return null
  return {
    mimeType: dataMatch[1],
    data: dataMatch[2]
  }
}

function mergeConsecutiveGeminiContents(contents) {
  const merged = []
  for (const item of contents) {
    const prev = merged[merged.length - 1]
    if (prev && prev.role === item.role) {
      prev.parts = prev.parts.concat(item.parts)
      continue
    }
    merged.push({ role: item.role, parts: [...item.parts] })
  }
  return merged
}

function splitMessagesForGemini(messages) {
  const systemParts = []
  const rawContents = []

  for (const message of Array.isArray(messages) ? messages : []) {
    if (!message || typeof message !== 'object') continue
    const role = String(message.role || '').trim()
    const parts = normalizeGeminiParts(message.content)

    if (role === 'system' || role === 'developer') {
      systemParts.push(...parts.filter(part => typeof part.text === 'string'))
      continue
    }

    if (role === 'assistant') {
      const modelParts = normalizeGeminiAssistantToolCalls(message) || parts
      if (modelParts.length > 0) {
        rawContents.push({ role: 'model', parts: modelParts })
      }
      continue
    }

    if (role === 'user') {
      if (parts.length > 0) {
        rawContents.push({ role: 'user', parts })
      }
      continue
    }

    if (role === 'tool') {
      rawContents.push(normalizeGeminiToolResultMessage(message))
    }
  }

  const contents = mergeConsecutiveGeminiContents(rawContents)
  if (contents.length === 0) {
    contents.push({ role: 'user', parts: [{ text: '…' }] })
  }

  return { systemParts, contents }
}

function normalizeGeminiTools(tools) {
  if (!Array.isArray(tools)) return []
  const declarations = tools.map(tool => {
    const fn = tool?.function || tool
    const name = String(fn?.name || '').trim()
    if (!name) return null
    return {
      name,
      description: String(fn.description || '').trim(),
      parameters: fn.parameters && typeof fn.parameters === 'object'
        ? fn.parameters
        : { type: 'object', properties: {} }
    }
  }).filter(Boolean)
  return declarations.length > 0 ? [{ functionDeclarations: declarations }] : []
}

export function buildGeminiGenerateContentRequest(cfg = {}, messages = [], options = {}) {
  const split = splitMessagesForGemini(messages)
  const body = {
    contents: split.contents
  }
  if (split.systemParts.length > 0) {
    body.systemInstruction = { parts: split.systemParts }
  }

  const generationConfig = {}
  const temperature = parseOptionalTemperature(cfg.temperature)
  if (temperature !== null) generationConfig.temperature = temperature
  const maxTokens = resolveOptionalMaxTokens(cfg.maxTokens, options.maxTokens, options.max_tokens)
  if (maxTokens !== null) generationConfig.maxOutputTokens = maxTokens
  if (Object.keys(generationConfig).length > 0) body.generationConfig = generationConfig
  applyGeminiThinking(body, options.reasoningEffort ?? cfg.reasoningEffort)
  const tools = normalizeGeminiTools(options.tools)
  if (tools.length > 0) {
    body.tools = tools
    if (options.tool_choice === 'none') {
      body.toolConfig = { functionCallingConfig: { mode: 'NONE' } }
    } else if (options.tool_choice === 'required') {
      body.toolConfig = { functionCallingConfig: { mode: 'ANY' } }
    } else if (options.tool_choice?.type === 'function') {
      body.toolConfig = { functionCallingConfig: { mode: 'ANY', allowedFunctionNames: [options.tool_choice.function?.name || options.tool_choice.name] } }
    }
  }

  return {
    url: resolveGeminiGenerateContentUrl(cfg.url, cfg.model, options),
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': prepareApiKey(cfg.key, 'Gemini API Key')
    },
    body
  }
}

function extractTextFromCandidate(candidate) {
  const parts = candidate?.content?.parts
  if (!Array.isArray(parts)) return ''
  return parts.map(part => part?.thought === true ? '' : (typeof part?.text === 'string' ? part.text : '')).join('')
}

function extractReasoningFromCandidate(candidate) {
  const parts = candidate?.content?.parts
  if (!Array.isArray(parts)) return ''
  return parts.map(part => part?.thought === true && typeof part?.text === 'string' ? part.text : '').join('')
}

function extractReasoningFromGeminiPayload(payload) {
  if (Array.isArray(payload)) return payload.map(extractReasoningFromGeminiPayload).join('')
  if (!payload || typeof payload !== 'object') return ''
  const candidates = Array.isArray(payload.candidates) ? payload.candidates : []
  return candidates.map(extractReasoningFromCandidate).join('')
}

function extractToolCallsFromGeminiPayload(payload, offset = 0) {
  if (Array.isArray(payload)) {
    const calls = []
    for (const item of payload) calls.push(...extractToolCallsFromGeminiPayload(item, offset + calls.length))
    return calls
  }
  if (!payload || typeof payload !== 'object') return []
  const calls = []
  const candidates = Array.isArray(payload.candidates) ? payload.candidates : []
  candidates.forEach(candidate => {
    const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : []
    parts.forEach(part => {
      const functionCall = part?.functionCall || part?.function_call
      if (!functionCall?.name) return
      const id = String(functionCall.id || `gemini_call_${offset + calls.length}`)
      calls.push({
        id,
        type: 'function',
        function: {
          name: String(functionCall.name || ''),
          arguments: JSON.stringify(functionCall.args && typeof functionCall.args === 'object' ? functionCall.args : {})
        }
      })
    })
  })
  return calls
}

export function extractGeminiNonStreamText(payload) {
  if (Array.isArray(payload)) {
    return payload.map(item => extractGeminiNonStreamText(item)).join('')
  }
  if (!payload || typeof payload !== 'object') return ''
  if (payload.error) throw new Error(payload.error.message || 'Gemini 接口生成回复失败')
  const candidates = Array.isArray(payload.candidates) ? payload.candidates : []
  return candidates.map(extractTextFromCandidate).join('')
}

function extractGeminiFinishReason(payload) {
  return payload?.candidates?.[0]?.finishReason || payload?.candidates?.[0]?.finish_reason || ''
}

function tryParseJsonFrame(text) {
  const raw = String(text || '').trim()
  if (!raw || raw === '[DONE]') return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export async function consumeGeminiGenerateContentStream(res, onDelta, options = {}) {
  const reader = res?.body?.getReader?.()
  if (!reader) throw new Error('当前环境不支持流式读取')

  const decoder = new TextDecoder()
  let lineBuffer = ''
  let rawText = ''
  let eventLines = []
  let emittedChars = 0
  let emittedEvents = 0
  let usage = null
  let finishReason = null
  const toolCalls = []
  const nativeParts = []
  let processedPayload = false
  let reasoningContent = ''

  const emit = (text) => {
    const delta = String(text || '')
    if (!delta) return
    emittedChars += delta.length
    emittedEvents += 1
    if (typeof onDelta === 'function') onDelta(delta)
  }

  const processPayload = (payload) => {
    if (!payload) return
    if (Array.isArray(payload)) {
      payload.forEach(processPayload)
      return
    }
    processedPayload = true
    emit(extractGeminiNonStreamText(payload))
    const reasoningDelta = extractReasoningFromGeminiPayload(payload)
    if (reasoningDelta) {
      reasoningContent += reasoningDelta
      options.onReasoningDelta?.(reasoningContent)
    }
    nativeParts.push(...(payload.candidates?.[0]?.content?.parts || []))
    toolCalls.push(...extractToolCallsFromGeminiPayload(payload, toolCalls.length))
    const nextFinishReason = extractGeminiFinishReason(payload)
    if (nextFinishReason) finishReason = nextFinishReason
    if (payload.usageMetadata && typeof payload.usageMetadata === 'object') usage = { ...usage, ...payload.usageMetadata }
    if (payload.usage && typeof payload.usage === 'object') usage = { ...usage, ...payload.usage }
  }

  const processEvent = () => {
    if (eventLines.length === 0) return
    const payload = tryParseJsonFrame(eventLines.join('\n'))
    eventLines = []
    processPayload(payload)
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      rawText += chunk
      lineBuffer += chunk
      const lines = lineBuffer.split(/\r?\n/)
      lineBuffer = lines.pop() || ''
      for (const rawLine of lines) {
        const line = rawLine.trimEnd()
        if (line === '') {
          processEvent()
          continue
        }
        if (line.startsWith('data:')) {
          eventLines.push(line.slice(5).trimStart())
        } else if (line.trim().startsWith('{') || line.trim().startsWith('[')) {
          processPayload(tryParseJsonFrame(line))
        }
      }
    }

    if (lineBuffer.trim()) {
      const line = lineBuffer.trimEnd()
      if (line.startsWith('data:')) {
        eventLines.push(line.slice(5).trimStart())
        processEvent()
      } else {
        processPayload(tryParseJsonFrame(line))
      }
    } else {
      processEvent()
    }

    if (!processedPayload && rawText.trim()) {
      processPayload(tryParseJsonFrame(rawText))
    }
  } catch (error) {
    try { await reader.cancel() } catch { /* Preserve the API error. */ }
    throw error
  } finally { reader.releaseLock?.() }

  return {
    emittedChars,
    emittedEvents,
    usedFallback: false,
    usage,
    finishReason,
    filteredReasoningChars: reasoningContent.length,
    reasoningContent: reasoningContent.trim(),
    toolCalls: ['MAX_TOKENS', 'SAFETY'].includes(finishReason) ? [] : toolCalls,
    nativeAssistantMessage: { role: 'assistant', content: nativeParts }
  }
}

const GEMINI_BODY_BLOCKLIST = new Set([
  'stream_options', 'reasoning_effort', 'logprobs', 'top_logprobs',
  'n', 'frequency_penalty', 'presence_penalty', 'logit_bias',
  'seed', 'parallel_tool_calls', 'service_tier', 'response_format',
  'top_p', 'top_k', 'max_tokens', 'messages', 'model'
])

export function sanitizeGeminiBody(body) {
  if (!body || typeof body !== 'object') return body
  const sanitized = { ...body }

  const gc = sanitized.generationConfig && typeof sanitized.generationConfig === 'object'
    ? { ...sanitized.generationConfig }
    : {}
  let gcDirty = sanitized.generationConfig != null

  if (sanitized.temperature != null) {
    gc.temperature = sanitized.temperature
    gcDirty = true
  }
  if (sanitized.maxOutputTokens != null) {
    gc.maxOutputTokens = sanitized.maxOutputTokens
    gcDirty = true
  }

  for (const key of GEMINI_BODY_BLOCKLIST) {
    delete sanitized[key]
  }
  delete sanitized.temperature
  delete sanitized.maxOutputTokens

  if (gcDirty && Object.keys(gc).length > 0) {
    sanitized.generationConfig = gc
  }
  return sanitized
}

export async function readGeminiGenerateContentError(response, options = {}) {
  const { textLimit = DEFAULT_ERROR_TEXT_LIMIT } = options
  const fallback = `HTTP ${response?.status ?? ''}`.trim()
  if (!response) return fallback

  try {
    const payload = await response.clone().json()
    const message = payload?.error?.message || payload?.message || payload?.detail
    if (typeof message === 'string' && message.trim()) return message.trim()
  } catch {
    // Fall back to raw text.
  }

  try {
    const text = String(await response.clone().text() || '').trim()
    if (text) return text.slice(0, Math.max(1, textLimit))
  } catch {
    // Ignore raw text failures.
  }

  return fallback
}
