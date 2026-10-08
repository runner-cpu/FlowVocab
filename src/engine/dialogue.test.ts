import { describe, expect, it } from 'vitest'
import type { DialogueQuestion, DialogueScene } from '../data/dialogue'
import {
  EMPTY_INPUT_ZH,
  LOW_CONFIDENCE_ZH,
  RULE_FEEDBACK,
  RETRY_ADVICE_ZH,
  dialogueStars,
  levenshtein,
  matchDialogueAnswer,
  normalizeSpoken
} from './dialogue'

const question: DialogueQuestion = {
  id: 'q-test',
  prompt: '我们昨天到了港口。',
  spoken: 'We arrived at the harbour yesterday.',
  keywords: ['arrived', 'harbour'],
  distractors: ['arrival', 'reached'],
  rule: 'past-tense'
}

describe('normalizeSpoken', () => {
  it('lowercases, strips punctuation and drops empty tokens', () => {
    expect(normalizeSpoken("Hello, HARBOUR! It's   fine.")).toEqual(['hello', 'harbour', "it's", 'fine'])
  })

  it('returns an empty list for empty or non-string input', () => {
    expect(normalizeSpoken('')).toEqual([])
    expect(normalizeSpoken('   ,,, ...')).toEqual([])
    expect(normalizeSpoken(undefined as unknown as string)).toEqual([])
  })
})

describe('levenshtein', () => {
  it('measures small edit distances', () => {
    expect(levenshtein('arrived', 'arrived')).toBe(0)
    expect(levenshtein('arrived', 'arived')).toBe(1)
    expect(levenshtein('harbour', 'harbor')).toBe(1)
  })

  it('early-exits beyond the limit instead of returning the true distance', () => {
    expect(levenshtein('harbour', 'banana')).toBe(2)
  })
})

describe('matchDialogueAnswer', () => {
  it('gives three stars when every keyword is hit and the ratio reaches 0.85', () => {
    const result = matchDialogueAnswer('We arrived at the harbour yesterday.', question)
    expect(result.hits).toHaveLength(6)
    expect(result.missed).toEqual([])
    expect(result.ratio).toBe(1)
    expect(result.stars).toBe(3)
    expect(result.feedbackZh).toContain(RULE_FEEDBACK['past-tense'])
  })

  it('tolerates one-letter errors per token while staying case-insensitive', () => {
    const result = matchDialogueAnswer('we arrived at the harbor yesterdy', question)
    expect(result.missed).toEqual([])
    expect(result.stars).toBe(3)
  })

  it('drops to two stars when every keyword is hit but the full sentence is short', () => {
    const result = matchDialogueAnswer('arrived harbour yesterday', question)
    expect(result.stars).toBe(2)
    expect(result.ratio).toBeLessThan(0.85)
    expect(result.feedbackZh.join(' ')).toMatch(/关键词/)
  })

  it('gives one star when only half of the keywords are hit', () => {
    const result = matchDialogueAnswer('We arrived at the port yesterday.', question)
    expect(result.stars).toBe(1)
    expect(result.missed).toEqual(['harbour'])
  })

  it('awards one star at half or more of the keywords', () => {
    const threeKeywords: DialogueQuestion = { ...question, keywords: ['arrived', 'yesterday', 'missing'] }
    const result = matchDialogueAnswer('We arrived at the port yesterday.', threeKeywords)
    expect(result.stars).toBe(1)
  })

  it('falls back to zero stars and retry advice below half of the keywords', () => {
    const result = matchDialogueAnswer('The boat is late today.', question)
    expect(result.stars).toBe(0)
    expect(result.feedbackZh).toContain(RETRY_ADVICE_ZH)
  })

  it('never awards stars for empty input', () => {
    for (const input of ['', '   ', '!!!']) {
      const result = matchDialogueAnswer(input, question)
      expect(result.stars, JSON.stringify(input)).toBe(0)
      expect(result.ratio).toBe(0)
      expect(result.hits).toEqual([])
      expect(result.feedbackZh).toContain(EMPTY_INPUT_ZH)
    }
  })

  it('does not count repeated words twice when the learner says one token less', () => {
    const repeated: DialogueQuestion = { ...question, spoken: 'Run run fast now.', keywords: ['run', 'fast'] }
    const result = matchDialogueAnswer('Run fast now.', repeated)
    expect(result.hits).toEqual(['Run', 'fast', 'now.'])
    expect(result.missed).toEqual(['run'])
  })

  it('explains a distractor that replaced the expected keyword', () => {
    const result = matchDialogueAnswer('We arrival at the harbour yesterday.', question)
    expect(result.stars).toBeLessThan(3)
    expect(result.feedbackZh.join(' ')).toContain('arrival')
    expect(result.feedbackZh.join(' ')).toContain('arrived')
  })

  it('mentions low confidence only when a result was produced', () => {
    const confident = matchDialogueAnswer('We arrived at the harbour yesterday.', question, 0.9)
    expect(confident.feedbackZh).not.toContain(LOW_CONFIDENCE_ZH)
    const shaky = matchDialogueAnswer('We arrived at the harbour yesterday.', question, 0.1)
    expect(shaky.feedbackZh).toContain(LOW_CONFIDENCE_ZH)
    expect(matchDialogueAnswer('', question, 0.1).feedbackZh).not.toContain(LOW_CONFIDENCE_ZH)
  })

  it('keeps the ratio bounded when the reference has no words', () => {
    const empty: DialogueQuestion = { ...question, spoken: '', keywords: [] }
    const result = matchDialogueAnswer('anything at all', empty)
    expect(result.ratio).toBe(0)
    expect(result.stars).toBe(0)
  })
})

describe('dialogueStars', () => {
  const scene: DialogueScene = {
    id: 'scene',
    title: '测试场景',
    place: '测试',
    heroLine: 'Hello there.',
    questions: [
      { ...question, id: 'a' },
      { ...question, id: 'b' },
      { ...question, id: 'c' },
      { ...question, id: 'd' },
      { ...question, id: 'e' }
    ]
  }

  it('scales with the share of passed questions', () => {
    expect(dialogueStars(new Set(), scene)).toBe(0)
    expect(dialogueStars(new Set(['a', 'b']), scene)).toBe(1)
    expect(dialogueStars(new Set(['a', 'b', 'c', 'd']), scene)).toBe(2)
    expect(dialogueStars(new Set(['a', 'b', 'c', 'd', 'e']), scene)).toBe(3)
  })

  it('ignores ids that are not part of the scene and tolerates a missing set', () => {
    expect(dialogueStars(new Set(['zzz', 'a', 'b', 'c']), scene)).toBe(1)
    expect(dialogueStars(undefined as unknown as Set<string>, scene)).toBe(0)
    expect(dialogueStars(new Set(), { ...scene, questions: [] })).toBe(0)
  })
})
