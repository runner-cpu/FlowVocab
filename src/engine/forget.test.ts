import { describe, expect, test } from 'vitest'
import { nextStatus } from './forget'

describe('nextStatus', () => {
  test('keeps a new word learning after its first successful review', () => {
    expect(nextStatus('new', 1, 1)).toBe('learning')
  })

  test('keeps a learning word learning after its second successful review', () => {
    expect(nextStatus('learning', 1, 2)).toBe('learning')
  })

  test('masters a word after its third successful review', () => {
    expect(nextStatus('learning', 1, 3)).toBe('mastered')
  })

  test('returns a failed mastered review to learning after its counter resets', () => {
    expect(nextStatus('mastered', 0, 0)).toBe('learning')
  })
})
