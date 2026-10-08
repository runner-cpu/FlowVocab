import { primaryPos } from '../data/contentValidation'
import { formatMeaning, sameMeaning } from './meaning'
import type { VocabMode, VocabQuestion, Word } from '../types'

export function hasPronunciation(): boolean {
  return typeof window !== 'undefined' && typeof window.speechSynthesis?.speak === 'function' && typeof window.SpeechSynthesisUtterance === 'function'
}

export function speakWord(word: string, rate = 0.9): boolean {
  if (!hasPronunciation()) return false
  try {
    const utterance = new SpeechSynthesisUtterance(word)
    utterance.lang = 'en-US'
    utterance.rate = Number.isFinite(rate) ? Math.min(2, Math.max(0.5, rate)) : 0.9
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
    return true
  } catch {
    return false
  }
}

export function vocabModeAt(index: number, word: Word, pronunciationSupported: boolean): VocabMode {
  const mode = (['meaning', 'listening', 'spelling'] as const)[index % 3]
  if (mode === 'listening' && !pronunciationSupported) return 'meaning'
  if (mode === 'spelling' && !/^[a-z][a-z '-]*$/i.test(word.word)) return 'meaning'
  return mode
}

function shuffle<T>(values: T[], random: () => number): T[] {
  const result = [...values]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.min(i, Math.max(0, Math.floor(random() * (i + 1))))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
function takeDistractors(word: Word, pool: Word[], random: () => number): string[] {
  const target = formatMeaning(word.meaning)
  const seen = new Set([target]); const picked: string[] = []
  const all = pool.filter(entry => entry.id !== word.id && formatMeaning(entry.meaning) && !seen.has(formatMeaning(entry.meaning)))
  const groups = [all.filter(entry => primaryPos(entry) === primaryPos(word)), all.filter(entry => entry.level === word.level), all]
  for (const group of groups) {
    const available = group.filter(entry => !seen.has(formatMeaning(entry.meaning)))
    while (available.length && picked.length < 3) {
      const index = Math.min(available.length - 1, Math.floor(random() * available.length))
      const entry = available.splice(index, 1)[0]; seen.add(formatMeaning(entry.meaning)); picked.push(formatMeaning(entry.meaning))
    }
    if (picked.length === 3) break
  }
  return picked
}

export function createVocabQuestion(word: Word, pool: Word[], requestedMode: VocabMode, { random = Math.random, number = 1, pronunciationSupported = hasPronunciation() }: { random?: () => number; number?: number; pronunciationSupported?: boolean } = {}): VocabQuestion {
  const mode = requestedMode === 'listening' && !pronunciationSupported ? 'meaning' : requestedMode
  const options: VocabQuestion['options'] = []
  const answer = formatMeaning(word.meaning)
  if (mode !== 'spelling') {
    const meanings = [answer, ...takeDistractors(word, pool, random)]
    options.push(...shuffle(meanings, random).map(text => ({ text, correct: text === answer })))
  }
  return { word, mode, prompt: mode === 'listening' ? '听发音，选择对应释义' : mode === 'spelling' ? answer : word.word, options, boss: number > 0 && number % 10 === 0 }
}

export function isVocabAnswerCorrect(question: VocabQuestion, answer: string): boolean {
  return question.mode === 'spelling'
    ? answer.trim().toLowerCase() === question.word.word.trim().toLowerCase()
    : question.options.some(option => option.correct && sameMeaning(option.text, answer))
}
