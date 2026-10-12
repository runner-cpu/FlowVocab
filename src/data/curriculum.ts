import type { DifficultyLevel, LearningTrack, ModuleKey } from '../types'

type Curriculum = { levels: DifficultyLevel[]; modules: Record<ModuleKey, boolean>; content: Partial<Record<ModuleKey, string[]>> }
/**
 * 四条学段路线各自开放的内容范围。
 *
 * grammar 的 id 列表必须「前缀闭合」：语法技能树按 parent 逐级解锁，若开放了子节点
 * 却漏掉祖先，该节点会永久锁死，并显示空的先修技能名。GRAMMAR_NODES 的五条链见
 * data/grammar.ts，curriculum.test.ts 会逐条校验这个不变量。
 */
export const TRACK_CURRICULUM: Record<LearningTrack, Curriculum> = {
  primary: { levels: [0], modules: { vocab: true, grammar: true, sentence: false, listening: true, writing: false, reading: true }, content: { listening: ['l1', 'l2'], grammar: ['tense-basic'], reading: ['ch1'] } },
  'middle-high': { levels: [0, 1], modules: { vocab: true, grammar: true, sentence: true, listening: true, writing: true, reading: true }, content: { listening: ['l1', 'l2', 'l3', 'l4'], grammar: ['tense-basic', 'tense-perfect', 'relative-pronoun', 'subject-clause', 'infinitive', 'subjunctive-present'], sentence: ['p1', 'p2'], writing: ['w-sort-1', 'w-sort-2'], reading: ['ch1', 'ch2'] } },
  advanced: { levels: [1, 2, 3], modules: { vocab: true, grammar: true, sentence: true, listening: true, writing: true, reading: true }, content: { listening: ['l3', 'l4', 'l5', 'l6', 'l7', 'l8'], grammar: ['tense-basic', 'tense-perfect', 'tense-passive', 'relative-pronoun', 'relative-adverb', 'subject-clause', 'object-clause', 'infinitive', 'gerund', 'subjunctive-present'], sentence: ['t1', 't2'], writing: ['w-sort-3', 'w-sort-4', 'w-err-1', 'w-err-2', 'w-err-3'], reading: ['ch2', 'ch3'] } },
  cet: { levels: [0, 1, 2, 3, 4], modules: { vocab: true, grammar: true, sentence: true, listening: true, writing: true, reading: true }, content: { listening: ['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'l8'], grammar: ['tense-basic', 'tense-perfect', 'tense-passive', 'relative-pronoun', 'relative-adverb', 'subject-clause', 'object-clause', 'infinitive', 'gerund', 'subjunctive-present'], sentence: ['p1', 'p2', 't1', 't2'], writing: ['w-sort-1', 'w-sort-2', 'w-err-1', 'w-err-2', 'w-err-3'], reading: ['ch1', 'ch2', 'ch3'] } },
}
export function isModuleAvailable(track: LearningTrack, module: ModuleKey): boolean { return TRACK_CURRICULUM[track].modules[module] }

/** Return the route curriculum first, then any adaptive/review levels needed to
 * keep the current session responsive without hiding route content. */
export function vocabLevelsForTrack(track: LearningTrack, adaptiveLevel: DifficultyLevel, reviewLevel?: DifficultyLevel | null): DifficultyLevel[] {
  return [...new Set([...TRACK_CURRICULUM[track].levels, adaptiveLevel, ...(reviewLevel === undefined || reviewLevel === null ? [] : [reviewLevel])])]
}

export function itemsForTrack<T extends { id: string }>(track: LearningTrack, module: ModuleKey, items: T[]): T[] {
  const ids = TRACK_CURRICULUM[track].content[module]
  return ids ? items.filter(item => ids.includes(item.id)) : items
}
