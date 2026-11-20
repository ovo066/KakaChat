import { buildChatCompletionPayload } from './chatCompletions'
import { assertValidHeaders, mergeRequestHeaders, prepareApiKey } from '../../utils/httpHeaders'
import { consumeChatCompletionsStream } from './stream'
import { consumeToolAwareChatCompletionsStream } from './toolAwareStream'
import { fetchOpenAICompat, readOpenAICompatError, resolveOpenAICompatUrl } from './openaiCompat'
import {
  API_FORMAT_ANTHROPIC_MESSAGES,
  API_FORMAT_GEMINI_GENERATE_CONTENT,
  API_FORMAT_OPENAI_COMPATIBLE,
  API_FORMAT_OPENAI_RESPONSES,
  normalizeApiFormat,
  normalizeProviderConfig
} from './providerFormats'
import {
  applyRequestCustomization,
  applyRequestParameterFilters,
  parseCustomRequestHeaders
} from './requestCustomization'
import {
  buildAnthropicHeaders,
  buildAnthropicMessagesRequest,
  consumeAnthropicMessagesStream,
  extractAnthropicNonStreamText,
  readAnthropicMessagesError,
  resolveAnthropicMessagesUrl,
  sanitizeAnthropicBody
} from './anthropicMessages'
import {
  buildGeminiGenerateContentRequest,
  consumeGeminiGenerateContentStream,
  extractGeminiNonStreamText,
  readGeminiGenerateContentError,
  resolveGeminiGenerateContentUrl,
  sanitizeGeminiBody
} from './geminiGenerateContent'
import {
  buildOpenAIResponsesRequest,
  consumeOpenAIResponsesStream,
  extractOpenAIResponsesNonStreamText,
  readOpenAIResponsesError,
  resolveOpenAIResponsesUrl,
  sanitizeOpenAIResponsesBody
} from './openaiResponses'

function getProviderFormat(cfg) {
  return normalizeApiFormat(cfg?.apiFormat)
}

/** 聊天请求最终发往的地址（设置页预览用，不含本地代理改写） */
export function resolveProviderChatUrl(cfg = {}) {
  const format = getProviderFormat(cfg)
  if (format === API_FORMAT_ANTHROPIC_MESSAGES) return resolveAnthropicMessagesUrl(cfg.url)
  if (format === API_FORMAT_GEMINI_GENERATE_CONTENT) {
    return resolveGeminiGenerateContentUrl(cfg.url, cfg.model || 'MODEL', { stream: true })
  }
  if (format === API_FORMAT_OPENAI_RESPONSES) return resolveOpenAIResponsesUrl(cfg.url)
  return resolveOpenAICompatUrl(cfg.url, '/chat/completions')
}

function buildNativeProviderRequest(cfg, messages, options = {}) {
  const format = getProviderFormat(cfg)
  if (format === API_FORMAT_ANTHROPIC_MESSAGES) {
    return buildAnthropicMessagesRequest(cfg, messages, options)
  }
  if (format === API_FORMAT_GEMINI_GENERATE_CONTENT) {
    return buildGeminiGenerateContentRequest(cfg, messages, options)
  }
  if (format === API_FORMAT_OPENAI_RESPONSES) {
    return buildOpenAIResponsesRequest(cfg, messages, options)
  }
  return null
}

function sanitizeProviderBody(format, request, config = {}) {
  if (!request || typeof request !== 'object' || !request.body) return request
  let sanitizedRequest = request
  if (format === API_FORMAT_ANTHROPIC_MESSAGES) {
    sanitizedRequest = { ...request, body: sanitizeAnthropicBody(request.body) }
  }
  if (format === API_FORMAT_GEMINI_GENERATE_CONTENT) {
    sanitizedRequest = { ...request, body: sanitizeGeminiBody(request.body) }
  }
  if (format === API_FORMAT_OPENAI_RESPONSES) {
    sanitizedRequest = { ...request, body: sanitizeOpenAIResponsesBody(request.body) }
  }
  return {
    ...sanitizedRequest,
    body: applyRequestParameterFilters(sanitizedRequest.body, config)
  }
}

function resolveCompatFetchOptions(cfg, options = {}) {
  const { extraHeaders: perRequestHeaders, ...fetchOptions } = options
  const extraHeaders = mergeRequestHeaders(
    parseCustomRequestHeaders(cfg?.customHeadersJson),
    perRequestHeaders
  )
  if (Object.keys(extraHeaders).length > 0) fetchOptions.extraHeaders = extraHeaders
  return fetchOptions
}

export function buildProviderChatPayload(cfg = {}, messages = [], options = {}) {
  const normalizedCfg = normalizeProviderConfig(cfg)
  const format = getProviderFormat(normalizedCfg)
  if (format === API_FORMAT_OPENAI_COMPATIBLE) {
    const payload = buildChatCompletionPayload(normalizedCfg, messages, options)
    return applyRequestCustomization({ body: payload }, normalizedCfg).body
  }
  const raw = buildNativeProviderRequest(normalizedCfg, messages, options)
  const customized = applyRequestCustomization(raw, normalizedCfg)
  return sanitizeProviderBody(format, customized, normalizedCfg)
}

export function buildProviderNonStreamingPayload(cfg = {}, payloadOrRequest) {
  const format = getProviderFormat(cfg)
  if (format === API_FORMAT_OPENAI_COMPATIBLE) {
    const nextPayload = { ...(payloadOrRequest || {}), stream: false }
    delete nextPayload.stream_options
    return nextPayload
  }

  const request = payloadOrRequest && typeof payloadOrRequest === 'object' ? payloadOrRequest : { body: {} }
  if (format === API_FORMAT_GEMINI_GENERATE_CONTENT) {
    // Gemini 的请求体没有 stream 字段（流式与否由 :streamGenerateContent / :generateContent 区分），
    // 且其 JSON 解析对未知字段报 400，因此这里不能塞 stream:false。
    const body = { ...(request.body || {}) }
    delete body.stream
    return {
      ...request,
      url: request.url?.replace(/:streamGenerateContent$/i, ':generateContent'),
      body
    }
  }
  return {
    ...request,
    body: {
      ...(request.body || {}),
      stream: false
    }
  }
}

export async function fetchProviderChat(cfg = {}, payloadOrRequest, options = {}) {
  const normalizedCfg = normalizeProviderConfig(cfg)
  const format = getProviderFormat(normalizedCfg)
  if (format === API_FORMAT_OPENAI_COMPATIBLE) {
    return fetchOpenAICompat(normalizedCfg.url, {
      apiKey: normalizedCfg.key,
      body: payloadOrRequest,
      ...resolveCompatFetchOptions(normalizedCfg, options)
    })
  }

  // Older feature callers construct Chat Completions bodies directly.
  // Convert those bodies here so they also honor the selected native format.
  if (Array.isArray(payloadOrRequest?.messages) && !payloadOrRequest.body) {
    const legacyBody = payloadOrRequest
    const effectiveCfg = {
      ...normalizedCfg,
      model: legacyBody.model || normalizedCfg.model,
      temperature: legacyBody.temperature ?? normalizedCfg.temperature
    }
    payloadOrRequest = buildProviderChatPayload(effectiveCfg, legacyBody.messages, {
      stream: legacyBody.stream === true,
      maxTokens: legacyBody.max_tokens,
      tools: legacyBody.tools,
      tool_choice: legacyBody.tool_choice
    })
    if (format === API_FORMAT_OPENAI_RESPONSES && legacyBody.top_p != null) {
      payloadOrRequest.body.top_p = legacyBody.top_p
      payloadOrRequest = sanitizeProviderBody(format, payloadOrRequest, effectiveCfg)
    }
  }

  if (format === API_FORMAT_OPENAI_RESPONSES) {
    const request = payloadOrRequest && typeof payloadOrRequest === 'object' ? payloadOrRequest : {}
    return fetchOpenAICompat(normalizedCfg.url, {
      path: '/responses',
      targetUrl: request.url || resolveOpenAIResponsesUrl(normalizedCfg.url),
      apiKey: normalizedCfg.key,
      body: request.body,
      ...resolveCompatFetchOptions(normalizedCfg, options)
    })
  }

  const request = payloadOrRequest && typeof payloadOrRequest === 'object' ? payloadOrRequest : {}
  const headers = assertValidHeaders(request.headers || {})
  const init = {
    method: options.method || 'POST',
    headers,
    body: JSON.stringify(request.body || {})
  }
  if (options.signal) init.signal = options.signal

  const response = await fetch(request.url, init)
  return {
    request: {
      targetUrl: request.url,
      url: request.url,
      providerFormat: format,
      headers
    },
    response
  }
}

export async function consumeProviderChatStream(cfg = {}, response, onDelta, options = {}) {
  const format = getProviderFormat(cfg)
  if (format === API_FORMAT_ANTHROPIC_MESSAGES) {
    return consumeAnthropicMessagesStream(response, onDelta, options)
  }
  if (format === API_FORMAT_GEMINI_GENERATE_CONTENT) {
    return consumeGeminiGenerateContentStream(response, onDelta, options)
  }
  if (format === API_FORMAT_OPENAI_RESPONSES) {
    return consumeOpenAIResponsesStream(response, onDelta, options)
  }
  if (options.toolAware) {
    return consumeToolAwareChatCompletionsStream(response, {
      onDelta,
      onReasoningDelta: options.onReasoningDelta
    })
  }
  return consumeChatCompletionsStream(response, onDelta, options)
}

export async function readProviderChatError(cfg = {}, response) {
  const format = getProviderFormat(cfg)
  if (format === API_FORMAT_ANTHROPIC_MESSAGES) return readAnthropicMessagesError(response)
  if (format === API_FORMAT_GEMINI_GENERATE_CONTENT) return readGeminiGenerateContentError(response)
  if (format === API_FORMAT_OPENAI_RESPONSES) return readOpenAIResponsesError(response)
  return readOpenAICompatError(response)
}

function normalizeModelId(value) {
  const id = String(value || '').trim()
  if (!id) return ''
  return id.replace(/^models\//i, '')
}

function extractModelIds(payload) {
  const items = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.models)
      ? payload.models
      : []
  const models = []
  const seen = new Set()
  for (const item of items) {
    const id = normalizeModelId(item?.id || item?.name || item?.model)
    if (!id || seen.has(id)) continue
    seen.add(id)
    models.push(id)
  }
  return models.sort()
}

function resolveAnthropicModelsUrl(baseUrl) {
  const raw = String(baseUrl || '').trim().replace(/\/+$/, '')
  if (!raw) return '/v1/models'
  if (/\/v1\/models$/i.test(raw) || /\/models$/i.test(raw)) return raw
  if (/\/v1$/i.test(raw)) return raw + '/models'
  return raw + '/v1/models'
}

function resolveGeminiModelsUrl(baseUrl) {
  const raw = String(baseUrl || '').trim().replace(/\/+$/, '')
  if (!raw) return '/v1beta/models'
  if (/\/models$/i.test(raw)) return raw
  return raw + '/models'
}

export async function fetchProviderModels(cfg = {}) {
  const normalizedCfg = normalizeProviderConfig(cfg)
  const format = getProviderFormat(normalizedCfg)
  if (format === API_FORMAT_OPENAI_COMPATIBLE || format === API_FORMAT_OPENAI_RESPONSES) {
    return fetchOpenAICompatModels(normalizedCfg)
  }

  const targetUrl = format === API_FORMAT_ANTHROPIC_MESSAGES
    ? resolveAnthropicModelsUrl(normalizedCfg.url)
    : resolveGeminiModelsUrl(normalizedCfg.url)
  const defaultHeaders = format === API_FORMAT_ANTHROPIC_MESSAGES
    ? buildAnthropicHeaders(normalizedCfg)
    : {
        'x-goog-api-key': prepareApiKey(normalizedCfg.key, 'Gemini API Key')
      }
  if (format === API_FORMAT_ANTHROPIC_MESSAGES) delete defaultHeaders['Content-Type']
  const headers = mergeRequestHeaders(
    defaultHeaders,
    parseCustomRequestHeaders(normalizedCfg.customHeadersJson)
  )
  const request = { targetUrl, url: targetUrl, providerFormat: format, headers }

  try {
    assertValidHeaders(headers)
    const response = await fetch(targetUrl, { method: 'GET', headers })
    if (!response.ok) throw new Error(await readProviderChatError(normalizedCfg, response))
    const data = await response.json()
    return { request, models: extractModelIds(data) }
  } catch (primaryError) {
    // 中转站（OpenRouter/one-api 等）通常只支持 OpenAI 风格的
    // GET /v1/models + Authorization: Bearer，且 CORS 预检不放行
    // x-api-key / anthropic-version 等头，原生请求会直接失败——回退重试
    try {
      return await fetchOpenAICompatModels(normalizedCfg)
    } catch {
      throw primaryError
    }
  }
}

async function fetchOpenAICompatModels(normalizedCfg) {
  const extraHeaders = parseCustomRequestHeaders(normalizedCfg.customHeadersJson)
  const { request, response } = await fetchOpenAICompat(normalizedCfg.url, {
    path: '/models',
    ...(normalizedCfg.apiFormat === API_FORMAT_OPENAI_RESPONSES
      ? { targetUrl: resolveOpenAIResponsesUrl(normalizedCfg.url).replace(/\/responses(?=[?#]|$)/i, '/models') }
      : {}),
    method: 'GET',
    apiKey: normalizedCfg.key,
    contentType: false,
    ...(Object.keys(extraHeaders).length > 0 ? { extraHeaders } : {})
  })
  if (!response.ok) throw new Error(await readOpenAICompatError(response))
  const data = await response.json()
  return { request, models: extractModelIds(data) }
}

export function extractProviderNonStreamText(cfg = {}, payload) {
  const format = getProviderFormat(cfg)
  if (format === API_FORMAT_ANTHROPIC_MESSAGES) return extractAnthropicNonStreamText(payload)
  if (format === API_FORMAT_GEMINI_GENERATE_CONTENT) return extractGeminiNonStreamText(payload)
  if (format === API_FORMAT_OPENAI_RESPONSES) return extractOpenAIResponsesNonStreamText(payload)

  const choice = payload?.choices?.[0]
  const content = choice?.message?.content ?? choice?.delta?.content
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content.map(part => typeof part?.text === 'string' ? part.text : '').join('')
  }
  if (typeof payload?.output_text === 'string') return payload.output_text
  if (typeof payload?.text === 'string') return payload.text
  return ''
}

export function extractProviderNonStreamFinishReason(cfg = {}, payload) {
  const format = getProviderFormat(cfg)
  if (format === API_FORMAT_OPENAI_RESPONSES) {
    const reason = payload?.incomplete_details?.reason
    if (reason === 'max_output_tokens') return 'length'
    if (reason === 'content_filter') return 'content_filter'
    return payload?.status === 'completed' ? 'stop' : (payload?.status || null)
  }
  if (format === API_FORMAT_ANTHROPIC_MESSAGES) {
    if (payload?.stop_reason === 'max_tokens') return 'length'
    return payload?.stop_reason || null
  }
  if (format === API_FORMAT_GEMINI_GENERATE_CONTENT) {
    const reason = payload?.candidates?.[0]?.finishReason
    if (reason === 'MAX_TOKENS') return 'length'
    if (reason === 'SAFETY' || payload?.promptFeedback?.blockReason) return 'content_filter'
    return reason || null
  }
  return payload?.choices?.[0]?.finish_reason || null
}

export function summarizeProviderRequestPayload(payloadOrRequest) {
  const body = payloadOrRequest?.body || payloadOrRequest || {}
  return body
}
