import { describe, expect, it } from 'vitest'
import { correctPosition, displayOptions, optionOrder } from './optionOrder'
import { SENTENCE_QUESTS } from '../data/sentences'
import { LISTENING_ITEMS } from '../data/listening'

describe('optionOrder', () => {
  it('is deterministic for the same seed', () => {
    expect(optionOrder(4, 0, 't1')).toEqual(optionOrder(4, 0, 't1'))
    expect(optionOrder(4, 2, 'l3:5')).toEqual(optionOrder(4, 2, 'l3:5'))
  })

  it('keeps every option exactly once', () => {
    const order = optionOrder(4, 1, 'p2')
    expect([...order].sort()).toEqual([0, 1, 2, 3])
  })

  it('moves the correct option away from a fixed position across items', () => {
    const positions = new Set(
      SENTENCE_QUESTS.filter((quest) => quest.type === 'translate')
        .map((quest) => optionOrder(quest.options!.length, quest.answer ?? 0, quest.id).indexOf(quest.answer ?? 0))
    )
    // 4 道静态题的正确项原本都在第 1 位；打乱后至少出现两个不同位置。
    expect(positions.size).toBeGreaterThan(1)
  })

  it('spreads listening blanks instead of always showing the answer first', () => {
    const firstPositions = LISTENING_ITEMS.map((item) => {
      const blank = item.blanks[0]
      const order = optionOrder(blank.options.length, blank.options.indexOf(blank.answer), `${item.id}:${blank.index}`)
      return order.indexOf(blank.options.indexOf(blank.answer))
    })
    expect(new Set(firstPositions).size).toBeGreaterThan(1)
    expect(firstPositions.some((position) => position !== 0)).toBe(true)
  })

  it('returns the identity order for degenerate input', () => {
    expect(optionOrder(0, 0, 'x')).toEqual([])
    expect(optionOrder(1, 0, 'x')).toEqual([0])
    expect(optionOrder(3, 5, 'x')).toEqual([0, 1, 2])
    expect(optionOrder(3, -1, 'x')).toEqual([0, 1, 2])
  })
})

describe('displayOptions', () => {
  it('maps text, correctness, and source index back to the original array', () => {
    const source = ['A', 'B', 'C', 'D']
    const view = displayOptions(source, 2, 'grammar-node#0')
    expect(view.map((option) => option.text).sort()).toEqual(['A', 'B', 'C', 'D'])
    expect(view).toHaveLength(4)
    const correct = view.find((option) => option.correct)!
    expect(correct.text).toBe('C')
    expect(correct.sourceIndex).toBe(2)
    for (const option of view) expect(source[option.sourceIndex]).toBe(option.text)
    expect(correctPosition(view)).toBe(view.indexOf(correct))
  })
})
