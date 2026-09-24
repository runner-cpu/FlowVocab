import { describe, expect, test } from 'vitest'
import { updateReviewProgress } from './forget'

describe('updateReviewProgress', () => {
  test('keeps a new word learning after its first successful review', () => {
    expect(updateReviewProgress('new', 1, 0)).toEqual({
      status: 'learning',
      successfulReviews: 1
    })
  })

  test('keeps a learning word learning after its second successful review', () => {
    expect(updateReviewProgress('learning', 1, 1)).toEqual({
      status: 'learning',
      successfulReviews: 2
    })
  })

  test('masters a word after its third successful review', () => {
    expect(updateReviewProgress('learning', 1, 2)).toEqual({
      status: 'mastered',
      successfulReviews: 3
    })
  })

  test('resets a failed mastered review and requires three new successes', () => {
    const afterFailure = updateReviewProgress('mastered', 0, 3)
    expect(afterFailure).toEqual({ status: 'learning', successfulReviews: 0 })

    const firstRetry = updateReviewProgress(afterFailure.status, 1, afterFailure.successfulReviews)
    const secondRetry = updateReviewProgress(firstRetry.status, 1, firstRetry.successfulReviews)
    const thirdRetry = updateReviewProgress(secondRetry.status, 1, secondRetry.successfulReviews)

    expect(firstRetry).toEqual({ status: 'learning', successfulReviews: 1 })
    expect(secondRetry).toEqual({ status: 'learning', successfulReviews: 2 })
    expect(thirdRetry).toEqual({ status: 'mastered', successfulReviews: 3 })
  })
})
