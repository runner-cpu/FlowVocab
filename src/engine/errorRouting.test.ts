import { describe, expect, it } from 'vitest'
import {
  ERROR_TAGS,
  ERROR_TAG_LABELS,
  inferErrorTag,
  ruleExplanation,
  sharesLookAlikeStem,
  type ErrorRoutingInput,
  type ErrorTag
} from './errorRouting'

interface Fixture {
  name: string
  input: ErrorRoutingInput
  expected: ErrorTag
}

/** 取自本仓库真实内容形状的错题样本：语法填空、句子翻译、词汇、听力、写作改错。 */
const FIXTURES: Fixture[] = [
  {
    name: '语法·现在完成时（has/since）',
    input: { module: 'grammar', prompt: 'He has lived here ___ 2010.', options: ['for', 'since', 'at', 'in'], chosen: 'for', correctAnswer: 'since' },
    expected: 'tense'
  },
  {
    name: '语法·一般过去时（last night）',
    input: { module: 'grammar', prompt: 'They ___ a movie last night.', options: ['watch', 'watches', 'watched', 'watching'], chosen: 'watch', correctAnswer: 'watched' },
    expected: 'tense'
  },
  {
    name: '语法·一般过去时（不规则动词 went）',
    input: { module: 'grammar', prompt: 'She ___ to work by bus every day before 2020.', options: ['go', 'goes', 'went', 'going'], chosen: 'go', correctAnswer: 'went' },
    expected: 'tense'
  },
  {
    name: '语法·主谓一致（do/does 同现）',
    input: { module: 'grammar', prompt: 'She ___ like coffee, but her brother does.', options: ["don't", "doesn't", "didn't", 'do'], chosen: "don't", correctAnswer: "doesn't" },
    expected: 'agreement'
  },
  {
    name: '语法·冠词 a/an/the 选项',
    input: { module: 'grammar', prompt: 'He bought ___ umbrella on his way home.', options: ['a', 'an', 'the', '不填'], chosen: 'a', correctAnswer: 'an' },
    expected: 'article'
  },
  {
    name: '语法·介词 in/on/at/by 选项',
    input: { module: 'grammar', prompt: 'The meeting starts ___ nine, so please be on time.', options: ['in', 'on', 'at', 'by'], chosen: 'in', correctAnswer: 'at' },
    expected: 'preposition'
  },
  {
    name: '语法·关系代词（which/who/whom/where）',
    input: { module: 'grammar', prompt: 'The man ___ is talking to Tom is my uncle.', options: ['which', 'who', 'whom', 'where'], chosen: 'which', correctAnswer: 'who' },
    expected: 'clause'
  },
  {
    name: '语法·词形派生（decide/decision/decisive）',
    input: { module: 'grammar', prompt: 'Her ___ surprised everyone in the room.', options: ['decide', 'decision', 'decisive', 'decidedly'], chosen: 'decide', correctAnswer: 'decision' },
    expected: 'word-form'
  },
  {
    name: '语法·非谓语（seeing/seen/see/to see）',
    input: { module: 'grammar', prompt: '___ from the hill, the town looks like a map.', options: ['Seeing', 'Seen', 'See', 'To see'], chosen: 'See', correctAnswer: 'Seen' },
    expected: 'word-form'
  },
  {
    name: '词汇·近形干扰项（adapt/adopt）',
    input: { module: 'vocab', mode: 'meaning', prompt: '适应；改编', word: 'adapt', options: [{ text: '适应；改编' }, { text: '采纳；收养' }, { text: '充足的' }, { text: '调整' }], chosen: '采纳；收养', correctAnswer: '适应；改编' },
    expected: 'word-choice'
  },
  {
    name: '词汇·干扰项与答案词干相同时仍归为词义辨析',
    input: { module: 'vocab', mode: 'meaning', prompt: '小心；谨慎', word: 'caution', options: [{ text: '小心；谨慎' }, { text: 'cautious' }, { text: 'cautioning' }, { text: 'cautiously' }], chosen: 'cautious', correctAnswer: '小心；谨慎' },
    expected: 'word-choice'
  },
  {
    name: '词汇·拼写模式（mode=spelling）',
    input: { module: 'vocab', mode: 'spelling', prompt: '适应；改编', word: 'adapt', chosen: 'adpat' },
    expected: 'spelling'
  },
  {
    name: '词汇·无选项但有作答文本（拼写流程）',
    input: { module: 'vocab', mode: 'meaning', prompt: '探索', word: 'explore', chosen: 'explorer' },
    expected: 'spelling'
  },
  {
    name: '听力·挖空细节（similar sounding）',
    input: { module: 'listening', prompt: 'The train to Beijing leaves at half past seven.', options: ['leaves', 'lives', 'leans', 'lifts'], chosen: 'lives', correctAnswer: 'leaves' },
    expected: 'listening-detail'
  },
  {
    name: '词汇·听音寻踪模式',
    input: { module: 'vocab', mode: 'listening', word: 'explore', options: [{ text: '探索' }, { text: '航行' }], chosen: '航行', correctAnswer: '探索' },
    expected: 'listening-detail'
  },
  {
    name: '写作·改错题标记词为助动词',
    input: { module: 'writing', prompt: '选出下列句子中最恰当的正确改法（原句含语法错误）。', sentence: "He don't like the way the teacher explains the lesson.", options: ["He doesn't like the way the teacher explains the lesson.", "He don't likes the way the teacher explains the lesson."], chosen: "He don't likes the way the teacher explains the lesson.", correctAnswer: "He doesn't like the way the teacher explains the lesson.", flaggedWords: ["don't"] },
    expected: 'agreement'
  },
  {
    name: '写作·改错题标记词为时间状语',
    input: { module: 'writing', prompt: '选出正确改法。', sentence: 'She go to school yesterday.', options: ['She went to school yesterday.', 'She goes to school yesterday.'], chosen: 'She goes to school yesterday.', correctAnswer: 'She went to school yesterday.', flaggedWords: ['yesterday'] },
    expected: 'tense'
  },
  {
    name: '写作·改错题标记词为冠词',
    input: { module: 'writing', prompt: '选出正确改法。', sentence: 'I saw a honest man in the park.', options: ['I saw an honest man in the park.', 'I saw the honest man in the park.'], chosen: 'I saw the honest man in the park.', correctAnswer: 'I saw an honest man in the park.', flaggedWords: ['a'] },
    expected: 'article'
  },
  {
    name: '写作·改错题标记词为介词',
    input: { module: 'writing', prompt: '选出正确改法。', sentence: 'She arrived in the airport.', options: ['She arrived at the airport.', 'She arrived on the airport.'], chosen: 'She arrived on the airport.', correctAnswer: 'She arrived at the airport.', flaggedWords: ['in'] },
    expected: 'preposition'
  },
  {
    name: '句子·翻译题无明确信号时降级',
    input: { module: 'sentence', prompt: '选择最恰当的译文：', options: ['直到截止日期他才完成报告。', '他没有在截止日期前完成报告。'], chosen: '他没有在截止日期前完成报告。', correctAnswer: '直到截止日期他才完成报告。' },
    expected: 'generic'
  },
  {
    name: '阅读·无信号降级',
    input: { module: 'reading', prompt: 'What is the main idea of the passage?', options: ['The plan was delayed.', 'The plan succeeded.'], chosen: 'The plan succeeded.', correctAnswer: 'The plan was delayed.' },
    expected: 'generic'
  },
  {
    name: '空输入不抛错',
    input: {},
    expected: 'generic'
  },
  {
    name: 'null 输入不抛错',
    input: null as unknown as ErrorRoutingInput,
    expected: 'generic'
  },
  {
    name: '字段类型错误的输入不抛错',
    input: { module: 42, options: 'not-an-array', chosen: { text: 'x' } } as unknown as ErrorRoutingInput,
    expected: 'generic'
  }
]

describe('inferErrorTag', () => {
  it.each(FIXTURES.map((fixture) => [fixture.name, fixture.input, fixture.expected] as const))('routes %s to %s', (_name, input, expected) => {
    expect(inferErrorTag(input)).toBe(expected)
  })

  it('covers every declared tag with at least one fixture', () => {
    const routed = new Set(FIXTURES.map((fixture) => fixture.expected))
    for (const tag of ERROR_TAGS) {
      expect(routed.has(tag), `缺少 ${tag} 的样本`).toBe(true)
    }
  })

  it('is deterministic across repeated calls', () => {
    const input: ErrorRoutingInput = { module: 'grammar', prompt: 'He has lived here ___ 2010.', options: ['for', 'since', 'at', 'in'] }
    const first = inferErrorTag(input)
    for (let i = 0; i < 5; i += 1) expect(inferErrorTag(input)).toBe(first)
    expect(first).toBe('tense')
  })

  it('prefers the mode hint over conflicting module text', () => {
    expect(inferErrorTag({ module: 'listening', mode: 'spelling', prompt: '适应' })).toBe('spelling')
  })

  it('does not route reading comprehension answers as grammar when the prompt has no blank', () => {
    expect(inferErrorTag({ module: 'reading', prompt: 'Which statement is true according to the passage?', options: ['Which of them left.', 'They stayed in 2010.'], chosen: 'They stayed in 2010.' })).toBe('generic')
  })

  it('never throws for exotic input shapes', () => {
    const exotic: unknown[] = [undefined, null, 0, '', [], { module: null, options: [null, undefined, 7, { text: 3 }] }]
    for (const value of exotic) {
      expect(typeof inferErrorTag(value as ErrorRoutingInput)).toBe('string')
    }
  })
})

describe('sharesLookAlikeStem', () => {
  it('matches shared prefixes and suffixes but not identical or short words', () => {
    expect(sharesLookAlikeStem('adapt', 'adopt')).toBe(true)
    expect(sharesLookAlikeStem('caution', 'cautious')).toBe(true)
    expect(sharesLookAlikeStem('personal', 'personnel')).toBe(true)
    expect(sharesLookAlikeStem('adapt', 'adapt')).toBe(false)
    expect(sharesLookAlikeStem('go', 'goes')).toBe(false)
    expect(sharesLookAlikeStem('', 'adapt')).toBe(false)
  })
})

describe('ruleExplanation', () => {
  it('returns a Chinese title, body and cue for every tag', () => {
    for (const tag of ERROR_TAGS) {
      const card = ruleExplanation(tag, { word: 'adapt', chosen: 'adopt', correctAnswer: 'adapt' })
      expect(card.title.length).toBeGreaterThan(1)
      expect(card.body.length).toBeGreaterThan(10)
      expect(card.cue.length).toBeGreaterThan(4)
      expect(card.title).toMatch(/[\u4e00-\u9fa5]/)
      expect(card.body).toMatch(/[\u4e00-\u9fa5]/)
      expect(ERROR_TAG_LABELS[tag]).toMatch(/[\u4e00-\u9fa5]/)
    }
  })

  it('is deterministic per (tag, context) and differs between tags', () => {
    const context = { word: 'adapt', chosen: 'adopt', correctAnswer: 'adapt' }
    expect(ruleExplanation('word-choice', context)).toEqual(ruleExplanation('word-choice', context))
    expect(ruleExplanation('tense', context).title).not.toBe(ruleExplanation('agreement', context).title)
  })

  it('mentions the learner answer pair when they differ and stays clean otherwise', () => {
    const card = ruleExplanation('article', { chosen: 'a', correctAnswer: 'an' })
    expect(card.cue).toContain('a')
    expect(card.cue).toContain('an')
    const clean = ruleExplanation('article', { chosen: 'an', correctAnswer: 'an' })
    expect(clean.cue).not.toContain('你选了')
  })

  it('falls back safely for an unknown tag at runtime', () => {
    const card = ruleExplanation('mystery' as ErrorTag, {})
    expect(card.title).toBe('回到语境')
  })

  it('keeps every cue short enough for a compact card', () => {
    for (const tag of ERROR_TAGS) {
      const card = ruleExplanation(tag, { chosen: 'a', correctAnswer: 'an' })
      expect(card.cue.length).toBeLessThan(80)
    }
  })
})
