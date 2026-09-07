import type { ListeningItem } from '../types'

// 听力听写题（自编原创示例句，非真题）
export const LISTENING_ITEMS: ListeningItem[] = [
  {
    id: 'l1', level: 0,
    text: 'The library opens at nine o\'clock every morning.',
    blanks: [
      { index: 1, answer: 'opens', options: ['opens', 'opened', 'open', 'opening'] }
    ]
  },
  {
    id: 'l2', level: 0,
    text: 'She prefers coffee to tea in the afternoon.',
    blanks: [
      { index: 1, answer: 'prefers', options: ['prefers', 'preferred', 'prepares', 'prefers'] }
    ]
  },
  {
    id: 'l3', level: 1,
    text: 'We need to finish the report before Friday.',
    blanks: [
      { index: 4, answer: 'report', options: ['report', 'repair', 'repeat', 'record'] }
    ]
  },
  {
    id: 'l4', level: 1,
    text: 'The train to Beijing leaves at half past seven.',
    blanks: [
      { index: 4, answer: 'leaves', options: ['leaves', 'lives', 'leaves', 'lifts'] }
    ]
  },
  {
    id: 'l5', level: 2,
    text: 'He is studying for the final examination this week.',
    blanks: [
      { index: 5, answer: 'examination', options: ['examination', 'exclamation', 'examine', 'extension'] }
    ]
  },
  {
    id: 'l6', level: 2,
    text: 'Climate change is a serious problem facing our planet.',
    blanks: [
      { index: 4, answer: 'serious', options: ['serious', 'series', 'various', 'curious'] }
    ]
  },
  {
    id: 'l7', level: 3,
    text: 'The company decided to expand its business overseas.',
    blanks: [
      { index: 4, answer: 'expand', options: ['expand', 'expect', 'extend', 'expend'] }
    ]
  },
  {
    id: 'l8', level: 3,
    text: 'Researchers are trying to find a cure for the disease.',
    blanks: [
      { index: 1, answer: 'Researchers', options: ['Researchers', 'Reporters', 'Rescuers', 'Retailers'] }
    ]
  }
]

// 展示句子（挖空 → 下划线）
export function displayWithBlank(text: string, blankIndex: number): string[] {
  const words = text.split(' ')
  return words.map((w, i) => (i === blankIndex ? '_____' : w))
}
