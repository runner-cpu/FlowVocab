import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import ListeningGame from './ListeningGame'
import { useProgress } from '../../../store/progressStore'
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
