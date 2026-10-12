import type { LearningTrack, ModuleKey } from '../types'
import { MODULE_META, TRACK_MODULE_FOCUS } from '../types'
import { TRACK_CURRICULUM, itemsForTrack } from './curriculum'
import { GRAMMAR_NODES } from './grammar'
import { SENTENCE_QUESTS } from './sentences'
import { LISTENING_ITEMS } from './listening'
import { WRITING_TASKS } from './writing'
import { CHAPTERS } from './reading'

/**
 * 知识结构视图：把「学习路线 × 训练模块」的开放范围算成可展示的数字。
 *
 * 只读派生，不改动任何内容源：本模块的每个数字都能追到 curriculum.ts 的
 * 内容清单或某个 data/*.ts 的题库长度，避免出现说明书与实现不一致的课程叙事。
 */
export interface ModuleScope {
  module: ModuleKey
  /** 模块名，如「词汇·微光港」 */
  name: string
  /** 本路线在该模块的训练侧重（来自 TRACK_MODULE_FOCUS） */
  focus: string
  /** 本路线是否开放该模块 */
  available: boolean
  /** 本路线开放的内容条目数 */
  open: number
  /** 内容库条目总数 */
  total: number
  /** 计数的单位，如「难度档」「知识点」「章」 */
  unit: string
}

const MODULE_ORDER: ModuleKey[] = ['vocab', 'grammar', 'sentence', 'listening', 'writing', 'reading']

const TOTALS: Record<ModuleKey, { total: number; unit: string }> = {
  vocab: { total: 5, unit: '难度档' },
  grammar: { total: GRAMMAR_NODES.length, unit: '知识点' },
  sentence: { total: SENTENCE_QUESTS.length, unit: '组题' },
  listening: { total: LISTENING_ITEMS.length, unit: '段听写' },
  writing: { total: WRITING_TASKS.length, unit: '个任务' },
  reading: { total: CHAPTERS.length, unit: '章' }
}

/** 某条路线在某模块上真正可练的内容条目数。 */
export function openCount(track: LearningTrack, module: ModuleKey): number {
  const curriculum = TRACK_CURRICULUM[track]
  if (!curriculum.modules[module]) return 0
  switch (module) {
    case 'vocab': return curriculum.levels.length
    case 'grammar': return itemsForTrack(track, 'grammar', GRAMMAR_NODES).length
    case 'sentence': return itemsForTrack(track, 'sentence', SENTENCE_QUESTS).length
    case 'listening': return itemsForTrack(track, 'listening', LISTENING_ITEMS).length
    case 'writing': return itemsForTrack(track, 'writing', WRITING_TASKS).length
    case 'reading': return itemsForTrack(track, 'reading', CHAPTERS).length
  }
}

/** 六个模块在一条路线上的开放范围，按固定模块顺序返回。 */
export function trackScopes(track: LearningTrack): ModuleScope[] {
  return MODULE_ORDER.map((module) => ({
    module,
    name: MODULE_META[module].name,
    focus: TRACK_MODULE_FOCUS[track][module],
    available: isAvailable(track, module),
    open: openCount(track, module),
    total: TOTALS[module].total,
    unit: TOTALS[module].unit
  }))
}

function isAvailable(track: LearningTrack, module: ModuleKey): boolean {
  return TRACK_CURRICULUM[track].modules[module] === true
}

/** 单条路线的汇总：开放模块数 / 开放内容总数。 */
export function trackSummary(track: LearningTrack): { modules: number; items: number } {
  const scopes = trackScopes(track)
  return {
    modules: scopes.filter((scope) => scope.available).length,
    items: scopes.reduce((sum, scope) => sum + scope.open, 0)
  }
}
