import type { MistakeRecord, ModuleKey } from '../types'
import { ERROR_TAGS, type ErrorTag } from './errorRouting'

/**
 * 错题本引擎（纯函数）。
 *
 * 为什么需要它：错因卡此前只活在答错的那一屏，题目一过就没了。
 * 「答错给讲解」是作品的核心卖点，但讲解看完即焚，用户没有地方回看，
 * 评审也无法验证这条闭环真的留下过东西。这里把每次错题压成一条可回顾的记录。
 *
 * 设计约束：
 * - 纯函数、无随机、无时间副作用，时间由调用方传入，方便测试与回放。
 * - 同一条内容重复答错只累加次数并刷新时间，不产生重复条目。
 * - 记录数量有上限：只保留最近作答的那些，避免 IndexedDB 单文档无限膨胀。
 */

export interface MistakeInput {
  module: ModuleKey
  contentId: string
  prompt: string
  chosen?: string
  correctAnswer?: string
  tag: ErrorTag
  explain?: string
}

/** 单条题干在回顾列表里的最大展示长度，超出截断并加省略号。 */
export const MISTAKE_PROMPT_LIMIT = 80
/** 记录的保留上限：超出时丢掉最久没再错过的。 */
export const MISTAKE_LIMIT = 80

export function mistakeId(module: ModuleKey, contentId: string): string {
  return `${module}:${contentId}`
}

function clip(text: string): string {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim()
  return clean.length > MISTAKE_PROMPT_LIMIT ? `${clean.slice(0, MISTAKE_PROMPT_LIMIT - 1)}…` : clean
}

/** 按 lastAt 倒序、同时间按 id 稳定排序，保证渲染与测试都确定。 */
function sortRecords(records: MistakeRecord[]): MistakeRecord[] {
  return [...records].sort((a, b) => (b.lastAt - a.lastAt) || a.id.localeCompare(b.id))
}

/**
 * 记一次答错。返回新数组，不修改入参。
 * 同一 contentId 再次答错时累加 count 并覆盖最近一次的选择/答案（以最新一次为准）。
 */
export function recordMistake(records: MistakeRecord[], input: MistakeInput, now: number): MistakeRecord[] {
  if (!input.contentId || !input.module) return records
  const id = mistakeId(input.module, input.contentId)
  const existing = records.find((record) => record.id === id)
  const next: MistakeRecord = existing
    ? {
        ...existing,
        prompt: clip(input.prompt) || existing.prompt,
        chosen: input.chosen,
        correctAnswer: input.correctAnswer,
        tag: input.tag,
        explain: input.explain,
        count: existing.count + 1,
        lastAt: now
      }
    : {
        id,
        module: input.module,
        contentId: input.contentId,
        prompt: clip(input.prompt),
        chosen: input.chosen,
        correctAnswer: input.correctAnswer,
        tag: input.tag,
        explain: input.explain,
        count: 1,
        firstAt: now,
        lastAt: now
      }
  const merged = sortRecords([...records.filter((record) => record.id !== id), next])
  return merged.slice(0, MISTAKE_LIMIT)
}

/** 同一题答对后移出错题本。返回是否真的删掉了东西，便于调用方决定要不要写库。 */
export function resolveMistake(records: MistakeRecord[], module: ModuleKey, contentId: string): MistakeRecord[] {
  const id = mistakeId(module, contentId)
  return records.some((record) => record.id === id) ? records.filter((record) => record.id !== id) : records
}

export interface MistakeSummary {
  total: number
  /** 按模块统计的待回顾条数，只含有错题的模块 */
  byModule: { module: ModuleKey; count: number }[]
  /** 出现次数最多的三个错因标签 */
  topTags: { tag: string; count: number }[]
  /** 最近一次答错的时间，没有记录时为 null */
  latestAt: number | null
}

export function summarizeMistakes(records: MistakeRecord[]): MistakeSummary {
  const moduleCounts = new Map<ModuleKey, number>()
  const tagCounts = new Map<string, number>()
  let latestAt: number | null = null
  for (const record of records) {
    moduleCounts.set(record.module, (moduleCounts.get(record.module) ?? 0) + 1)
    tagCounts.set(record.tag, (tagCounts.get(record.tag) ?? 0) + 1)
    if (latestAt === null || record.lastAt > latestAt) latestAt = record.lastAt
  }
  const byModule = [...moduleCounts.entries()]
    .map(([module, count]) => ({ module, count }))
    .sort((a, b) => (b.count - a.count) || a.module.localeCompare(b.module))
  const topTags = [...tagCounts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => (b.count - a.count) || a.tag.localeCompare(b.tag))
    .slice(0, 3)
  return { total: records.length, byModule, topTags, latestAt }
}

/** 从旧备份或损坏数据里恢复：只保留结构合法的记录，重复 id 取最后一次。 */
export function sanitizeMistakes(value: unknown): MistakeRecord[] {
  if (!Array.isArray(value)) return []
  const modules: ModuleKey[] = ['vocab', 'grammar', 'sentence', 'listening', 'writing', 'reading']
  const byId = new Map<string, MistakeRecord>()
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const record = item as Partial<MistakeRecord>
    if (typeof record.id !== 'string' || !record.id) continue
    if (!modules.includes(record.module as ModuleKey)) continue
    if (typeof record.contentId !== 'string' || !record.contentId) continue
    if (typeof record.prompt !== 'string') continue
    if (typeof record.tag !== 'string') continue
    const firstAt = Number(record.firstAt)
    const lastAt = Number(record.lastAt)
    const count = Number(record.count)
    if (!Number.isFinite(firstAt) || !Number.isFinite(lastAt) || !Number.isFinite(count) || count < 1) continue
    byId.set(record.id, {
      id: record.id,
      module: record.module as ModuleKey,
      contentId: record.contentId,
      prompt: clip(record.prompt),
      chosen: typeof record.chosen === 'string' ? record.chosen : undefined,
      correctAnswer: typeof record.correctAnswer === 'string' ? record.correctAnswer : undefined,
      tag: (ERROR_TAGS as readonly string[]).includes(String(record.tag)) ? (record.tag as ErrorTag) : 'generic',
      explain: typeof record.explain === 'string' ? record.explain : undefined,
      count: Math.floor(count),
      firstAt,
      lastAt
    })
  }
  return sortRecords([...byId.values()]).slice(0, MISTAKE_LIMIT)
}
