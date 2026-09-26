import { expect, test } from 'vitest'
import { consumeRetry, reserveRetry } from './retrySlots'

test('moves a collision to another legal future stop that the game can reach', () => {
  let slots = reserveRetry(new Map(), 0, 8, 'first', () => 0)
  slots = reserveRetry(slots, 0, 8, 'second', () => 0)
  expect([...slots.entries()]).toEqual([[2, 'first'], [3, 'second']])
  const first = consumeRetry(slots, 2)
  expect(first.wordId).toBe('first')
  expect(consumeRetry(first.slots, 3).wordId).toBe('second')
})

test('does not reserve when every legal future slot is occupied', () => {
  const slots = new Map([[2, 'a'], [3, 'b'], [4, 'c'], [5, 'd']])
  expect(reserveRetry(slots, 0, 6, 'later', () => 0)).toEqual(slots)
})

test('consumes each scheduled retry at most once', () => {
  const first = consumeRetry(new Map([[2, 'once']]), 2)
  expect(first.wordId).toBe('once')
  expect(consumeRetry(first.slots, 3).wordId).toBeUndefined()
})

test('does not reserve a retry without two subsequent positions', () => {
  expect(reserveRetry(new Map(), 4, 6, 'late', () => 0).size).toBe(0)
})
