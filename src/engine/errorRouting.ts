/**
 * 错因路由（离线规则层）
 *
 * 把一道错题的可观测信号（模块、题型、选项文本、作答文本、写作改错标记词）
 * 映射到稳定的错因标签 ErrorTag，并按标签给出中文规则卡。
 *
 * 设计约束：
 * - 纯函数、无副作用、无随机、无时间依赖，同样的入参永远得到同样的标签。
 * - 对残缺数据（字段缺失、类型不对、options 传了对象）一律降级为 'generic'，绝不抛错。
 * - 选项形状启发式只在「填空型练习」（题干含 ___ 或 grammar/writing 模块）上启用，
 *   避免把阅读理解里恰好以 which / -ed 结尾的选项误判成语法考点。
 */

export const ERROR_TAGS = [
  'tense',
  'agreement',
  'article',
  'preposition',
  'word-choice',
  'word-form',
  'clause',
  'spelling',
  'listening-detail',
  'generic'
] as const

export type ErrorTag = (typeof ERROR_TAGS)[number]

export interface ErrorRoutingInput {
  /** 模块标识：'vocab' | 'grammar' | 'sentence' | 'listening' | 'writing' | 'reading'（容忍任意字符串） */
  module?: string
  /** 题型 / 词汇模式：'meaning' | 'listening' | 'spelling' | ... */
  mode?: string
  /** 题干或含空格的句子 */
  prompt?: string
  /** 写作改错等题型里的原句 */
  sentence?: string
  /** 选项文本，允许字符串或 { text } 对象 */
  options?: (string | { text?: string })[]
  /** 学习者选择的内容 */
  chosen?: string
  /** 正确答案文本 */
  correctAnswer?: string
  /** 词汇题目标词 */
  word?: string
  /** 写作改错题在题干中标记出的错误词 */
  flaggedWords?: string[]
  /** 已有的数据层解释文案（只作为弱信号） */
  explain?: string
}

export interface RuleContext {
  word?: string
  chosen?: string
  correctAnswer?: string
  prompt?: string
}

export interface RuleCard {
  title: string
  body: string
  cue: string
}

/** 每个标签的中文短名，供 UI 徽标与播报复用。 */
export const ERROR_TAG_LABELS: Record<ErrorTag, string> = {
  tense: '时态',
  agreement: '主谓一致',
  article: '冠词',
  preposition: '介词',
  'word-choice': '词义辨析',
  'word-form': '词形变化',
  clause: '从句',
  spelling: '拼写',
  'listening-detail': '听力细节',
  generic: '综合'
}

// ---------------------------------------------------------------------------
// 词表与正则
// ---------------------------------------------------------------------------

const ARTICLE_WORDS = new Set(['a', 'an', 'the'])
const RELATIVE_STRONG = new Set(['who', 'whom', 'whose', 'which'])
const RELATIVE_WEAK = new Set(['that', 'when', 'where', 'why', 'whether', 'if'])
const PREPOSITION_WORDS = new Set([
  'in', 'on', 'at', 'by', 'with', 'for', 'of', 'to', 'from', 'since',
  'during', 'about', 'into', 'over', 'under', 'between', 'among',
  'through', 'without', 'against', 'before', 'after'
])
const AGREEMENT_HELPERS = new Set([
  'am', 'is', 'are', 'was', 'were', 'do', 'does', 'did',
  "don't", "doesn't", "didn't", 'be', 'been'
])
const PERFECT_AUX = new Set(['has', 'have', 'had', 'will', 'would', 'shall', 'should'])
const IRREGULAR_PAST = new Set([
  'went', 'came', 'saw', 'took', 'made', 'got', 'said', 'gave', 'knew',
  'thought', 'wrote', 'spoke', 'ate', 'ran', 'told', 'heard', 'felt',
  'left', 'met', 'paid', 'bought', 'brought', 'taught', 'caught', 'built',
  'sent', 'spent', 'found', 'held', 'kept', 'slept', 'won', 'began',
  'chose', 'drove', 'fell', 'grew', 'lost', 'rose'
])
const DERIVATION_SUFFIXES = [
  'tion', 'sion', 'ment', 'ness', 'ity', 'ance', 'ence',
  'ful', 'less', 'ly', 'ous', 'ive', 'able', 'ible', 'al'
]
/** 动词形式后缀，用于「同一词干的多种形式」兜底判断。 */
const VERB_FORM_SUFFIXES = ['ing', 'ed', 'es', 's', 'n', 'd']

/** 时间状语 / 完成时助动词 / 将来标记，命中即判为时态问题。 */
const TENSE_MARKERS = /\b(yesterday|last night|last week|last month|last year|ago|already|yet|ever|never|so far|by the time|recently|since|has|have|had|tomorrow|will|would)\b/
/** 明显的年份（in 2010）同样提示过去时或完成时。 */
const YEAR_MARKER = /\b(1[89]\d{2}|20[0-4]\d)\b/
/** 填空型练习标志：题干含连续下划线。 */
const BLANK_MARKER = /_{2,}/

// ---------------------------------------------------------------------------
// 输入规范化
// ---------------------------------------------------------------------------

function asText(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function lowerText(value: unknown): string {
  return asText(value).trim().toLowerCase()
}

function tokenize(value: unknown): string[] {
  return lowerText(value)
    .replace(/[\u2018\u2019]/g, "'")
    .split(/[^a-z0-9']+/)
    .filter(Boolean)
}

function readOptionTexts(options: unknown): string[] {
  if (!Array.isArray(options)) return []
  const texts: string[] = []
  for (const entry of options) {
    if (typeof entry === 'string') texts.push(entry)
    else if (entry && typeof entry === 'object' && typeof (entry as { text?: unknown }).text === 'string') {
      texts.push((entry as { text: string }).text)
    }
  }
  return texts
}

function optionFirstTokens(options: unknown): string[] {
  return readOptionTexts(options)
    .map((option) => tokenize(option)[0])
    .filter((token): token is string => !!token)
}

function optionLastTokens(options: unknown): string[] {
  return readOptionTexts(options)
    .map((option) => tokenize(option).slice(-1)[0])
    .filter((token): token is string => !!token)
}

function optionAllTokens(options: unknown): string[] {
  return readOptionTexts(options).flatMap(tokenize)
}

// ---------------------------------------------------------------------------
// 形状启发式
// ---------------------------------------------------------------------------

/**
 * 判断两个词是否"长得像"（共享足够长的词首/词尾），用于词汇题近形选项与对比卡命中。
 * 完全相同的词、或任一侧不足 3 个字母时返回 false。
 */
export function sharesLookAlikeStem(a: unknown, b: unknown): boolean {
  const clean = (value: unknown) => lowerText(value).replace(/[^a-z]/g, '')
  const x = clean(a)
  const y = clean(b)
  if (x.length < 3 || y.length < 3 || x === y) return false
  let prefix = 0
  while (prefix < x.length && prefix < y.length && x[prefix] === y[prefix]) prefix += 1
  let suffix = 0
  while (
    suffix < x.length - prefix &&
    suffix < y.length - prefix &&
    x[x.length - 1 - suffix] === y[y.length - 1 - suffix]
  ) suffix += 1
  return prefix >= 3 || suffix >= 4 || (prefix >= 2 && suffix >= 2) || prefix + suffix >= 5
}

/** 选项里出现"同词干 + 不同派生后缀"（decide / decision / decisive）→ 词形变化。 */
function hasDerivationPair(tokens: string[]): boolean {
  for (const token of tokens) {
    for (const suffix of DERIVATION_SUFFIXES) {
      if (!token.endsWith(suffix) || token.length - suffix.length < 4) continue
      const stem = token.slice(0, token.length - suffix.length)
      for (const other of tokens) {
        if (other === token) continue
        if (other === stem || other.startsWith(stem) || (stem.startsWith(other) && other.length >= 4)) return true
      }
    }
  }
  return false
}

/** 至少两个不同的 be/do 助动词形式同现（is/are、don't/doesn't）→ 主谓一致。 */
function hasAgreementSignal(tokens: string[]): boolean {
  return new Set(tokens.filter((token) => AGREEMENT_HELPERS.has(token))).size >= 2
}

/** 选项里出现 -ed、不规则过去式或完成/将来助动词 → 时态。 */
function hasTenseTokenSignal(tokens: string[]): boolean {
  return tokens.some(
    (token) =>
      (token.length >= 4 && token.endsWith('ed')) ||
      IRREGULAR_PAST.has(token) ||
      PERFECT_AUX.has(token)
  )
}

/** 去掉动词形式后缀得到词干，用于 seeing / seen / see 这类纯动词变形的兜底。 */
function verbStem(token: string): string {
  for (const suffix of VERB_FORM_SUFFIXES) {
    if (token.length - suffix.length >= 3 && token.endsWith(suffix)) return token.slice(0, token.length - suffix.length)
  }
  return token
}

/** 三个以上选项共享同一词干但词形不同 → 词形变化。 */
function hasVerbFormVariants(options: unknown): boolean {
  const tokens = optionLastTokens(options)
  if (tokens.length < 3) return false
  const groups = new Map<string, Set<string>>()
  for (const token of tokens) {
    const stem = verbStem(token)
    const forms = groups.get(stem) ?? new Set<string>()
    forms.add(token)
    groups.set(stem, forms)
  }
  for (const forms of groups.values()) {
    if (forms.size >= 3) return true
  }
  return false
}

// ---------------------------------------------------------------------------
// 路由
// ---------------------------------------------------------------------------

/**
 * 填空题文本匹配器。按固定优先级检查，保证同样输入永远得到同样标签。
 * 优先级：时态标记 > 冠词选项 > 从句引导词 > 词形派生 > 介词选项 > 主谓一致 > 动词形式（时态兜底）。
 */
function matchBlankExercise(promptText: string, options: unknown): ErrorTag | null {
  const firsts = optionFirstTokens(options)
  const tokens = optionAllTokens(options)
  if (TENSE_MARKERS.test(promptText) || YEAR_MARKER.test(promptText)) return 'tense'
  if (firsts.filter((token) => ARTICLE_WORDS.has(token)).length >= 2) return 'article'
  if (firsts.some((token) => RELATIVE_STRONG.has(token)) || firsts.filter((token) => RELATIVE_WEAK.has(token)).length >= 2) return 'clause'
  if (hasDerivationPair(tokens)) return 'word-form'
  if (firsts.filter((token) => PREPOSITION_WORDS.has(token)).length >= 2) return 'preposition'
  if (hasAgreementSignal(tokens)) return 'agreement'
  if (hasTenseTokenSignal(tokens)) return 'tense'
  if (hasVerbFormVariants(options)) return 'word-form'
  return null
}

/** 写作改错题：优先按题干中标记出的错误词路由，无法判断时返回 null 交给通用匹配器。 */
function routeFlaggedWords(flagged: unknown, options: unknown): ErrorTag | null {
  const texts = Array.isArray(flagged) ? flagged.filter((entry): entry is string => typeof entry === 'string') : []
  if (!texts.length) return null
  const firsts = texts.map((text) => tokenize(text)[0]).filter((token): token is string => !!token)
  const tokens = texts.flatMap(tokenize)
  if (firsts.some((token) => AGREEMENT_HELPERS.has(token))) return 'agreement'
  if (tokens.some((token) => PERFECT_AUX.has(token) || IRREGULAR_PAST.has(token) || (token.length >= 4 && token.endsWith('ed')))) return 'tense'
  if (firsts.some((token) => ARTICLE_WORDS.has(token))) return 'article'
  if (firsts.some((token) => PREPOSITION_WORDS.has(token))) return 'preposition'
  if (hasDerivationPair([...tokens, ...optionAllTokens(options)])) return 'word-form'
  return null
}

/**
 * 错因推断。永远返回一个 ErrorTag，绝不抛错。
 */
export function inferErrorTag(input: ErrorRoutingInput | null | undefined = {}): ErrorTag {
  try {
    const data = input ?? {}
    const module = lowerText(data.module)
    const mode = lowerText(data.mode)
    const promptText = [lowerText(data.prompt), lowerText(data.sentence), lowerText(data.explain)].join(' ')

    if (mode === 'listening') return 'listening-detail'
    if (mode === 'spelling') return 'spelling'
    if (module === 'listening') return 'listening-detail'

    const hasOptions = readOptionTexts(data.options).length > 0
    const chosen = lowerText(data.chosen)
    const answer = lowerText(data.correctAnswer) || lowerText(data.word)

    // 词汇：无选项且有作答文本 = 拼写/打字流程；有选项 = 选择释义，错选属词义辨析。
    if (module === 'vocab' && !hasOptions && chosen) return 'spelling'

    if (module === 'writing' && Array.isArray(data.flaggedWords) && data.flaggedWords.length) {
      const routed = routeFlaggedWords(data.flaggedWords, data.options)
      if (routed) return routed
    }

    const blankExercise = BLANK_MARKER.test(promptText) || module === 'grammar' || module === 'writing'
    if (blankExercise) {
      const matched = matchBlankExercise(promptText, data.options)
      if (matched) return matched
    }

    if (module === 'vocab') {
      if (chosen && answer && sharesLookAlikeStem(chosen, answer)) return 'word-choice'
      if (chosen && hasOptions) return 'word-choice'
    }

    return 'generic'
  } catch {
    return 'generic'
  }
}

// ---------------------------------------------------------------------------
// 规则卡
// ---------------------------------------------------------------------------

interface RuleTemplate {
  title: string
  body: string
  cues: string[]
}

const RULE_TEMPLATES: Record<ErrorTag, RuleTemplate> = {
  tense: {
    title: '时态与时间标志',
    body: '先找句中的时间标志词：yesterday/last night/ago 指向过去时，since/for/already/yet 常配现在完成时，-ed 或 have/has + 过去分词是明确信号。定好时间线，再选谓语形式。',
    cues: ['先读时间状语，再定时态。', '把时间线画出来，时态自己会站好队。', '看到 since 或 already，优先想完成时。']
  },
  agreement: {
    title: '主谓一致',
    body: '先确定真正的主语，再让人称和数与谓语保持一致：第三人称单数动词加 -s/-es，be 动词按主语选 am/is/are。主语后面的修饰语不影响谓语。',
    cues: ['先圈主语，再配谓语。', '主语是单数，谓语就用单数。', '别被主语后面的修饰成分带跑。']
  },
  article: {
    title: '冠词判断',
    body: 'a/an 表泛指，an 用于元音音素开头的词；the 表特指或上文已提到的人或物。固定搭配中的冠词要按搭配整体记，不按字面推理。',
    cues: ['先听首音，再决定 a 还是 an。', '特指用 the，泛指用 a/an。', '固定搭配整体记，别拆开猜。']
  },
  preposition: {
    title: '介词搭配',
    body: '时间介词按由大到小的粒度选：月份年份用 in，具体某天用 on，具体时刻用 at。其余介词多与动词、形容词构成固定搭配，要把整块短语一起背。',
    cues: ['时间粒度：in → on → at。', '介词看搭配，不看中文直译。', '把动词和介词当成一个整体记。']
  },
  'word-choice': {
    title: '近义词辨析',
    body: '选项与答案词形或词义相近时，先比较词性和核心含义，再把每个选项放回原句验证搭配。长得像的两个词往往不能互换。',
    cues: ['同形不同义，先看搭配。', '把两个词都放回句子读一遍。', '记差别，而不是只记拼写。']
  },
  'word-form': {
    title: '词形与词性',
    body: '先判断空格在句中充当什么成分：主语或宾语位置多用名词，修饰名词用形容词，修饰动词或整句用副词，做谓语才用限定动词形式（-ing/-ed/to do 属于非谓语）。定了成分再选词形。',
    cues: ['先定成分，再定词形。', '-tion/-ment 多为名词，-ly 多为副词。', '看空格前后，而不是只看中文意思。']
  },
  clause: {
    title: '从句引导词',
    body: '先看从句缺什么成分：缺主语或宾语用 who/which/that，缺状语用 when/where/why。先行词指人还是指物决定用 who 还是 which；非限制性从句不能用 that。',
    cues: ['先看从句缺什么成分。', '缺成分用代词，缺状语用副词。', '逗号后面的非限制性从句别用 that。']
  },
  spelling: {
    title: '拼写还原',
    body: '按读音把单词切成音节，再逐段拼写；重点检查双写辅音、不发音字母和 -ei/-ie 的顺序。拼完默读一遍，用发音反查拼写。',
    cues: ['按音节分段拼，逐段核对。', '拼完默读一遍再提交。', '留意不发音的字母和双写辅音。']
  },
  'listening-detail': {
    title: '听音细节',
    body: '先抓句子主干和场景，再回填被挖空的词。注意相近音素（如 /i:/ 与 /ɪ/）以及词尾 -s/-ed 是否读出，这些细节决定选项对错。',
    cues: ['先听主干，再补细节。', '留意词尾的 -s 和 -ed。', '长音短音要分清。']
  },
  generic: {
    title: '回到语境',
    body: '把正确选项放回原句通读一遍，确认语义、搭配和语法都通顺；再回想这次错在哪个环节，把它记成下一次的判断线索。',
    cues: ['先通读，再总结错因。', '把正确答案读出声。', '记录错因，下次判断更快。']
  }
}

/** 稳定散列（djb2），用于在同一标签的多条提示语中做确定性选择。 */
function stableHash(value: string): number {
  let hash = 5381
  for (let i = 0; i < value.length; i += 1) hash = ((hash << 5) + hash + value.charCodeAt(i)) >>> 0
  return hash
}

/**
 * 返回某个错因标签的中文规则卡 { title, body, cue }。
 * 同样的 (tag, context) 永远得到同样的结果；context 只影响 cue 的确定性与补充信息。
 */
export function ruleExplanation(tag: ErrorTag, context: RuleContext = {}): RuleCard {
  const template = RULE_TEMPLATES[tag] ?? RULE_TEMPLATES.generic
  const seed = [asText(context.word), asText(context.chosen), asText(context.correctAnswer), asText(context.prompt), template.title].join('|')
  const cue = template.cues[stableHash(seed) % template.cues.length]
  const chosen = asText(context.chosen).trim()
  const answer = asText(context.correctAnswer).trim()
  const detail = chosen && answer && chosen !== answer ? `你选了「${chosen}」，正确答案是「${answer}」。` : ''
  return {
    title: template.title,
    body: template.body,
    cue: detail ? `${cue}${detail}` : cue
  }
}
