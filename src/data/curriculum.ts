import type { DifficultyLevel, LearningTrack, ModuleKey } from '../types'

type Curriculum = { levels: DifficultyLevel[]; modules: Record<ModuleKey, boolean>; content: Partial<Record<ModuleKey, string[]>> }
export const TRACK_CURRICULUM: Record<LearningTrack, Curriculum> = {
  primary: { levels: [0], modules: { vocab: true, grammar: true, sentence: false, listening: true, writing: false, reading: true }, content: { listening: ['l1', 'l2'], grammar: ['tense-basic'], reading: ['ch1'] } },
  'middle-high': { levels: [0, 1], modules: { vocab: true, grammar: true, sentence: true, listening: true, writing: true, reading: true }, content: { listening: ['l1', 'l2', 'l3', 'l4'], grammar: ['tense-basic', 'relative-pronoun'], sentence: ['p1', 'p2'], writing: ['w-sort-1', 'w-sort-2'], reading: ['ch1', 'ch2'] } },
  advanced: { levels: [1, 2, 3], modules: { vocab: true, grammar: true, sentence: true, listening: true, writing: true, reading: true }, content: { listening: ['l3', 'l4', 'l5', 'l6', 'l7', 'l8'], grammar: ['subject-clause', 'infinitive'], sentence: ['t1', 't2'], writing: ['w-sort-3', 'w-sort-4', 'w-err-1', 'w-err-2', 'w-err-3'], reading: ['ch2'] } },
  cet: { levels: [0, 1, 2, 3, 4], modules: { vocab: true, grammar: true, sentence: true, listening: true, writing: true, reading: true }, content: { listening: ['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'l8'], grammar: ['tense-basic', 'relative-pronoun', 'subject-clause', 'infinitive'], sentence: ['p1', 'p2', 't1', 't2'], writing: ['w-sort-1', 'w-sort-2', 'w-err-1', 'w-err-2', 'w-err-3'], reading: ['ch1', 'ch2'] } },
}
export function isModuleAvailable(track: LearningTrack, module: ModuleKey): boolean { return TRACK_CURRICULUM[track].modules[module] }
export function itemsForTrack<T extends { id: string }>(track: LearningTrack, module: ModuleKey, items: T[]): T[] {
  const ids = TRACK_CURRICULUM[track].content[module]
  return ids ? items.filter(item => ids.includes(item.id)) : items
}
