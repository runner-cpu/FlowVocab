import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ListeningGame from './ListeningGame'
import { useProgress } from '../../../store/progressStore'
import { useUI } from '../../../store/gameStore'
import { DIALOGUE_SCENES } from '../../../data/dialogue'
import type { ListeningItem } from '../../../types'

const items: ListeningItem[] = [
  { id: 'first', level: 0, text: 'The library opens.', blanks: [{ index: 2, answer: 'opens.', options: ['opens.', 'closes.'] }] },
  { id: 'second', level: 0, text: 'She likes tea.', blanks: [{ index: 2, answer: 'tea.', options: ['tea.', 'coffee.'] }] }
]
beforeEach(() => {
  useProgress.setState({ answer: vi.fn().mockResolvedValue(undefined), passListening: vi.fn().mockResolvedValue(undefined), saveError: null })
})
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

it('clears all previous selections when advancing and when restarting a round', () => {
  vi.useFakeTimers()
  render(<ListeningGame items={items} />)
  fireEvent.click(screen.getByRole('button', { name: 'opens.' }))
  act(() => { vi.advanceTimersByTime(1200) })
  expect(screen.getByRole('button', { name: 'tea.' })).toBeEnabled()
  fireEvent.click(screen.getByRole('button', { name: 'tea.' }))
  act(() => { vi.advanceTimersByTime(1200) })
  fireEvent.click(screen.getByRole('button', { name: '再来一轮' }))
  expect(screen.getByRole('button', { name: 'opens.' })).toBeEnabled()
})

it('offers a usable selection mode after microphone permission is denied', () => {
  class DeniedRecognition {
    onerror?: (event: { error: string }) => void
    start() { this.onerror?.({ error: 'not-allowed' }) }
    stop() {}
    abort() {}
  }
  vi.stubGlobal('SpeechRecognition', DeniedRecognition)
  render(<ListeningGame items={items} />)
  fireEvent.click(screen.getByRole('button', { name: /开始跟读/ }))
  expect(screen.getByRole('alert')).toHaveTextContent(/麦克风/)
  expect(screen.getByRole('button', { name: 'opens.' })).toBeEnabled()
})

it('ignores late speech results after leaving the module', () => {
  let recognition: { onresult?: (event: unknown) => void } = {}
  class DelayedRecognition {
    onresult?: (event: unknown) => void
    constructor() { recognition = this }
    start() {}
    stop() {}
    abort() {}
  }
  vi.stubGlobal('SpeechRecognition', DelayedRecognition)
  const { unmount } = render(<ListeningGame items={items} />)
  fireEvent.click(screen.getByRole('button', { name: /开始跟读/ }))
  const callback = recognition.onresult
  unmount()
  act(() => { callback?.({ results: { 0: { 0: { transcript: 'The library opens' } } } }) })
  expect(useProgress.getState().answer).not.toHaveBeenCalled()
})

describe('listening mode tabs', () => {
  beforeEach(() => { useUI.setState({ track: 'middle-high' }) })

  it('keeps dictation as the default tab and still runs the dictation flow', () => {
    vi.useFakeTimers()
    render(<ListeningGame items={items} />)
    const dictation = screen.getByRole('tab', { name: '听写工坊' })
    const dialogue = screen.getByRole('tab', { name: '语音陪练' })
    expect(dictation).toHaveAttribute('aria-selected', 'true')
    expect(dialogue).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tablist', { name: '听力练习模式' })).toBeInTheDocument()
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'listening-panel-dictation')
    expect(dialogue).toHaveAttribute('tabindex', '-1')
    fireEvent.click(screen.getByRole('button', { name: 'opens.' }))
    act(() => { vi.advanceTimersByTime(1200) })
    expect(screen.getByRole('button', { name: 'tea.' })).toBeEnabled()
  })

  it('switches to the dialogue tab with a labelled scene selector and keyboard tabs', () => {
    render(<ListeningGame items={items} />)
    fireEvent.click(screen.getByRole('tab', { name: '语音陪练' }))
    const dialogueTab = screen.getByRole('tab', { name: '语音陪练' })
    expect(dialogueTab).toHaveAttribute('aria-selected', 'true')
    expect(dialogueTab).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'listening-panel-dialogue')
    const select = screen.getByLabelText('选择场景')
    expect(select.tagName).toBe('SELECT')
    const trackScene = DIALOGUE_SCENES.find(scene => scene.id === 'radio-station')!
    expect(screen.getByRole('heading', { name: trackScene.title })).toBeInTheDocument()
    const options = Array.from(select.querySelectorAll('option')).map(option => option.textContent)
    expect(options).toEqual(DIALOGUE_SCENES.map(scene => `${scene.title} · ${scene.place}`))
    fireEvent.change(select, { target: { value: 'grammar-garden' } })
    expect(screen.getByRole('heading', { name: '语法花园' })).toBeInTheDocument()
    dialogueTab.focus()
    fireEvent.keyDown(dialogueTab, { key: 'ArrowRight' })
    const dictation = screen.getByRole('tab', { name: '听写工坊' })
    expect(dictation).toHaveAttribute('aria-selected', 'true')
    expect(document.activeElement).toBe(dictation)
    fireEvent.keyDown(dictation, { key: 'ArrowLeft' })
    expect(screen.getByRole('tab', { name: '语音陪练' })).toHaveAttribute('aria-selected', 'true')
  })

  it('records a scored dialogue question in local progress without breaking dictation', () => {
    render(<ListeningGame items={items} />)
    fireEvent.click(screen.getByRole('tab', { name: '语音陪练' }))
    const scene = DIALOGUE_SCENES.find(candidate => candidate.id === 'radio-station')!
    expect(scene.questions).toHaveLength(5)
    for (const question of scene.questions.slice(0, 2)) {
      fireEvent.change(screen.getByLabelText('输入你要说的英文句子'), { target: { value: question.spoken } })
      fireEvent.click(screen.getByRole('button', { name: '提交答案' }))
      expect(screen.getByText(/星级 3 \/ 3/)).toBeInTheDocument()
      if (question !== scene.questions[1]) fireEvent.click(screen.getByRole('button', { name: '下一题' }))
    }
    // 2 / 5 题通过 → 40% → 1 星，进度只来自组件状态，没有任何存储写入。
    expect(screen.getByLabelText(/场景进度/)).toHaveAttribute('aria-label', '场景进度 1 星')
    expect(useProgress.getState().passListening).not.toHaveBeenCalled()
    expect(useProgress.getState().answer).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('tab', { name: '听写工坊' }))
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'listening-panel-dictation')
    fireEvent.click(screen.getByRole('button', { name: 'opens.' }))
    expect(useProgress.getState().answer).toHaveBeenCalledTimes(1)
    expect(vi.mocked(useProgress.getState().answer).mock.calls[0][0]).toMatchObject({ module: 'listening', correct: true })
    fireEvent.click(screen.getByRole('tab', { name: '语音陪练' }))
    expect(screen.getByLabelText('场景进度 1 星')).toBeInTheDocument()
  })
})
