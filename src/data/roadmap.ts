import type { LearningTrack, ModuleKey } from '../types'
import { TRACK_CURRICULUM, itemsForTrack } from './curriculum'
import { GRAMMAR_BRANCHES, GRAMMAR_NODES } from './grammar'
import { CHAPTERS } from './reading'
import { LISTENING_ITEMS } from './listening'
import { SENTENCE_QUESTS } from './sentences'
import { WRITING_TASKS } from './writing'

/**
 * 路线规划视图：列出「当前路线还没开放、但内容库已经存在」的条目。
 *
 * 目的只有一个：把内容边界如实呈现给学习者，而不是让界面上凭空少一块。
 * 未进路线的内容不等于不存在——它们已经有题目与讲解，只是还没有排进这条学段路线，
 * 所以这里统一用「后续规划」措辞，并给出切到哪条路线可以先练到。
 */
export interface PlannedItem {
  id: string
  /** 展示名，如「非限制性定语从句」 */
  name: string
  /** 归属分支/章节标题，用于分组展示 */
  group: string
}

const MODULE_ITEM_NAME: Partial<Record<ModuleKey, (id: string) => string | null>> = {
  grammar: (id) => GRAMMAR_NODES.find((node) => node.id === id)?.name ?? null,
  sentence: (id) => SENTENCE_QUESTS.find((item) => item.id === id)?.sentence.slice(0, 24) ?? null,
  listening: (id) => LISTENING_ITEMS.find((item) => item.id === id)?.text.slice(0, 24) ?? null,
  writing: (id) => WRITING_TASKS.find((item) => item.id === id)?.title ?? null,
  reading: (id) => CHAPTERS.find((item) => item.id === id)?.title ?? null
}

const BRANCH_OF_NODE: Record<string, string> = Object.fromEntries(
  GRAMMAR_NODES.map((node) => {
    const root = (() => {
      let current = node
      while (current.parent) {
        const parent = GRAMMAR_NODES.find((candidate) => candidate.id === current.parent)
        if (!parent) break
        current = parent
      }
      return current.id
    })()
    return [node.id, GRAMMAR_BRANCHES.find((branch) => branch.id === root)?.name ?? '语法技能树']
  })
)

/** 当前路线尚未开放、但已存在于内容库的条目（按模块分组，顺序固定）。 */
export function plannedItems(track: LearningTrack, module: 'grammar' | 'reading'): PlannedItem[] {
  if (module === 'grammar') {
    const open = new Set(TRACK_CURRICULUM[track].content.grammar ?? [])
    return GRAMMAR_NODES.filter((node) => !open.has(node.id))
      .map((node) => ({ id: node.id, name: node.name, group: BRANCH_OF_NODE[node.id] ?? '语法技能树' }))
  }
  const open = new Set((TRACK_CURRICULUM[track].content.reading ?? []))
  return CHAPTERS.filter((chapter) => !open.has(chapter.id))
    .map((chapter) => ({ id: chapter.id, name: chapter.title, group: chapter.intro.slice(0, 18) + '…' }))
}

/** 哪些路线能练到这条内容（用于「切到 X 路线可以先练」的提示）。 */
export function tracksOffering(module: 'grammar' | 'reading', itemId: string): LearningTrack[] {
  const order: LearningTrack[] = ['primary', 'middle-high', 'advanced', 'cet']
  return order.filter((track) => (TRACK_CURRICULUM[track].content[module] ?? []).includes(itemId))
}

/** 逐条统计某模块的内容开放情况：{ 总条目, 本路线开放条目 }。 */
export function moduleCoverage(track: LearningTrack, module: 'grammar' | 'reading'): { open: number; total: number } {
  const library = module === 'grammar' ? GRAMMAR_NODES : CHAPTERS
  const scoped = itemsForTrack(track, module, library as unknown as Array<{ id: string }>)
  return { open: scoped.length, total: library.length }
}

export type { ModuleKey }
