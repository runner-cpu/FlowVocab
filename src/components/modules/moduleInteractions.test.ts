import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useProgress } from '../../store/progressStore'
import GrammarGame from './grammar/GrammarGame'
import ListeningGame from './listening/ListeningGame'
import SentenceGame from './sentence/SentenceGame'
import WritingGame from './writing/WritingGame'
import ReadingGame from './reading/ReadingGame'
import { GRAMMAR_NODES } from '../../data/grammar'
import { LISTENING_ITEMS } from '../../data/listening'
import { WRITING_TASKS } from '../../data/writing'
import { CHAPTERS } from '../../data/reading'
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

describe('module submission timing', () => {
  let answer: ReturnType<typeof vi.fn>
  let now = 100
  beforeEach(() => {
    now = 100
    answer = vi.fn().mockResolvedValue(undefined)
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    useProgress.setState({ answer, passSentence: vi.fn(), passListening: vi.fn(), submitWriting: vi.fn(), completeReading: vi.fn(), completeGrammarNode: vi.fn(), progress: { id: 1, radar: { vocab: 0, grammar: 0, sentence: 0, listening: 0, writing: 0, reading: 0 }, skillTree: {}, cards: [], narrative: {}, writingLog: [], sentencePassed: 0, listeningPassed: 0, writingDone: 0, writingScoreSum: 0, readingDone: 0 } })
  })
  afterEach(() => { cleanup(); vi.restoreAllMocks() })
  function expectTimed(module: string, ms: number) {
    expect(answer).toHaveBeenCalledWith(expect.objectContaining({ module, timeMs: ms }))
    expect(answer.mock.calls[0][0]).not.toHaveProperty('medianMs')
  }
  it('sends measured grammar timing', () => {
    render(createElement(GrammarGame)); const node = GRAMMAR_NODES.find(item => !item.parent)!
    fireEvent.click(screen.getByRole('button', { name: node.name })); now = 450
    fireEvent.click(screen.getByRole('button', { name: node.quizzes[0].options[0] })); expectTimed('grammar', 350)
  })
  it('sends measured fallback-listening timing', () => {
    render(createElement(ListeningGame)); now = 460
    fireEvent.click(screen.getByRole('button', { name: LISTENING_ITEMS[0].blanks[0].options[0] })); expectTimed('listening', 360)
  })
  it('completes fallback listening only after non-contiguous blanks use their own options', () => {
    const passListening = vi.fn()
    useProgress.setState({ passListening })
    render(createElement(ListeningGame, { items: [{ id: 'two-blanks', level: 0, text: 'Alpha beta gamma delta.', blanks: [{ index: 1, answer: 'beta', options: ['beta', 'wrong-beta'] }, { index: 3, answer: 'delta.', options: ['wrong-delta', 'delta.'] }] }] }))
    fireEvent.click(screen.getByRole('button', { name: 'beta' }))
    expect(passListening).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'delta.' }))
    expect(passListening).toHaveBeenCalledOnce()
    expect(answer.mock.calls.map(([call]) => call.correct)).toEqual([true, true])
  })
  it('sends one incorrect sentence result after a wrong bucket then completion', () => {
    render(createElement(SentenceGame)); const first = screen.getByRole('button', { name: 'Students' }); fireEvent.click(first)
    fireEvent.click(screen.getByRole('button', { name: /放入从句/ }));
    now = 500
    const bucketLabels = { main: '主干', clause: '从句', modifier: '修饰成分' }
    for (const segment of [{ text: 'Students', bucket: 'main' }, { text: 'who practice speaking English every day', bucket: 'clause' }, { text: 'can improve their fluency', bucket: 'main' }, { text: 'quickly', bucket: 'modifier' }] as const) { fireEvent.click(screen.getByRole('button', { name: segment.text })); fireEvent.click(screen.getByRole('button', { name: new RegExp('放入' + bucketLabels[segment.bucket]) })); }
    expectTimed('sentence', 400); expect(answer).toHaveBeenCalledTimes(1); expect(answer.mock.calls[0][0]).toMatchObject({ correct: false })
  })
  it('sends measured writing timing', () => {
    render(createElement(WritingGame)); const task = WRITING_TASKS.find(item => item.type === 'error')!
    fireEvent.click(screen.getByRole('button', { name: new RegExp(task.title) })); now = 470; fireEvent.click(screen.getByRole('button', { name: task.options![0] })); fireEvent.click(screen.getByRole('button', { name: '提交判定' })); expectTimed('writing', 370)
  })
  it('sends measured reading timing', () => {
    const chapter = CHAPTERS[0]; render(createElement(ReadingGame)); fireEvent.click(screen.getByRole('button', { name: new RegExp(chapter.title) })); fireEvent.click(screen.getByRole('button', { name: new RegExp(chapter.nodes[chapter.start].choices[0].label) })); const quizChoice = chapter.nodes.n1.choices[0]; fireEvent.click(screen.getByRole('button', { name: new RegExp(quizChoice.label) })); now = 490; fireEvent.click(screen.getByRole('button', { name: quizChoice.quiz!.options[0] })); expectTimed('reading', 390)
  })
})
