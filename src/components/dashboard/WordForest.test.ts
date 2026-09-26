import { describe, expect, it } from 'vitest'
import { classifyWordTree } from './WordForest'
import type { UserWord } from '../../types'

const base: UserWord = { id: 'word', wordId: 'word', status: 'learning', correct: 3, total: 4, lastReview: 1, nextReview: 10_000, interval: 2, quality: 4, successfulReviews: 1 }

describe('word forest health', () => {
  it('prioritizes high-error words as fragile even before their review date', () => {
    expect(classifyWordTree({ ...base, correct: 1, total: 5 }, 5_000)).toBe('fragile')
  })

  it('separates due, learning and mastered trees', () => {
    expect(classifyWordTree({ ...base, nextReview: 4_000 }, 5_000)).toBe('due')
    expect(classifyWordTree(base, 5_000)).toBe('learning')
    expect(classifyWordTree({ ...base, status: 'mastered' }, 5_000)).toBe('mastered')
  })
})
