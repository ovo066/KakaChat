const CLAUDE_SAMPLING_PARAMETERS = Object.freeze(['temperature', 'top_p', 'top_k'])
const OPENAI_REASONING_SAMPLING_PARAMETERS = Object.freeze([
  'temperature',
  'top_p',
  'frequency_penalty',
  'presence_penalty',
  'logprobs',
  'top_logprobs'
])

function normalizeModelId(value) {
  return String(value || '').trim().toLowerCase()
}

function parseClaudeVersion(modelId) {
  if (!modelId.includes('claude')) return null
  const match = modelId.match(
    /claude(?:[-_.](?:opus|sonnet|haiku|fable|mythos))?[-_.](\d{1,2})(?:[-_.](\d{1,2})(?=$|[-_.:/]))?/i
  )
  if (!match) return null
  return {
    major: Number(match[1]),
    minor: match[2] == null ? 0 : Number(match[2])
  }
}

function isClaudeSamplingLocked(modelId) {
  if (!modelId.includes('claude')) return false
  // 中转站常用 xxx-thinking 别名，强制开启思考，只接受 temperature=1
  if (/thinking/i.test(modelId)) return true
  if (/claude[^\s]*[-_.]latest(?:$|[-_.:/])/i.test(modelId)) return true

  const version = parseClaudeVersion(modelId)
  if (!version) return false
  return version.major > 4 || (version.major === 4 && version.minor >= 7)
}

function isOpenAIReasoningModel(modelId) {
  return /(?:^|[/:._-])(?:o[134](?:$|[-_.:])|gpt[-_.]?5(?:$|[-_.:]))/i.test(modelId)
}

export function getModelParameterCompatibility(configOrModel = {}) {
  const model = normalizeModelId(
    typeof configOrModel === 'string' ? configOrModel : configOrModel?.model
  )

  if (isClaudeSamplingLocked(model)) {
    return {
      id: 'claude-latest-sampling',
      model,
      removedParameters: [...CLAUDE_SAMPLING_PARAMETERS],
      temperatureSupported: false,
      description: '该 Claude 模型不接受自定义采样参数'
    }
  }

  if (isOpenAIReasoningModel(model)) {
    return {
      id: 'openai-reasoning-sampling',
      model,
      removedParameters: [...OPENAI_REASONING_SAMPLING_PARAMETERS],
      temperatureSupported: false,
      description: '该推理模型通常不接受自定义采样参数'
    }
  }

  return {
    id: '',
    model,
    removedParameters: [],
    temperatureSupported: true,
    description: ''
  }
}
