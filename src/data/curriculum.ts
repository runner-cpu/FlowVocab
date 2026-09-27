import type { DifficultyLevel, LearningTrack, ModuleKey } from '../types'

type Curriculum = { levels: DifficultyLevel[]; modules: Record<ModuleKey, boolean>; content: Partial<Record<ModuleKey, string[]>> }
export const TRACK_CURRICULUM: Record<LearningTrack, Curriculum> = {
  primary: { levels: [0], modules: { vocab: true, grammar: true, sentence: false, listening: true, writing: false, reading: true }, content: { listening: ['l1', 'l2'] } },
  'middle-high': { levels: [0, 1], modules: { vocab: true, grammar: true, sentence: true, listening: true, writing: true, reading: true }, content: { listening: ['l1', 'l2', 'l3', 'l4'] } },
  advanced: { levels: [1, 2, 3], modules: { vocab: true, grammar: true, sentence: true, listening: true, writing: true, reading: true }, content: { listening: ['l3', 'l4', 'l5', 'l6', 'l7', 'l8'] } },
  cet: { levels: [0, 1, 2, 3, 4], modules: { vocab: true, grammar: true, sentence: true, listening: true, writing: true, reading: true }, content: { listening: ['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'l8'] } },
}
export function isModuleAvailable(track: LearningTrack, module: ModuleKey): boolean { return TRACK_CURRICULUM[track].modules[module] }
export function itemsForTrack<T extends { id: string }>(track: LearningTrack, module: ModuleKey, items: T[]): T[] {
  const ids = TRACK_CURRICULUM[track].content[module]
  return ids ? items.filter(item => ids.includes(item.id)) : items
}
