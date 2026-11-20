import { describe, expect, it, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  flattenProviders,
  migrateConfigsToProviders,
  normalizeProviders,
  resolveModelConfig
} from './configsModel'
import { useConfigsStore } from './configs'
import { guessApiFormatForModel } from '../composables/api/providerPresets'

const relayConfigs = [
  {
    id: 'cfg_claude',
    name: 'Claude',
    url: 'https://relay.example.com/v1/',
    key: 'sk-relay',
    model: 'claude-sonnet-4-5',
    apiFormat: 'anthropic',
    cacheConfig: { enabled: true, ttl: '1h' },
    cachedModels: ['claude-sonnet-4-5', 'gpt-5']
  },
  {
    id: 'cfg_gpt',
    name: 'GPT',
    url: 'https://relay.example.com/v1',
    key: 'sk-relay',
    model: 'gpt-5',
    temperature: 0.7,
    cachedModels: ['gpt-5', 'gemini-2.5-pro']
  },
  {
    id: 'cfg_ds',
    name: 'DeepSeek',
    url: 'https://api.deepseek.com/v1',
    key: 'sk-ds',
    model: 'deepseek-chat'
  },
  {
    id: 'cfg_claude_official',
    name: 'Claude 4.5',
    url: 'https://api.anthropic.com',
    key: 'sk-ant',
    model: 'claude-sonnet-4-5',
    apiFormat: 'anthropic-messages'
  }
]

describe('migrateConfigsToProviders', () => {
  it('groups configs sharing url, key and headers into one provider and keeps model ids', () => {
    const providers = migrateConfigsToProviders(relayConfigs)

    expect(providers).toHaveLength(3)
    const [relay, deepseek, anthropic] = providers

    expect(relay).toMatchObject({
      name: 'relay.example.com',
      preset: 'custom',
      url: 'https://relay.example.com/v1/',
      key: 'sk-relay',
      apiFormat: 'anthropic-messages',
      cachedModels: ['claude-sonnet-4-5', 'gpt-5', 'gemini-2.5-pro']
    })
    expect(relay.models.map(m => [m.id, m.model, m.name, m.apiFormat])).toEqual([
      ['cfg_claude', 'claude-sonnet-4-5', 'Claude', 'anthropic-messages'],
      ['cfg_gpt', 'gpt-5', 'GPT', 'openai-compatible']
    ])
    expect(relay.models[0].cacheConfig).toEqual({ enabled: true, systemPrompt: true, ttl: '1h' })
    expect(relay.models[1].temperature).toBe(0.7)

    expect(deepseek).toMatchObject({ name: 'DeepSeek', preset: 'deepseek' })
    expect(deepseek.models[0]).toMatchObject({ id: 'cfg_ds', name: '' })

    expect(anthropic).toMatchObject({ name: 'Anthropic', preset: 'anthropic' })
    expect(anthropic.models[0]).toMatchObject({ id: 'cfg_claude_official', name: 'Claude 4.5' })
  })

  it('keeps a lone custom config name as the provider name', () => {
    const [provider] = migrateConfigsToProviders([
      { id: 'cfg_1', name: '我的中转', url: 'https://x.example.com/v1', key: 'k', model: 'gpt-4o' }
    ])
    expect(provider.name).toBe('我的中转')
    expect(provider.models[0].name).toBe('')
  })

  it('separates configs whose custom headers differ', () => {
    const providers = migrateConfigsToProviders([
      { id: 'a', url: 'https://openrouter.ai/api/v1', key: 'k', model: 'x', customHeadersJson: '{"X-Title":"A"}' },
      { id: 'b', url: 'https://openrouter.ai/api/v1', key: 'k', model: 'y' }
    ])
    expect(providers.map(p => p.models.map(m => m.id))).toEqual([['a'], ['b']])
  })
})

describe('flattenProviders', () => {
  it('resolves provider credentials, per-model protocol and url override', () => {
    const providers = normalizeProviders([{
      id: 'prv_1',
      name: 'Relay',
      url: 'https://relay.example.com/v1',
      key: 'Bearer sk-1',
      customHeadersJson: '{"X-Title":"Kaka"}',
      models: [
        { id: 'm1', model: 'gpt-5', apiFormat: 'openai-responses' },
        { id: 'm2', model: 'gemini-2.5-pro', name: 'Gemini', apiFormat: 'gemini', urlOverride: 'https://relay.example.com/v1beta' }
      ]
    }])

    expect(flattenProviders(providers)).toMatchObject([
      {
        id: 'm1',
        providerId: 'prv_1',
        name: 'Relay · gpt-5',
        url: 'https://relay.example.com/v1',
        key: 'sk-1',
        model: 'gpt-5',
        apiFormat: 'openai-responses',
        customHeadersJson: '{"X-Title":"Kaka"}'
      },
      {
        id: 'm2',
        name: 'Relay · Gemini',
        url: 'https://relay.example.com/v1beta',
        apiFormat: 'gemini-generate-content'
      }
    ])
  })

  it('regenerates duplicated model ids so references stay unambiguous', () => {
    const providers = normalizeProviders([
      { id: 'p1', models: [{ id: 'dup', model: 'a' }] },
      { id: 'p2', models: [{ id: 'dup', model: 'b' }] }
    ])
    expect(providers[0].models[0].id).toBe('dup')
    expect(providers[1].models[0].id).not.toBe('dup')
  })

  it('returns a detached config object', () => {
    const [provider] = normalizeProviders([{ id: 'p', models: [{ id: 'm', model: 'x', removeBodyParams: ['top_p'] }] }])
    const cfg = resolveModelConfig(provider, provider.models[0])
    cfg.removeBodyParams.push('temperature')
    expect(provider.models[0].removeBodyParams).toEqual(['top_p'])
  })
})

describe('guessApiFormatForModel', () => {
  it('maps claude and gemini model names to native protocols', () => {
    expect(guessApiFormatForModel('anthropic/claude-sonnet-4.5')).toBe('anthropic-messages')
    expect(guessApiFormatForModel('gemini-2.5-flash')).toBe('gemini-generate-content')
    expect(guessApiFormatForModel('gpt-5', 'openai-responses')).toBe('openai-responses')
  })
})

describe('useConfigsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('migrates legacy configs written through the configs setter', () => {
    const store = useConfigsStore()
    store.configs = relayConfigs
    store.activeConfigId = 'cfg_gpt'

    expect(store.providers).toHaveLength(3)
    expect(store.configs.map(c => c.id)).toEqual(['cfg_claude', 'cfg_gpt', 'cfg_ds', 'cfg_claude_official'])
    expect(store.getConfig).toMatchObject({ id: 'cfg_gpt', model: 'gpt-5', key: 'sk-relay' })
  })

  it('adds models without duplicates and falls back to another default on removal', () => {
    const store = useConfigsStore()
    const provider = store.addProvider('openai', { key: 'sk' })
    const added = store.addModels(provider.id, ['gpt-5', 'gpt-5', 'gpt-4.1-mini'])

    expect(added.map(m => m.model)).toEqual(['gpt-5', 'gpt-4.1-mini'])
    expect(store.activeConfigId).toBe(added[0].id)

    store.removeModel(added[0].id)
    expect(store.activeConfigId).toBe(added[1].id)

    store.removeProvider(provider.id)
    expect(store.activeConfigId).toBe(null)
    expect(store.getConfig).toMatchObject({ id: '', url: '', key: '' })
  })

  it('imports both provider lists and legacy config blocks', () => {
    const store = useConfigsStore()
    store.importConfigsBlock([{ id: 'p', name: 'P', models: [{ id: 'm', model: 'x' }] }])
    expect(store.configs.map(c => c.id)).toEqual(['m'])

    store.importConfigsBlock([{ id: 'legacy', url: 'https://a.example.com', key: 'k', model: 'y' }])
    expect(store.configs.map(c => c.id)).toEqual(['legacy'])
    expect(store.activeConfigId).toBe('legacy')
  })
})
