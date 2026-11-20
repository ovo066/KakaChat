const RAW_ICONS = import.meta.glob('../../assets/brand-icons/*.svg', { eager: true, query: '?raw', import: 'default' })

const BRAND_SVGS = Object.fromEntries(
  Object.entries(RAW_ICONS).map(([path, svg]) => [path.replace(/^.*\/|\.svg$/g, ''), String(svg)])
)

/** 品牌主色：模型行用浅色底 + 品牌色图形；null 表示黑白品牌，跟随文字颜色 */
const BRAND_COLORS = Object.freeze({
  openai: null,
  claude: '#D97757',
  gemini: '#3186FF',
  gemma: '#446EFF',
  deepseek: '#4D6BFE',
  openrouter: '#6566F1',
  siliconcloud: '#6E29F6',
  volcengine: '#006EFF',
  doubao: '#1E37FC',
  bailian: '#615CED',
  qwen: '#615CED',
  kimi: null,
  zhipu: '#3859FF',
  xai: null,
  grok: null,
  ollama: null,
  minimax: '#E2167E',
  meta: '#0082FB',
  mistral: '#FA500F',
  yi: '#16A34A',
  baichuan: '#FF6933',
  hunyuan: '#0055E9',
  wenxin: '#0A51C3',
  stepfun: '#0160FF',
  spark: '#1652D8',
  cohere: '#39594D',
  microsoft: '#00A4EF',
  internlm: null,
  sensenova: '#5B2AD8'
})

const BRAND_LABELS = Object.freeze({
  openai: 'OpenAI',
  claude: 'Claude',
  gemini: 'Gemini',
  gemma: 'Gemma',
  deepseek: 'DeepSeek',
  qwen: '通义千问',
  kimi: 'Kimi',
  zhipu: 'GLM',
  grok: 'Grok',
  doubao: '豆包',
  minimax: 'MiniMax',
  meta: 'Llama',
  mistral: 'Mistral',
  hunyuan: '混元',
  wenxin: '文心',
  baichuan: '百川',
  yi: '零一万物',
  stepfun: '阶跃星辰',
  spark: '讯飞星火',
  cohere: 'Cohere',
  microsoft: 'Phi',
  internlm: '书生',
  sensenova: '日日新'
})

const MODEL_FAMILY_RULES = [
  [/claude/, 'claude'],
  [/gemma/, 'gemma'],
  [/gemini|learnlm|imagen-|veo-/, 'gemini'],
  [/deepseek/, 'deepseek'],
  [/qwen|qwq|qvq/, 'qwen'],
  [/kimi|moonshot/, 'kimi'],
  [/glm|cogview|cogvideo|codegeex|charglm|emohaa/, 'zhipu'],
  [/grok/, 'grok'],
  [/doubao|skylark/, 'doubao'],
  [/minimax|abab/, 'minimax'],
  [/llama|meta-/, 'meta'],
  [/mistral|mixtral|codestral|pixtral|magistral|devstral|ministral|voxtral/, 'mistral'],
  [/hunyuan/, 'hunyuan'],
  [/ernie/, 'wenxin'],
  [/baichuan/, 'baichuan'],
  [/(^|\/)yi-/, 'yi'],
  [/(^|\/)step-|stepfun/, 'stepfun'],
  [/spark|generalv/, 'spark'],
  [/(^|\/)command|(^|\/)aya|cohere|c4ai/, 'cohere'],
  [/(^|\/)phi-|wizardlm/, 'microsoft'],
  [/internlm|intern-s1|internvl/, 'internlm'],
  [/sensenova|sensechat/, 'sensenova'],
  [/(^|\/)(gpt|chatgpt|o[1-9](-|$)|davinci|babbage|text-embedding|dall-e|tts-1|whisper|omni-moderation|codex)/, 'openai']
]

export function getBrandSvg(brand) {
  return BRAND_SVGS[String(brand || '')] || ''
}

export function getBrandColor(brand) {
  return BRAND_COLORS[String(brand || '')] ?? null
}

/** 按模型 ID 识别模型家族，用于模型行图标；识别不到返回空字符串 */
export function resolveModelBrand(modelId) {
  const id = String(modelId || '').trim().toLowerCase()
  if (!id) return ''
  for (const [pattern, brand] of MODEL_FAMILY_RULES) {
    if (pattern.test(id)) return brand
  }
  return ''
}

export function getBrandLabel(brand) {
  return BRAND_LABELS[String(brand || '')] || '其他'
}
