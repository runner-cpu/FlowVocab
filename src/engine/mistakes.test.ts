import { describe, expect, it } from 'vitest'
import {
  MISTAKE_LIMIT,
  MISTAKE_PROMPT_LIMIT,
  mistakeId,
  recordMistake,
  resolveMistake,
  sanitizeMistakes,
  summarizeMistakes,
  type MistakeInput
} from './mistakes'
import type { MistakeRecord } from '../types'

const sample = (overrides: Partial<MistakeInput> = {}): MistakeInput => ({
  module: 'grammar',
  contentId: 'tense-basic#0',
  prompt: 'She ___ to work by bus every day.',
  chosen: 'go',
  correctAnswer: 'goes',
  tag: 'agreement',
  explain: '第三人称单数加 -s。',
  ...overrides
})

describe('recordMistake', () => {
  it('creates a record with count 1 on first miss', () => {
    const records = recordMistake([], sample(), 1000)
    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({ count: 1, firstAt: 1000, lastAt: 1000, tag: 'agreement' })
    expect(records[0].id).toBe('grammar:tense-basic#0')
  })

  it('accumulates count instead of duplicating the same content', () => {
    let records = recordMistake([], sample(), 1000)
    records = recordMistake(records, sample({ chosen: 'went' }), 2000)
    expect(records).toHaveLength(1)
    expect(records[0].count).toBe(2)
    expect(records[0].chosen).toBe('went')
    expect(records[0].firstAt).toBe(1000)
    expect(records[0].lastAt).toBe(2000)
  })

  it('keeps the newest at the front', () => {
    let records = recordMistake([], sample({ contentId: 'a' }), 1000)
    records = recordMistake(records, sample({ contentId: 'b' }), 2000)
    expect(records.map((record) => record.contentId)).toEqual(['b', 'a'])
  })

  it('drops the oldest record once the limit is exceeded', () => {
    let records: MistakeRecord[] = []
    for (let index = 0; index < MISTAKE_LIMIT + 5; index += 1) {
      records = recordMistake(records, sample({ contentId: `q${index}` }), 1000 + index)
    }
    expect(records).toHaveLength(MISTAKE_LIMIT)
    expect(records.some((record) => record.contentId === 'q0')).toBe(false)
    expect(records[0].contentId).toBe(`q${MISTAKE_LIMIT + 4}`)
  })

  it('clips the prompt so a long passage does not blow up the record', () => {
    const records = recordMistake([], sample({ prompt: 'word '.repeat(60) }), 1)
    expect(records[0].prompt.length).toBeLessThanOrEqual(MISTAKE_PROMPT_LIMIT)
    expect(records[0].prompt.endsWith('…')).toBe(true)
  })

  it('does not mutate the input array', () => {
    const original: MistakeRecord[] = []
    recordMistake(original, sample(), 1)
    expect(original).toHaveLength(0)
  })
})

describe('resolveMistake', () => {
  it('removes the record for that content only', () => {
    let records = recordMistake([], sample({ contentId: 'a' }), 1)
    records = recordMistake(records, sample({ contentId: 'b' }), 2)
    const next = resolveMistake(records, 'grammar', 'a')
    expect(next).toHaveLength(1)
    expect(next[0].contentId).toBe('b')
  })

  it('returns the same array when nothing matched, so callers can skip the write', () => {
    const records = recordMistake([], sample(), 1)
    expect(resolveMistake(records, 'grammar', 'missing')).toBe(records)
  })
})

describe('summarizeMistakes', () => {
  it('counts by module and surfaces the most frequent tags', () => {
    let records = recordMistake([], sample({ module: 'vocab', contentId: 'v1', tag: 'spelling' }), 1)
    records = recordMistake(records, sample({ module: 'vocab', contentId: 'v2', tag: 'spelling' }), 2)
    records = recordMistake(records, sample({ module: 'reading', contentId: 'r1', tag: 'generic' }), 3)
    const summary = summarizeMistakes(records)
    expect(summary.total).toBe(3)
    expect(summary.byModule[0]).toEqual({ module: 'vocab', count: 2 })
    expect(summary.topTags[0]).toEqual({ tag: 'spelling', count: 2 })
    expect(summary.latestAt).toBe(3)
  })

  it('handles an empty notebook', () => {
    expect(summarizeMistakes([])).toEqual({ total: 0, byModule: [], topTags: [], latestAt: null })
  })
})

describe('sanitizeMistakes', () => {
  it('keeps valid records and drops malformed ones', () => {
    const good = recordMistake([], sample(), 10)[0]
    const cleaned = sanitizeMistakes([
      good,
      { id: '', module: 'grammar' },
      { ...good, id: 'x', module: 'nope' },
      { ...good, id: 'y', count: 0 },
      null
    ])
    expect(cleaned).toHaveLength(1)
    expect(cleaned[0].id).toBe(good.id)
  })

  it('degrades an unknown tag to generic instead of dropping the record', () => {
    const record = { ...recordMistake([], sample(), 1)[0], tag: 'not-a-tag' }
    expect(sanitizeMistakes([record])[0].tag).toBe('generic')
  })

  it('treats non-array input as an empty notebook', () => {
    expect(sanitizeMistakes(undefined)).toEqual([])
    expect(sanitizeMistakes({})).toEqual([])
  })
})

describe('mistakeId', () => {
  it('namespaces by module so the same content id in two modules stays distinct', () => {
    expect(mistakeId('grammar', 'x')).not.toBe(mistakeId('reading', 'x'))
  })
})
