import { expect, test } from 'vitest'
import { elapsedSince } from './sessionTiming'

test('reports the real elapsed prompt time', () => {
  expect(elapsedSince(500, 1725)).toBe(1225)
})

test('records at least one millisecond for same-tick answers', () => {
  expect(elapsedSince(500, 500)).toBe(1)
})
