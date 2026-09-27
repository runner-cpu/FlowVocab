import { describe, expect, it } from 'vitest'
import { LISTENING_ITEMS } from './listening'
import { primaryPos, validateListeningItems } from './contentValidation'

describe('content validation', () => {
  it('requires each listening blank to have unique choices and exactly one answer', () => {
    expect(validateListeningItems(LISTENING_ITEMS)).toEqual([])
  })

  it.each([
    ['adv. 绐佺劧鍦癭', 'adv'],
    ['vt. 鍚告敹', 'verb'],
    ['n. 婊ョ敤\nvt. 婊ョ敤', 'noun'],
    ['xyz. unknown', 'other'],
  ])('infers %s as %s', (pos, expected) => {
    expect(primaryPos({ pos } as never)).toBe(expected)
  })
})
