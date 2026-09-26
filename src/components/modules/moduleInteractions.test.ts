import { describe, expect, it } from 'vitest'
import { placeSentenceSegment } from './sentence/SentenceGame'
import { moveWritingSegment } from './writing/WritingGame'

describe('sentence bucket placement', () => {
  const segments = [
    { text: 'The explorer', bucket: 'main' as const },
    { text: 'who found the map', bucket: 'clause' as const }
  ]

  it('keeps a segment available when it is dropped into the wrong bucket', () => {
    expect(placeSentenceSegment(segments, {}, 1, 'modifier')).toEqual({ placed: {}, correct: false, complete: false })
  })

  it('records the right bucket and reports completion after the final segment', () => {
    expect(placeSentenceSegment(segments, { 0: 'main' }, 1, 'clause')).toEqual({
      placed: { 0: 'main', 1: 'clause' },
      correct: true,
      complete: true
    })
  })
})

describe('writing order movement', () => {
  it('moves the selected fragment one position with arrow controls', () => {
    expect(moveWritingSegment(['first', 'second', 'third'], 1, -1)).toEqual(['second', 'first', 'third'])
    expect(moveWritingSegment(['first', 'second', 'third'], 1, 1)).toEqual(['first', 'third', 'second'])
  })

  it('does not move a fragment beyond either edge', () => {
    expect(moveWritingSegment(['first', 'second'], 0, -1)).toEqual(['first', 'second'])
    expect(moveWritingSegment(['first', 'second'], 1, 1)).toEqual(['first', 'second'])
  })
})
