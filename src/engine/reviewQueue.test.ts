import { describe, expect, test } from 'vitest'
import { orderReviewCandidates } from './reviewQueue'
import type { UserWord, Word } from '../types'

const words = ['requested', 'overdue-old', 'overdue-new', 'unseen', 'future'].map((id) => ({ id, word: id, meaning: id, phonetic: '', example: '', exampleCn: '', level: 0, pos: '' } as Word))
const review = (wordId: string, nextReview: number): UserWord => ({ id: wordId, wordId, status: 'learning', correct: 1, total: 1, lastReview: 1, nextReview, interval: 1, quality: 1, successfulReviews: 1 })

describe('orderReviewCandidates', () => {
  test('puts a requested card before due, unseen, and future cards without duplicates', () => {
    const result = orderReviewCandidates(words, [review('requested', 9999), review('overdue-new', 1900), review('overdue-old', 1800), review('future', 2100)], 2000, () => 0, 'requested')
    expect(result.map((word) => word.id)).toEqual(['requested', 'overdue-old', 'overdue-new', 'unseen', 'future'])
    expect(new Set(result.map((word) => word.id)).size).toBe(result.length)
  })

  test('keeps due ordering when the requested card is absent', () => {
    const result = orderReviewCandidates(words, [review('overdue-new', 1900), review('overdue-old', 1800), review('future', 2100)], 2000, () => 0, 'missing')
    expect(result.map((word) => word.id)).toEqual(['overdue-old', 'overdue-new', 'unseen', 'requested', 'future'])
  })
})
