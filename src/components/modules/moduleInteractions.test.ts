import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { useProgress } from '../../store/progressStore'
import { useUI } from '../../store/gameStore'
import GrammarGame from './grammar/GrammarGame'
import ListeningGame from './listening/ListeningGame'
import SentenceGame from './sentence/SentenceGame'
import WritingGame from './writing/WritingGame'
import ReadingGame from './reading/ReadingGame'
import { GRAMMAR_NODES } from '../../data/grammar'
import { LISTENING_ITEMS } from '../../data/listening'
import { WRITING_TASKS } from '../../data/writing'
import { CHAPTERS } from '../../data/reading'
import { SENTENCE_QUESTS } from '../../data/sentences'
import { placeSentenceSegment } from './sentence/SentenceGame'
import { moveWritingSegment } from './writing/WritingGame'
import { ruleExplanation, inferErrorTag } from '../../engine/errorRouting'

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

describe('single-step undo', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    useUI.setState({ track: 'cet' })
    useProgress.setState({
      answer: vi.fn().mockResolvedValue(undefined),
      passSentence: vi.fn().mockResolvedValue(undefined),
      submitWriting: vi.fn().mockResolvedValue(undefined)
    })
  })

  afterEach(() => { cleanup(); vi.restoreAllMocks() })

  it('restores a sentence fragment to the pool after one placement', () => {
    render(createElement(SentenceGame))
    const undo = screen.getByRole('button', { name: '撤回上一步' })
    expect(undo).toBeDisabled()

    const segment = screen.getByRole('button', { name: 'Students' })
    fireEvent.click(segment)
    fireEvent.click(screen.getByRole('button', { name: /放入主干/ }))
    expect(segment).toBeDisabled()

    fireEvent.click(undo)
    expect(segment).toBeEnabled()
    expect(undo).toBeDisabled()
  })

  it('restores the previous writing fragment order after one move', () => {
    const { container } = render(createElement(WritingGame))
    const answer = container.querySelector('.sortable-answer')!
    const readOrder = () => [...answer.querySelectorAll('.sort-chip > span:first-child')].map((node) => node.textContent)
    const original = readOrder()
    const move = screen.getAllByRole('button', { name: /向后移动/ }).find((button) => !button.hasAttribute('disabled'))!

    fireEvent.click(move)
    expect(readOrder()).not.toEqual(original)
    const undo = screen.getByRole('button', { name: '撤回上一步' })
    expect(undo).toBeEnabled()

    fireEvent.click(undo)
    expect(readOrder()).toEqual(original)
    expect(undo).toBeDisabled()
  })
})

describe('learning-route state isolation', () => {
  beforeEach(() => {
    useProgress.setState({ answer: vi.fn().mockResolvedValue(undefined), passSentence: vi.fn().mockResolvedValue(undefined), passListening: vi.fn().mockResolvedValue(undefined), submitWriting: vi.fn().mockResolvedValue(undefined), completeReading: vi.fn().mockResolvedValue(undefined), completeGrammarNode: vi.fn().mockResolvedValue(undefined), progress: { id: 1, radar: { vocab: 0, grammar: 0, sentence: 0, listening: 0, writing: 0, reading: 0 }, skillTree: {}, cards: [], narrative: {}, writingLog: [], sentencePassed: 0, listeningPassed: 0, writingDone: 0, writingScoreSum: 0, readingDone: 0 } })
  })
  afterEach(() => cleanup())

  it('leaves an active grammar lesson when the route changes', () => {
    useUI.setState({ track: 'middle-high' })
    const node = GRAMMAR_NODES.find((candidate) => candidate.id === 'relative-pronoun')!
    render(createElement(GrammarGame))
    fireEvent.click(screen.getByRole('button', { name: node.name }))
    expect(screen.getByText(node.desc)).toBeVisible()
    act(() => { useUI.getState().setTrack('primary') })
    expect(screen.queryByText(node.desc)).toBeNull()
    expect(screen.getByRole('button', { name: GRAMMAR_NODES.find((candidate) => candidate.id === 'tense-basic')!.name })).toBeVisible()
  })

  it('clears placed sentence fragments when the route changes', () => {
    useUI.setState({ track: 'middle-high' })
    render(createElement(SentenceGame))
    const fragment = SENTENCE_QUESTS.find((quest) => quest.id === 'p1')!.segments![0].text
    const button = screen.getByRole('button', { name: fragment })
    fireEvent.click(button)
    fireEvent.click(screen.getByRole('button', { name: /放入主干/ }))
    expect(button).toBeDisabled()
    act(() => { useUI.getState().setTrack('advanced') })
    const advanced = SENTENCE_QUESTS.find((quest) => quest.id === 't1')!
    expect(screen.getByText(advanced.sentence)).toBeVisible()
    expect(screen.queryByRole('button', { name: fragment })).toBeNull()
  })

  it('returns writing practice to the first task when the route changes', () => {
    useUI.setState({ track: 'middle-high' })
    render(createElement(WritingGame))
    const middleTask = WRITING_TASKS.find((task) => task.id === 'w-sort-2')!
    fireEvent.click(screen.getByRole('button', { name: new RegExp(middleTask.title) }))
    expect(screen.getByText(middleTask.prompt)).toBeVisible()
    act(() => { useUI.getState().setTrack('advanced') })
    const advancedTask = WRITING_TASKS.find((task) => task.id === 'w-sort-3')!
    expect(screen.getByText(advancedTask.prompt)).toBeVisible()
  })

  it('exits an active reading chapter when the route changes', () => {
    useUI.setState({ track: 'middle-high' })
    render(createElement(ReadingGame))
    const secondChapter = CHAPTERS.find((candidate) => candidate.id === 'ch2')!
    fireEvent.click(screen.getByRole('button', { name: new RegExp(secondChapter.title) }))
    expect(screen.getByText(secondChapter.nodes[secondChapter.start].text)).toBeVisible()
    act(() => { useUI.getState().setTrack('primary') })
    const primaryChapter = CHAPTERS.find((candidate) => candidate.id === 'ch1')!
    expect(screen.getByRole('button', { name: new RegExp(primaryChapter.title) })).toBeVisible()
    expect(screen.queryByText(secondChapter.nodes[secondChapter.start].text)).toBeNull()
  })

  it('reloads the listening pool when the route changes', () => {
    useUI.setState({ track: 'primary' })
    render(createElement(ListeningGame))
    expect(screen.getByRole('button', { name: 'opens' })).toBeVisible()
    act(() => { useUI.getState().setTrack('advanced') })
    expect(screen.getByRole('button', { name: 'report' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'opens' })).toBeNull()
  })
})

describe('module submission timing', () => {
  let answer: ReturnType<typeof vi.fn<ReturnType<typeof useProgress.getState>['answer']>>
  let now = 100
  beforeEach(() => {
    now = 100
    answer = vi.fn().mockResolvedValue(undefined)
    useUI.setState({ track: 'middle-high' })
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
    expect(answer).toHaveBeenCalledOnce()
    expect(answer.mock.calls[0][0]).toMatchObject({ module: 'listening', correct: true })
  })
  it('ignores duplicate speech-recognition result callbacks for one sentence', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'SpeechRecognition')
    class DuplicateRecognition {
      lang = ''
      interimResults = false
      continuous = false
      onresult: ((event: { results: { 0: { 0: { transcript: string } } } }) => void) | null = null
      onend: (() => void) | null = null
      onerror: (() => void) | null = null
      start() {
        const event = { results: { 0: { 0: { transcript: 'Students practice speaking English every day' } } } }
        this.onresult?.(event)
        this.onresult?.(event)
        this.onend?.()
      }
      stop() {}
    }
    Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: DuplicateRecognition })
    try {
      render(createElement(ListeningGame, { items: [{ id: 'speech-once', level: 0, text: 'Students practice speaking English every day', blanks: [] }] }))
      fireEvent.click(screen.getByRole('button', { name: /开始/ }))
      expect(answer).toHaveBeenCalledOnce()
    } finally {
      if (original) Object.defineProperty(window, 'SpeechRecognition', original)
      else delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition
    }
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
    useUI.getState().setTrack('cet')
    render(createElement(WritingGame)); const task = WRITING_TASKS.find(item => item.type === 'error')!
    fireEvent.click(screen.getByRole('button', { name: new RegExp(task.title) })); now = 470; fireEvent.click(screen.getByRole('button', { name: task.options![0] })); fireEvent.click(screen.getByRole('button', { name: '提交判定' })); expectTimed('writing', 370)
  })
  it('sends measured reading timing', () => {
    const chapter = CHAPTERS[0]; render(createElement(ReadingGame)); fireEvent.click(screen.getByRole('button', { name: new RegExp(chapter.title) })); fireEvent.click(screen.getByRole('button', { name: new RegExp(chapter.nodes[chapter.start].choices[0].label) })); const quizChoice = chapter.nodes.n1.choices[0]; fireEvent.click(screen.getByRole('button', { name: new RegExp(quizChoice.label) })); now = 490; fireEvent.click(screen.getByRole('button', { name: quizChoice.quiz!.options[0] })); expectTimed('reading', 390)
  })
})

describe('offline error-reason layer', () => {
  const tagHeading = (tag: Parameters<typeof ruleExplanation>[0]) => ruleExplanation(tag, {}).title

  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    useProgress.setState({
      answer: vi.fn().mockResolvedValue(undefined),
      passSentence: vi.fn().mockResolvedValue(undefined),
      passListening: vi.fn().mockResolvedValue(undefined),
      submitWriting: vi.fn().mockResolvedValue(undefined),
      completeReading: vi.fn().mockResolvedValue(undefined),
      completeGrammarNode: vi.fn().mockResolvedValue(undefined),
      progress: { id: 1, radar: { vocab: 0, grammar: 0, sentence: 0, listening: 0, writing: 0, reading: 0 }, skillTree: {}, cards: [], narrative: {}, writingLog: [], sentencePassed: 0, listeningPassed: 0, writingDone: 0, writingScoreSum: 0, readingDone: 0 }
    })
  })
  afterEach(() => {
    cleanup()
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('shows exactly one grammar rule card on a wrong answer and unmounts it when the question advances', () => {
    vi.useFakeTimers()
    const node = GRAMMAR_NODES.find((candidate) => candidate.id === 'tense-basic')!
    const quiz = node.quizzes[0]
    const wrong = quiz.options.findIndex((_, index) => index !== quiz.answer)
    const tag = inferErrorTag({ module: 'grammar', prompt: quiz.prompt, options: quiz.options, chosen: quiz.options[wrong], correctAnswer: quiz.options[quiz.answer], explain: quiz.explain })
    useUI.setState({ track: 'primary' })
    render(createElement(GrammarGame))
    fireEvent.click(screen.getByRole('button', { name: node.name }))
    fireEvent.click(screen.getByRole('button', { name: quiz.options[wrong] }))

    const cards = document.querySelectorAll('.error-card')
    expect(cards).toHaveLength(1)
    const card = cards[0] as HTMLElement
    expect(card).toHaveAttribute('data-error-tag', tag)
    const heading = within(card).getByRole('heading', { level: 3 })
    expect(heading).toHaveTextContent(tagHeading(tag))
    expect(card.textContent).toContain(quiz.explain)
    expect(screen.getByRole('button', { name: '收起错因卡片' })).toBeVisible()
    expect(document.activeElement).not.toHaveClass('error-card-dismiss')

    fireEvent.click(screen.getByRole('button', { name: '重新作答' }))
    expect(document.querySelector('.error-card')).toBeNull()

    // 答错后选项保持锁定，只有「重新作答」能解锁；再次答错仍只渲染一张卡片。
    fireEvent.click(screen.getByRole('button', { name: quiz.options[wrong] }))
    expect(document.querySelectorAll('.error-card')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: '重新作答' }))
    expect(document.querySelector('.error-card')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: quiz.options[quiz.answer] }))
    act(() => { vi.advanceTimersByTime(1000) })
    expect(document.querySelector('.error-card')).toBeNull()
    expect(screen.getByText('第 2 / 2 题')).toBeVisible()
  })
  it('dismisses the grammar rule card through its own affordance without stealing focus', () => {
    const node = GRAMMAR_NODES.find((candidate) => candidate.id === 'tense-basic')!
    const quiz = node.quizzes[0]
    const wrong = quiz.options.findIndex((_, index) => index !== quiz.answer)
    useUI.setState({ track: 'primary' })
    render(createElement(GrammarGame))
    fireEvent.click(screen.getByRole('button', { name: node.name }))
    const option = screen.getByRole('button', { name: quiz.options[wrong] })
    fireEvent.click(option)
    expect(document.querySelectorAll('.error-card')).toHaveLength(1)
    // 卡片挂载本身不抢焦点：焦点仍留在卡片之外。
    expect((document.activeElement as HTMLElement | null)?.closest?.('.error-card') ?? null).toBeNull()
    const dismiss = screen.getByRole('button', { name: '收起错因卡片' })
    dismiss.focus()
    fireEvent.click(dismiss)
    expect(document.querySelector('.error-card')).toBeNull()
    expect(document.activeElement).not.toBe(dismiss)
  })

  it('shows one sentence rule card for a wrong bucket placement and clears it on undo and reset', () => {
    vi.useFakeTimers()
    useUI.setState({ track: 'middle-high' })
    render(createElement(SentenceGame))
    const quest = SENTENCE_QUESTS.find((candidate) => candidate.id === 'p1')!
    const segment = screen.getByRole('button', { name: quest.segments![0].text })
    fireEvent.click(segment)
    fireEvent.click(screen.getByRole('button', { name: /放入从句/ }))

    const cards = document.querySelectorAll('.error-card')
    expect(cards).toHaveLength(1)
    const card = cards[0] as HTMLElement
    const expected = inferErrorTag({ module: 'sentence', sentence: quest.sentence, options: quest.options, chosen: '从句', correctAnswer: '主干' })
    expect(card).toHaveAttribute('data-error-tag', expected)
    expect(within(card).getByRole('heading', { level: 3 })).toHaveTextContent(tagHeading(expected))
    expect(screen.getByRole('button', { name: '收起错因卡片' })).toBeVisible()
    expect(document.activeElement).not.toHaveClass('error-card-dismiss')

    act(() => { vi.advanceTimersByTime(500) })
    fireEvent.click(screen.getByRole('button', { name: '重置本题' }))
    expect(document.querySelector('.error-card')).toBeNull()

    fireEvent.click(segment)
    fireEvent.click(screen.getByRole('button', { name: /放入从句/ }))
    act(() => { vi.advanceTimersByTime(500) })
    expect(document.querySelectorAll('.error-card')).toHaveLength(1)
    fireEvent.click(segment)
    fireEvent.click(screen.getByRole('button', { name: /放入主干/ }))
    expect(document.querySelector('.error-card')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '撤回上一步' }))
    expect(document.querySelector('.error-card')).toBeNull()
  })

  it('shows one sentence translation rule card on a wrong choice and clears it on retry', () => {
    vi.useFakeTimers()
    useUI.setState({ track: 'advanced' })
    render(createElement(SentenceGame))
    const quest = SENTENCE_QUESTS.find((candidate) => candidate.id === 't1')!
    const wrong = quest.options!.findIndex((_, index) => index !== quest.answer)
    const tag = inferErrorTag({ module: 'sentence', sentence: quest.sentence, options: quest.options, chosen: quest.options![wrong], correctAnswer: quest.options![quest.answer!], explain: quest.explain })
    fireEvent.click(screen.getByRole('button', { name: quest.options![wrong] }))

    const cards = document.querySelectorAll('.error-card')
    expect(cards).toHaveLength(1)
    const card = cards[0] as HTMLElement
    expect(card).toHaveAttribute('data-error-tag', tag)
    expect(within(card).getByRole('heading', { level: 3 })).toHaveTextContent(tagHeading(tag))
    expect(card.textContent).toContain(quest.explain!)
    expect(screen.getByRole('button', { name: '收起错因卡片' })).toBeVisible()

    act(() => { vi.advanceTimersByTime(1000) })
    expect(document.querySelector('.error-card')).toBeNull()
  })

  it('shows one writing rule card on a failed submission and unmounts it on task switch and retry', () => {
    useUI.setState({ track: 'cet' })
    render(createElement(WritingGame))
    const task = WRITING_TASKS.find((candidate) => candidate.id === 'w-err-1')!
    const wrong = task.options!.findIndex((_, index) => index !== task.answer)
    const tag = inferErrorTag({ module: 'writing', prompt: task.prompt, sentence: task.sentence, options: task.options, chosen: task.options![wrong], correctAnswer: task.options![task.answer!], explain: task.explain })
    fireEvent.click(screen.getByRole('button', { name: new RegExp(task.title) }))
    fireEvent.click(screen.getByRole('button', { name: task.options![wrong] }))
    fireEvent.click(screen.getByRole('button', { name: '提交判定' }))

    const cards = document.querySelectorAll('.error-card')
    expect(cards).toHaveLength(1)
    const card = cards[0] as HTMLElement
    expect(card).toHaveAttribute('data-error-tag', tag)
    expect(within(card).getByRole('heading', { level: 3 })).toHaveTextContent(tagHeading(tag))
    expect(card.textContent).toContain(task.explain!)
    expect(screen.getByRole('button', { name: '收起错因卡片' })).toBeVisible()
    expect(document.activeElement).not.toHaveClass('error-card-dismiss')

    fireEvent.click(screen.getByRole('button', { name: /下一题/ }))
    expect(document.querySelector('.error-card')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: new RegExp(task.title) }))
    fireEvent.click(screen.getByRole('button', { name: task.options![wrong] }))
    fireEvent.click(screen.getByRole('button', { name: '提交判定' }))
    expect(document.querySelectorAll('.error-card')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: '收起错因卡片' }))
    expect(document.querySelector('.error-card')).toBeNull()
  })

  it('shows the writing rule card for a failed sort submission without an answer pair', () => {
    useUI.setState({ track: 'cet' })
    render(createElement(WritingGame))
    const task = WRITING_TASKS.find((candidate) => candidate.id === 'w-sort-1')!
    const tag = inferErrorTag({ module: 'writing', prompt: task.prompt, sentence: task.sentence, options: task.options, chosen: undefined, correctAnswer: undefined, explain: task.explain })
    const move = screen.getAllByRole('button', { name: /向后移动/ }).find((button) => !button.hasAttribute('disabled'))!
    fireEvent.click(move)
    fireEvent.click(screen.getByRole('button', { name: '提交判定' }))

    const cards = document.querySelectorAll('.error-card')
    expect(cards).toHaveLength(1)
    const card = cards[0] as HTMLElement
    expect(card).toHaveAttribute('data-error-tag', tag)
    expect(within(card).getByRole('heading', { level: 3 })).toHaveTextContent(tagHeading(tag))
    expect(card.querySelector('.error-card-answers')).toBeNull()
    expect(card.textContent).toContain(task.explain!)
    fireEvent.click(screen.getByRole('button', { name: '收起错因卡片' }))
    expect(document.querySelector('.error-card')).toBeNull()
  })
})
