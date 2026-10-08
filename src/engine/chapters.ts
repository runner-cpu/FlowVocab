import type { LearningTrack, ModuleKey } from '../types'

/**
 * 主线章节：把六个训练模块串成一条可解锁的港口航线。
 * 每个章节复用现有模块组件，只在外层增加进度、解锁与星级。
 */
export interface ChapterDefinition {
  id: string
  /** 复用哪个训练模块 */
  module: ModuleKey
  /** 航线上的地名 */
  place: string
  title: string
  subtitle: string
  /** 与 LEARNING_SCENES 的序号对应，用于取插画 */
  sceneIndex: number
}

export const CHAPTERS: ChapterDefinition[] = [
  { id: 'harbour', module: 'vocab', place: '词汇灯塔', title: '微光港', subtitle: '在语境里认出新词，点亮第一座灯塔。', sceneIndex: 0 },
  { id: 'garden', module: 'grammar', place: '语法栈桥', title: '语法花园', subtitle: '把规则放回句子，修好通往内港的栈桥。', sceneIndex: 1 },
  { id: 'bridge', module: 'sentence', place: '句子市集', title: '桥梁工坊', subtitle: '拆开长句的骨架，让两岸重新相连。', sceneIndex: 2 },
  { id: 'radio', module: 'listening', place: '听力码头', title: '星际电台', subtitle: '听见节奏与语气，接住进港的信号。', sceneIndex: 3 },
  { id: 'studio', module: 'writing', place: '写作工坊', title: '灵感工作室', subtitle: '用句型卡拼出更自然的表达。', sceneIndex: 4 },
  { id: 'library', module: 'reading', place: '阅读灯塔', title: '故事图书馆', subtitle: '沿着情节找线索，点亮航线终点。', sceneIndex: 5 }
]

export type ChapterStatus = 'locked' | 'current' | 'cleared'

export interface ChapterView extends ChapterDefinition {
  order: number
  stars: number
  status: ChapterStatus
  /** 本章在当前学习路线上是否开放 */
  available: boolean
  /** 未解锁时显示的前置章节名 */
  prerequisite: string | null
  stardust: number
}

export const MAX_STARS = 3
/** 星尘掉落：0★ 不给，1★ 10，2★ 20，3★ 30。 */
export const STARDUST_BY_STARS = [0, 10, 20, 30] as const

export function starsForResult(total: number, correct: number): number {
  if (!Number.isFinite(total) || total <= 0) return 0
  const accuracy = correct / total
  return accuracy >= 0.9 ? 3 : accuracy >= 0.7 ? 2 : accuracy >= 0.4 ? 1 : 0
}

export function stardustForStars(stars: number): number {
  const clamped = Math.max(0, Math.min(MAX_STARS, Math.floor(Number.isFinite(stars) ? stars : 0)))
  return STARDUST_BY_STARS[clamped]
}

export function totalStardust(stars: Record<string, number>): number {
  return Object.values(stars).reduce((sum, value) => sum + stardustForStars(value), 0)
}

/** 章节解锁：路线开放且上一章已有星星（不可用章节视为已跨过）。 */
export function chapterView(
  chapters: ChapterDefinition[],
  stars: Record<string, number>,
  isAvailable: (module: ModuleKey) => boolean,
  track?: LearningTrack
): ChapterView[] {
  let previousSatisfied = true
  let previousPlace: string | null = null
  return chapters.map((chapter, index) => {
    const available = isAvailable(chapter.module)
    const earned = stars[chapter.id]
    const recorded = Number.isFinite(earned) ? Math.max(0, Math.min(MAX_STARS, Math.floor(earned))) : 0
    const gated = available && index > 0 && !previousSatisfied
    const status: ChapterStatus = !available || gated ? 'locked' : recorded > 0 ? 'cleared' : 'current'
    const view: ChapterView = {
      ...chapter,
      order: index + 1,
      stars: recorded,
      status,
      available,
      prerequisite: gated ? previousPlace : null,
      stardust: stardustForStars(recorded)
    }
    if (available) {
      previousSatisfied = recorded > 0
      previousPlace = chapter.place
    }
    void track
    return view
  })
}

export function currentChapterOrder(views: ChapterView[]): number {
  const current = views.find((view) => view.status === 'current')
  return current?.order ?? views.length
}

export function nextChapterId(views: ChapterView[], chapterId: string): string | null {
  const index = views.findIndex((view) => view.id === chapterId)
  if (index < 0) return null
  const next = views.slice(index + 1).find((view) => view.available && view.status !== 'locked')
  return next?.id ?? null
}

/** 关卡结算：只记录更好的成绩，返回本次实际获得的星尘。 */
export function applyChapterResult(
  stars: Record<string, number>,
  chapterId: string,
  earned: number
): { stars: Record<string, number>; improved: boolean; stardustGained: number } {
  const clamped = Math.max(0, Math.min(MAX_STARS, Math.floor(Number.isFinite(earned) ? earned : 0)))
  const previous = Number.isFinite(stars[chapterId]) ? Math.max(0, Math.floor(stars[chapterId])) : 0
  if (clamped <= previous) return { stars, improved: false, stardustGained: 0 }
  return {
    stars: { ...stars, [chapterId]: clamped },
    improved: true,
    stardustGained: stardustForStars(clamped) - stardustForStars(previous)
  }
}
