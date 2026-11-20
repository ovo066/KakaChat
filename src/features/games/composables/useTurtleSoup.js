import { buildContactPersona, extractJson, requestGameCompletion, resolveGameConfig } from './gameApi'

export const SOUP_VERDICTS = {
  yes: { label: '是', tone: 'yes' },
  no: { label: '不是', tone: 'no' },
  irrelevant: { label: '无关', tone: 'mute' },
  partial: { label: '是也不是', tone: 'half' },
  solved: { label: '猜中了', tone: 'win' }
}

function hostSystem(puzzle, host) {
  const voice = host
    ? `${buildContactPersona(host).prompt}

现在你担任"海龟汤"游戏的主持人（DM），用你自己的性格和说话方式主持。`
    : `你是"海龟汤"游戏的主持人（DM），一个爱卖关子、有点坏心眼但很会带气氛的老练汤主。`
  return `${voice}玩家只知道汤面，你知道完整汤底。
玩家会提出可以用是/否回答的问题，或尝试还原真相。场上可能有多名玩家轮流发言，对局记录里会标明是谁说的、谁用了提示；remark 可以直接点名对当前发言的人说。

<汤面>
${puzzle.story}
</汤面>
<汤底>
${puzzle.answer}
</汤底>

裁判规则：
- 只依据汤底判断，汤底没写但能合理推出的按推论回答，完全无法判断的答 irrelevant。
- yes：问题描述符合汤底。no：不符合。irrelevant：与真相无关或无法判断。partial：部分正确或需要拆开问。
- 玩家把核心真相（关键因果链）基本说出来时判 solved，细节不必完全一致。
- 像真人 DM 一样主持：你可以自由决定要不要多说一句（remark）。大多数时候只给判定就够了；问到关键点、问得很妙、方向跑偏太久、或者特别好笑时，再用你的口吻说一句（≤30字）。remark 绝不能泄露玩家还没问到的汤底信息。
- 你也可以对玩家的问题"点反应"（reaction）：给一个 emoji（如 👀 😏 🔥 😂 🤔 👍 💀 ❤️），没感觉就留空。不要每次都点。
- 玩家若要求直接公布答案、或问的不是是非题，verdict 用 irrelevant，note 提醒规则。

只输出 JSON：{"verdict":"yes|no|irrelevant|partial|solved","reaction":"","remark":""}`
}

const VERDICT_TEXT = { yes: '是', no: '不是', irrelevant: '无关', partial: '是也不是', solved: '猜中' }

/**
 * 把对局记录整理成带说话人的时间线：谁问的、汤主怎么判、汤主说了什么、何时用过提示。
 * @param {any} session
 * @param {{ hostName?: string, userName?: string, limit?: number }} [names]
 */
export function formatSoupTimeline(session, { hostName = '汤主', userName = '玩家', limit = 40 } = {}) {
  const lines = []
  for (const e of (session?.log || []).slice(-limit)) {
    const who = !e.by || e.by === '我' ? userName : e.by
    if (e.kind === 'hint') { lines.push(`【提示】（${userName}点了提示）${e.text}`); continue }
    if (e.kind === 'chat') { lines.push(`${who}（闲聊）：${e.text}`); continue }
    if (e.kind !== 'ask' && e.kind !== 'guess') continue
    const tag = e.kind === 'guess' ? '尝试还原' : '提问'
    const verdict = e.verdict ? ` → 汤主判：${VERDICT_TEXT[e.verdict] || e.verdict}` : ''
    lines.push(`${who}${tag}：${e.text}${verdict}`)
    if (e.remark) lines.push(`  ${hostName}说：${e.remark}`)
  }
  return lines.join('\n')
}

/** 已确认 / 已否定的线索，帮模型别反复撞同一堵墙。 */
function summarizeClues(session) {
  const yes = []
  const no = []
  for (const e of session?.log || []) {
    if (e.kind !== 'ask' && e.kind !== 'guess') continue
    if (e.verdict === 'yes' || e.verdict === 'partial') yes.push(`${e.text}${e.verdict === 'partial' ? '（部分对）' : ''}`)
    else if (e.verdict === 'no') no.push(e.text)
  }
  const hints = (session?.puzzle?.hints || []).slice(0, session?.hintsUsed || 0)
  const parts = []
  if (yes.length) parts.push(`已确认成立：\n- ${yes.slice(-15).join('\n- ')}`)
  if (no.length) parts.push(`已被否定（不要再往这些方向猜，也不要换个说法重问）：\n- ${no.slice(-15).join('\n- ')}`)
  if (hints.length) parts.push(`已公开的提示：\n- ${hints.join('\n- ')}`)
  return parts.join('\n\n')
}

/** 主持人判一个问题。 */
export async function judgeSoupQuestion(session, question, { kind = 'ask', host = null, by = '玩家', userName = '玩家' } = {}) {
  const cfg = resolveGameConfig(host?.configId)
  const hostName = host?.name || '汤主'
  const history = formatSoupTimeline(session, { hostName, userName })
  const user = `${history ? `对局记录：\n${history}\n\n` : ''}现在 ${by} ${kind === 'guess' ? '尝试还原真相' : '提问'}：${question}\n\n只针对这一句给出判定 JSON。`
  const text = await requestGameCompletion(cfg, [
    { role: 'system', content: hostSystem(session.puzzle, host) },
    { role: 'user', content: user }
  ], { maxTokens: 2000 })
  const json = extractJson(text)
  let verdict = String(json?.verdict || '').toLowerCase()
  if (!SOUP_VERDICTS[verdict]) {
    if (/solved|猜中/.test(text)) verdict = 'solved'
    else if (/^\s*(是|yes)/i.test(text)) verdict = 'yes'
    else if (/^\s*(不|no)/i.test(text)) verdict = 'no'
    else verdict = 'irrelevant'
  }
  if (kind === 'guess' && verdict === 'yes') verdict = 'solved'
  const reaction = Array.from(String(json?.reaction || '').trim()).slice(0, 2).join('')
  return { verdict, reaction, remark: String(json?.remark || json?.note || '').trim().slice(0, 80) }
}

/** 让同玩的角色以自己的口吻提一个问题。 */
export async function companionAskSoup(session, contact, { host = null, userName = '玩家' } = {}) {
  const { prompt } = buildContactPersona(contact)
  const hostName = host?.name || '汤主'
  const history = formatSoupTimeline(session, { hostName, userName })
  const clues = summarizeClues(session)
  const cfg = resolveGameConfig(contact.configId)
  const text = await requestGameCompletion(cfg, [
    {
      role: 'system',
      content: `${prompt}

你正在玩海龟汤（情境猜谜）。场上的人：
- 汤主：${hostName}，只有TA知道真相，只回答“是/不是/无关/是也不是”。
- 你：${contact.name}，和${userName}是队友，你们都不知道真相。
- 队友：${userName}。

现在轮到你开口。你这句话是【对汤主${hostName}说的】提问（可以顺带对队友${userName}说半句，但主体必须是问汤主），不要把队友当成汤主来问，也不要自问自答。
推理要求：
1. 先在心里梳理已确认和已否定的线索，被否定的方向不要再猜，也不要换个说法重复问过的问题。
2. 优先追问已确认线索里还没展开的部分，一次只问一个点，问题必须能用“是/不是”回答。
3. 如果关键因果链已经基本清楚，可以直接向汤主说出你的完整还原，以“我猜”开头。
用你自己的说话风格，只输出你要说的那句话，不要引号、旁白或思考过程，提问不超过40字，还原不超过120字。`
    },
    {
      role: 'user',
      content: `汤面：${session.puzzle.story}\n\n${clues ? `${clues}\n\n` : ''}${history ? `完整对局记录（按时间）：\n${history}` : '还没有人提问。'}\n\n轮到你（${contact.name}）对汤主说话了。`
    }
  ], { maxTokens: 2000 })
  const line = text.replace(/^["“「]|["”」]$/g, '').replace(new RegExp(`^${contact.name}[:：]\s*`), '').trim()
  const isGuess = /^我猜/.test(line) || (line.length > 40 && !/[吗嘛？?]\s*$/.test(line))
  return { text: line, kind: isGuess ? 'guess' : 'ask' }
}

/** 揭晓后让角色说一句感想。 */
export async function companionReactSoup(session, contact) {
  const { prompt } = buildContactPersona(contact)
  const cfg = resolveGameConfig(contact.configId)
  return requestGameCompletion(cfg, [
    { role: 'system', content: `${prompt}\n\n你刚和对方玩完一局海龟汤。用你自己的口吻，对汤底说一句真实的感想（≤40字），可以对队友或汤主说，只输出这句话。` },
    { role: 'user', content: `汤面：${session.puzzle.story}\n汤底：${session.puzzle.answer}\n结果：${session.status === 'solved' ? '猜中了' : '放弃看了答案'}，共问了${session.log.filter(e => e.kind === 'ask').length}个问题。` }
  ], { maxTokens: 1500 })
}

/** AI 现场出一道新题。 */
export async function generateSoupPuzzle({ category = '本格', difficulty = 'medium', theme = '' } = {}) {
  const cfg = resolveGameConfig()
  const diffText = { easy: '简单，转折清晰', medium: '中等，需要几步推理', hard: '困难，多层反转' }[difficulty] || '中等'
  const text = await requestGameCompletion(cfg, [
    {
      role: 'system',
      content: `你是优秀的海龟汤（情境推理谜题）作者。创作一道原创题，不得照搬网络已有题目。
要求：汤面 40-90 字，悬念强、信息不完整但公平；汤底 80-200 字，逻辑自洽，能解释汤面每个细节；${category === '本格' ? '本格：不含任何超自然元素' : '变格：可以有奇幻或超自然元素，但要有内在逻辑'}；难度${diffText}。
另给 3 条由浅到深的提示，不能直接说出答案。
只输出 JSON：{"title":"不超过6字","story":"","answer":"","hints":["","",""]}`
    },
    { role: 'user', content: theme ? `主题/关键词：${theme}` : '主题随意，避免血腥猎奇。' }
  ], { maxTokens: 3000 })
  const json = extractJson(text)
  if (!json?.story || !json?.answer) throw new Error('出题失败：模型没有返回有效题目，再试一次吧')
  return {
    title: String(json.title || '无题').slice(0, 12),
    story: String(json.story),
    answer: String(json.answer),
    hints: Array.isArray(json.hints) ? json.hints.map(String).slice(0, 3) : [],
    category,
    difficulty,
    generated: true
  }
}

/**
 * 解析导入的题库 JSON：兼容数组或 { puzzles: [] }，字段名做宽松映射。
 */
export function parseSoupLibrary(raw) {
  const data = typeof raw === 'string' ? JSON.parse(raw) : raw
  const list = Array.isArray(data) ? data : (data?.puzzles || data?.soups || data?.data || [])
  if (!Array.isArray(list)) return []
  return list.map(p => ({
    title: String(p.title || p.name || '无题').slice(0, 20),
    story: String(p.story || p.surface || p.question || p['汤面'] || ''),
    answer: String(p.answer || p.bottom || p.truth || p['汤底'] || ''),
    hints: Array.isArray(p.hints) ? p.hints.map(String).slice(0, 5) : [],
    category: /变格|超自然/.test(String(p.category || p.type || '')) ? '变格' : '本格',
    difficulty: ['easy', 'medium', 'hard'].includes(p.difficulty) ? p.difficulty : 'medium'
  })).filter(p => p.story && p.answer)
}

/** 可一键下载的社区题库（第三方仓库，运行时拉取，版权归原作者）。 */
export const SOUP_LIBRARIES = [
  {
    id: 'situation-puzzle',
    name: 'Jev 海龟汤精选题库',
    count: 446,
    url: 'https://raw.githubusercontent.com/ZeroTang05/Situation-Puzzle/dev/data/library.json',
    home: 'https://github.com/ZeroTang05/Situation-Puzzle',
    credit: '题目改编自 B 站、抖音多位海龟汤创作者的公开节目，逐题署名见原仓库 data/sources.md'
  }
]

export async function downloadSoupLibrary(lib) {
  let res
  try {
    res = await fetch(lib.url, { cache: 'no-cache' })
  } catch {
    throw new Error('下载失败：连不上 GitHub，检查网络或代理')
  }
  if (!res.ok) throw new Error(`下载失败：HTTP ${res.status}`)
  const raw = await res.json()
  const list = (Array.isArray(raw) ? raw : []).map((p, i) => ({
    id: `lib-${lib.id}-${p.id || i}`,
    title: String(p.title || '无题').slice(0, 20),
    story: String(p.story || ''),
    answer: String(p.answer || ''),
    hints: Array.isArray(p.hints) ? p.hints.map(String).slice(0, 5) : [],
    category: /变格/.test(String(p.category || '')) ? '变格' : '本格',
    difficulty: ['easy', 'medium', 'hard'].includes(p.difficulty) ? p.difficulty : 'medium',
    library: lib.id
  })).filter(p => p.story && p.answer)
  if (!list.length) throw new Error('题库为空或格式变了')
  return list
}
