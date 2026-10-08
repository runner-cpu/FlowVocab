import { describe, expect, it } from 'vitest'
import { LISTENING_ITEMS } from './listening'
import { primaryPos, validateListeningItems } from './contentValidation'

describe('content validation', () => {
  it('requires each listening blank to have unique choices and exactly one answer', () => {
    expect(validateListeningItems(LISTENING_ITEMS)).toEqual([])
  })

  it('matches every blank position to the actual missing word, ignoring punctuation', () => {
    for (const item of LISTENING_ITEMS) {
      for (const blank of item.blanks) {
        expect(item.text.split(/\s+/)[blank.index].replace(/[.,!?]$/, ''), item.id).toBe(blank.answer)
      }
    }
  })

  it('rejects content whose correct option is not the missing word', () => {
    expect(validateListeningItems([{ id: 'bad', level: 0, text: 'The library opens', blanks: [{ index: 1, answer: 'opens', options: ['opens', 'closed'] }] }])).toEqual(['bad:1'])
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
