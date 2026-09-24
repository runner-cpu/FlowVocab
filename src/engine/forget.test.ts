import { describe, expect, test } from 'vitest'
import { normalizeSuccessfulReviews, updateReviewProgress } from './forget'

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

describe('normalizeSuccessfulReviews', () => {
  test('preserves a legacy mastered word when its success count is missing', () => {
    const successfulReviews = normalizeSuccessfulReviews('mastered', undefined)
    const afterCorrectReview = updateReviewProgress('mastered', 1, successfulReviews)

    expect(successfulReviews).toBeGreaterThanOrEqual(3)
    expect(afterCorrectReview).toEqual({ status: 'mastered', successfulReviews: 4 })
  })

  test('starts a legacy learning word with a missing count from zero', () => {
    expect(normalizeSuccessfulReviews('learning', undefined)).toBe(0)
  })
})
