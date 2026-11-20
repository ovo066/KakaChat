import { describe, expect, it } from 'vitest'
import { applyAnthropicThinking, applyGeminiThinking, resolveOpenAIReasoningEffort, supportsAdaptiveThinking } from './thinkingConfig'
import { buildChatCompletionPayload } from './chatCompletions'

describe('thinkingConfig', () => {
  it('detects adaptive-capable Claude models', () => {
    expect(supportsAdaptiveThinking('claude-opus-5-5')).toBe(true)
    expect(supportsAdaptiveThinking('anthropic/claude-sonnet-4.6')).toBe(true)
    expect(supportsAdaptiveThinking('claude-sonnet-4-5')).toBe(false)
    expect(supportsAdaptiveThinking('gpt-5')).toBe(false)
  })

  it('uses adaptive thinking for auto and effort for levels on new Claude', () => {
    expect(applyAnthropicThinking({ model: 'claude-opus-5-5' }, 'auto')).toEqual({ model: 'claude-opus-5-5', thinking: { type: 'adaptive', display: 'summarized' } })
    expect(applyAnthropicThinking({ model: 'claude-sonnet-5-5' }, 'high').output_config).toEqual({ effort: 'high' })
  })

  it('falls back to a budget below max_tokens on old Claude and drops sampling', () => {
    const body = applyAnthropicThinking({ model: 'claude-sonnet-4-5', max_tokens: 4096, temperature: 0.7 }, 'high')
    expect(body.thinking).toEqual({ type: 'enabled', budget_tokens: 3072 })
    expect(body.temperature).toBeUndefined()
    expect(applyAnthropicThinking({ model: 'claude-3-7-sonnet', max_tokens: 1500 }, 'low').thinking).toBeUndefined()
  })

  it('sends dynamic budget for Gemini auto and leaves default untouched', () => {
    expect(applyGeminiThinking({}, 'auto').generationConfig.thinkingConfig).toEqual({ thinkingBudget: -1, includeThoughts: true })
    expect(applyGeminiThinking({}, '')).toEqual({})
  })

  it('omits reasoning_effort for auto on OpenAI formats', () => {
    expect(resolveOpenAIReasoningEffort('auto')).toBe('')
    expect(buildChatCompletionPayload({ model: 'o3', reasoningEffort: 'auto' }, []).reasoning_effort).toBeUndefined()
    expect(buildChatCompletionPayload({ model: 'o3', reasoningEffort: 'low' }, []).reasoning_effort).toBe('low')
  })
})
