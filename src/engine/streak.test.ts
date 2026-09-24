import { describe, expect, test } from 'vitest'
import { updateStreak } from './streak'

describe('updateStreak', () => {
  test('starts a one-day streak on the first study date', () => {
    expect(updateStreak(null, 0, '2026-09-24')).toEqual({
      streakDays: 1,
      lastStudyDate: '2026-09-24'
    })
  })

  test('keeps a streak idempotent for another answer on the same day', () => {
    expect(updateStreak('2026-09-24', 1, '2026-09-24')).toEqual({
      streakDays: 1,
      lastStudyDate: '2026-09-24'
    })
  })

  test('increments after the exact preceding calendar day', () => {
    expect(updateStreak('2026-09-23', 4, '2026-09-24')).toEqual({
      streakDays: 5,
      lastStudyDate: '2026-09-24'
    })
  })

  test('resets after a missed calendar day', () => {
    expect(updateStreak('2026-09-14', 9, '2026-09-24')).toEqual({
      streakDays: 1,
      lastStudyDate: '2026-09-24'
    })
  })
})
