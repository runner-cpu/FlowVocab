/**
 * 离线口语匹配引擎：本地实现分词与编辑距离，不依赖任何网络或模型。
 * 与 ListeningGame 的跟读匹配思路一致（顺序对齐、忽略大小写与标点），
 * 但在此独立实现，保证模块自包含。
 */
import type { DialogueQuestion, DialogueRule, DialogueScene } from '../data/dialogue'

export interface DialogueMatchResult {
  /** 参考句中成功命中的词（按原句顺序，保留原样大小写） */
  hits: string[]
  /** 参考句中未命中的词 */
  missed: string[]
  /** 命中率 = hits / 参考句词数 */
  ratio: number
  stars: 0 | 1 | 2 | 3
  feedbackZh: string[]
}

/** 静态语法提示模板：规则 id -> 中文提示 */
export const RULE_FEEDBACK: Record<DialogueRule, string> = {
  'past-tense': '注意过去式：规则动词加 -ed，不规则动词要单独记（found / wrote / reached）。',
  plural: '注意名词复数：一般加 -s，部分词加 -es。',
  preposition: '注意介词搭配：in / on / at / under 等要与动词和名词配好。',
  modal: '注意情态动词：can / could / should / will 后面接动词原形。',
  article: '注意冠词：a / an / the 的选择要看名词与语境。'
}

export const RETRY_ADVICE_ZH = '关键信息还没有出现，请听完示范后再说一次。'
export const EMPTY_INPUT_ZH = '没有听到内容，请靠近麦克风或改用打字输入后再提交。'
export const LOW_CONFIDENCE_ZH = '这次识别置信度偏低，如果结果显示不理想，可以再说一遍。'

const LOW_CONFIDENCE_THRESHOLD = 0.35
/** 允许的单词级编辑距离：1 个字母的听写误差视为命中。 */
const MAX_TOKEN_DISTANCE = 1

/** 归一化单个词：小写并去掉标点，保留词内撇号。 */
export function normalizeToken(raw: string): string {
  return (raw ?? '').toLowerCase().replace(/[^a-z0-9']/g, '')
}

/** 纯函数：把一句话切成可比较的词序列（小写、去标点、去空串）。 */
export function normalizeSpoken(text: string): string[] {
  if (typeof text !== 'string' || text.length === 0) return []
  return text
    .split(/[^a-zA-Z0-9']+/)
    .map(normalizeToken)
    .filter(Boolean)
}

/** 编辑距离，带早退：一旦超过 limit 立即返回 limit + 1（本模块只关心是否 <= 1）。 */
export function levenshtein(a: string, b: string, limit = MAX_TOKEN_DISTANCE): number {
  if (a === b) return 0
  if (Math.abs(a.length - b.length) > limit) return limit + 1
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index)
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i]
    let best = i
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      const value = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost)
      current.push(value)
      if (value < best) best = value
    }
    if (best > limit) return limit + 1
    previous = current
  }
  return previous[b.length]
}

function tokensClose(candidate: string, spokenToken: string): boolean {
  return candidate.length > 0 && spokenToken.length > 0 && levenshtein(candidate, spokenToken) <= MAX_TOKEN_DISTANCE
}

/** 顺序对齐：参考句每个词在输入里找最近的一个未消费词（允许编辑距离 <= 1）。 */
function alignReference(reference: string[], spoken: string[]): boolean[] {
  let cursor = 0
  return reference.map((word) => {
    const normalized = normalizeToken(word)
    if (!normalized) return true
    const index = spoken.findIndex((candidate, position) => position >= cursor && tokensClose(normalized, candidate))
    if (index < 0) return false
    cursor = index + 1
    return true
  })
}

function keywordWasSaid(keyword: string, spoken: string[]): boolean {
  const normalized = normalizeToken(keyword)
  return normalized.length > 0 && spoken.some((token) => tokensClose(normalized, token))
}

export interface DistractorHintInput {
  keywords: string[]
  distractors: string[]
  missedKeywords: string[]
  spoken: string[]
}

/** 说了 distractor 而不是 keyword 时，给出「听到 X，本题需要 Y」的提示。 */
export function distractorFeedback(input: DistractorHintInput): string[] {
  const saidDistractors = input.distractors.filter((distractor) => keywordWasSaid(distractor, input.spoken))
  if (saidDistractors.length === 0) return []
  const hints: string[] = []
  for (const keyword of input.missedKeywords) {
    const target = normalizeToken(keyword)
    const closest = saidDistractors
      .map((distractor) => ({ distractor, distance: levenshtein(normalizeToken(distractor), target, 3) }))
      .sort((a, b) => a.distance - b.distance)[0]
    if (!closest || closest.distance > 3) continue
    const line = `听到的是「${closest.distractor}」，本题需要「${keyword}」。`
    if (!hints.includes(line)) hints.push(line)
  }
  return hints
}

/** 供 UI 高亮使用：参考句每个词是否在输入里被命中（顺序一致、允许 1 个字母误差）。 */
export function referenceFlags(spokenText: string, referenceSentence: string): boolean[] {
  const referenceWords = (referenceSentence ?? '').split(/\s+/).filter(Boolean)
  return alignReference(referenceWords, normalizeSpoken(spokenText ?? ''))
}

export function matchDialogueAnswer(
  spokenText: string,
  question: DialogueQuestion,
  confidence = 1
): DialogueMatchResult {
  const referenceWords = (question?.spoken ?? '').split(/\s+/).filter(Boolean)
  const spoken = normalizeSpoken(spokenText ?? '')
  const flags = alignReference(referenceWords, spoken)
  const hits = referenceWords.filter((_, index) => flags[index])
  const missed = referenceWords.filter((_, index) => !flags[index])
  const ratio = referenceWords.length === 0 ? 0 : hits.length / referenceWords.length

  const keywords = (question?.keywords ?? []).filter((keyword) => typeof keyword === 'string' && keyword.trim().length > 0)
  const missedKeywords = keywords.filter((keyword) => !keywordWasSaid(keyword, spoken))
  const keywordRatio = keywords.length === 0 ? 1 : (keywords.length - missedKeywords.length) / keywords.length
  const allKeywordsHit = keywords.length > 0 && missedKeywords.length === 0
  const hasInput = spoken.length > 0

  let stars: 0 | 1 | 2 | 3 = 0
  if (hasInput && keywords.length > 0) {
    if (allKeywordsHit && ratio >= 0.85) stars = 3
    else if (allKeywordsHit) stars = 2
    else if (keywordRatio >= 0.5) stars = 1
  }

  const feedbackZh: string[] = []
  if (!hasInput) feedbackZh.push(EMPTY_INPUT_ZH)
  else if (stars === 3) feedbackZh.push('关键词全部命中，整句还原度很高，继续保持！')
  else if (stars === 2) feedbackZh.push('关键词全部命中，个别词还要再确认一下。')
  else if (stars === 1) feedbackZh.push('命中了半数以上关键词，把整句说完整会更好。')
  else feedbackZh.push(RETRY_ADVICE_ZH)
  feedbackZh.push(RULE_FEEDBACK[question?.rule ?? 'preposition'] ?? RULE_FEEDBACK.preposition)
  feedbackZh.push(
    ...distractorFeedback({
      keywords,
      distractors: question?.distractors ?? [],
      missedKeywords,
      spoken
    })
  )
  if (hasInput && Number.isFinite(confidence) && confidence < LOW_CONFIDENCE_THRESHOLD) feedbackZh.push(LOW_CONFIDENCE_ZH)

  return { hits, missed, ratio, stars, feedbackZh }
}

/** 场景星数：按已通过题目数占场景总题数的比例给星。 */
export function dialogueStars(passedIds: Set<string>, scene: DialogueScene): 0 | 1 | 2 | 3 {
  const questions = scene?.questions ?? []
  const total = questions.length
  if (total <= 0) return 0
  const passed = questions.filter((question) => passedIds?.has(question.id)).length
  const ratio = passed / total
  if (ratio >= 1) return 3
  if (ratio >= 0.7) return 2
  if (ratio >= 0.4) return 1
  return 0
}
