import { expect, test } from 'vitest'
import { consumeRetry, reserveRetry } from './retrySlots'

test('reserves a retry two through five later and preserves colliding entries', () => {
  let slots = reserveRetry(new Map(), 0, 8, 'first', () => 0)
  slots = reserveRetry(slots, 0, 8, 'second', () => 0)
  expect(slots.get(2)).toEqual(['first', 'second'])
  const first = consumeRetry(slots, 2)
  expect(first.wordId).toBe('first')
  expect(first.slots.get(2)).toEqual(['second'])
  expect(consumeRetry(first.slots, 2).wordId).toBe('second')
})

test('does not reserve a retry without two subsequent positions', () => {
  expect(reserveRetry(new Map(), 4, 6, 'late', () => 0).size).toBe(0)
})
