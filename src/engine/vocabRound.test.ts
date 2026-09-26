import { describe, expect, it } from 'vitest'
import { createVocabQuestion, isVocabAnswerCorrect, vocabModeAt, speakWord } from './vocabRound'
import type { Word } from '../types'

const word: Word = { id: 'a', word: 'Explore', meaning: '探索', phonetic: '/ɪkˈsplɔː/', example: 'Explore the island.', exampleCn: '探索岛屿。', level: 0, pos: 'v.' }
const pool = [word, ...['发现', '航行', '返回', '探索'].map((meaning, i) => ({ ...word, id: String(i), word: `term${i}`, meaning }))]
describe('vocabulary mission questions', () => {
  it('provides four distinct meaning choices with exactly one correct answer, even for a sparse pool', () => {
    for (const words of [pool, [word]]) {
      const question = createVocabQuestion(word, words, 'meaning', { random: () => 0 })
      expect(question.options).toHaveLength(4)
      expect(new Set(question.options.map(o => o.text)).size).toBe(4)
      expect(question.options.filter(o => o.correct).map(o => o.text)).toEqual(['探索'])
    }
  })
  it('keeps the target and phonetic out of the listening prompt and choices', () => {
    const question = createVocabQuestion(word, pool, 'listening', { pronunciationSupported: true })
    expect(question.mode).toBe('listening')
    expect([question.prompt, ...question.options.map(o => o.text)].join(' ')).not.toMatch(/explore|ɪkˈsplɔː/i)
  })
  it('accepts case and surrounding whitespace in spelling but rejects a different word', () => {
    const question = createVocabQuestion(word, pool, 'spelling')
    expect(question.prompt).toBe('探索')
    expect(question.options).toEqual([])
    expect(isVocabAnswerCorrect(question, '  eXpLoRe  ')).toBe(true)
    expect(isVocabAnswerCorrect(question, 'explorer')).toBe(false)
  })
  it.each([[1, false], [9, false], [10, true], [20, true], [29, false], [30, true]])('marks stop %i boss=%s', (number, boss) => {
    expect(createVocabQuestion(word, pool, 'meaning', { number }).boss).toBe(boss)
  })
  it('rotates eligible modes and falls back when speech is unavailable', () => {
    expect([0, 1, 2, 3].map(i => vocabModeAt(i, word, true))).toEqual(['meaning', 'listening', 'spelling', 'meaning'])
    expect(vocabModeAt(1, word, false)).toBe('meaning')
    expect(createVocabQuestion(word, pool, 'listening', { pronunciationSupported: false }).mode).toBe('meaning')
  })
  it('is reproducible with an injected random source without mutating the pool', () => {
    const before = pool.map(w => w.id)
    expect(createVocabQuestion(word, pool, 'meaning', { random: () => 0.4 })).toEqual(createVocabQuestion(word, pool, 'meaning', { random: () => 0.4 }))
    expect(pool.map(w => w.id)).toEqual(before)
  })
  it('silently reports unavailable speech in an unsupported browser', () => {
    expect(speakWord('explore', 0.9)).toBe(false)
  })
})
