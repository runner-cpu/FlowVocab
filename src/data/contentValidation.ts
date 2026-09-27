import type { ListeningItem, Word } from '../types'
export type LexicalClass = 'noun' | 'verb' | 'adj' | 'adv' | 'other'
export function primaryPos(word: Pick<Word, 'pos'>): LexicalClass {
  const prefix = (word.pos || '').trim().toLowerCase().match(/^([a-z]+)/)?.[1] || ''
  if (prefix === 'n') return 'noun'
  if (prefix === 'v' || prefix === 'vt' || prefix === 'vi') return 'verb'
  if (prefix === 'a' || prefix === 'adj') return 'adj'
  if (prefix === 'ad' || prefix === 'adv') return 'adv'
  return 'other'
}
export function validateListeningItems(items: ListeningItem[]): string[] {
  return items.flatMap(item => item.blanks.flatMap(blank => {
    const answerCount = blank.options.filter(option => option === blank.answer).length
    return new Set(blank.options).size === blank.options.length && answerCount === 1 ? [] : [`${item.id}:${blank.index}`]
  }))
}
