import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import DialogueMode from './DialogueMode'
import { DIALOGUE_SCENES, type DialogueScene } from '../../../data/dialogue'

/** 真实内容的精简场景：只保留两题，便于断言推进与重置。 */
const scene: DialogueScene = {
  id: 'test-scene',
  title: '测试码头',
  place: '测试港口',
  heroLine: 'Hello from the test harbour.',
  questions: [
    {
      id: 't1',
      prompt: '我们今天到了港口。',
      spoken: 'We arrived at the harbour today.',
      keywords: ['arrived', 'harbour'],
      distractors: ['arrival'],
      rule: 'past-tense'
    },
    {
      id: 't2',
      prompt: '她有两只猫。',
      spoken: 'She has two cats.',
      keywords: ['has', 'cats'],
      distractors: ['hat'],
      rule: 'plural'
    }
  ]
}

interface FakeRecognitionInstance {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((event: { results: { [index: number]: { 0: { transcript: string; confidence?: number } } } }) => void) | null
  onend: (() => void) | null
  onerror: ((event: { error?: string }) => void) | null
  started: number
  aborted: number
  start: () => void
  stop: () => void
  abort: () => void
}

function installRecognition(): { instances: FakeRecognitionInstance[] } {
  const instances: FakeRecognitionInstance[] = []
  class FakeRecognition implements FakeRecognitionInstance {
    lang = ''
    interimResults = false
    continuous = false
    onresult: FakeRecognitionInstance['onresult'] = null
    onend: (() => void) | null = null
    onerror: ((event: { error?: string }) => void) | null = null
    started = 0
    aborted = 0
    constructor() {
      instances.push(this)
    }
    start() {
      this.started += 1
    }
    stop() {}
    abort() {
      this.aborted += 1
    }
  }
  vi.stubGlobal('SpeechRecognition', FakeRecognition)
  return { instances }
}

function speechEvent(transcript: string, confidence?: number) {
  return { results: { 0: { 0: { transcript, ...(confidence === undefined ? {} : { confidence }) } } } }
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('DialogueMode', () => {
  it('renders the real scene content and refuses to autofocus the fallback input', () => {
    render(<DialogueMode scene={DIALOGUE_SCENES[0]} />)
    expect(screen.getByRole('heading', { name: '微光港' })).toBeInTheDocument()
    expect(screen.getByText(DIALOGUE_SCENES[0].heroLine)).toBeInTheDocument()
    expect(screen.getByText(DIALOGUE_SCENES[0].questions[0].prompt)).toBeInTheDocument()
    const input = screen.getByLabelText('输入你要说的英文句子')
    expect(document.activeElement).not.toBe(input)
  })

  it('speaks the hero line through speech synthesis when available', () => {
    const spoken: string[] = []
    vi.stubGlobal('speechSynthesis', { cancel: vi.fn(), speak: vi.fn((utterance: { text: string }) => spoken.push(utterance.text)) })
    class FakeUtterance {
      text: string
      lang = ''
      rate = 1
      onend: (() => void) | null = null
      onerror: (() => void) | null = null
      constructor(text: string) {
        this.text = text
      }
    }
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
    render(<DialogueMode scene={scene} />)
    fireEvent.click(screen.getByRole('button', { name: '播放示范' }))
    expect(spoken).toEqual([scene.heroLine])
  })

  it('scores a typed answer through the real engine and highlights every token', () => {
    render(<DialogueMode scene={scene} />)
    const input = screen.getByLabelText('输入你要说的英文句子')
    fireEvent.change(input, { target: { value: 'We arrived at the harbour today.' } })
    fireEvent.click(screen.getByRole('button', { name: '提交答案' }))
    expect(screen.getByText(/星级 3 \/ 3/)).toBeInTheDocument()
    const reference = document.querySelectorAll('.dialogue-reference .dialogue-token')
    expect(reference).toHaveLength(6)
    expect(document.querySelectorAll('.dialogue-reference .dialogue-hit')).toHaveLength(6)
    expect(document.querySelectorAll('.dialogue-reference .dialogue-miss')).toHaveLength(0)
    expect(screen.getByText(/关键词全部命中/).closest('[aria-live="polite"]')).not.toBeNull()
  })

  it('marks the missed token and reports the distractor that replaced it', () => {
    render(<DialogueMode scene={scene} />)
    fireEvent.change(screen.getByLabelText('输入你要说的英文句子'), { target: { value: 'We arrival at the harbour today.' } })
    fireEvent.click(screen.getByRole('button', { name: '提交答案' }))
    expect(document.querySelectorAll('.dialogue-reference .dialogue-miss')).toHaveLength(1)
    expect(document.querySelector('.dialogue-reference .dialogue-miss')?.textContent).toBe('arrived')
    expect(screen.getByText(/「arrival」/)).toBeInTheDocument()
  })

  it('never submits twice and advances with the next-question button', () => {
    const onScored = vi.fn()
    render(<DialogueMode scene={scene} onScored={onScored} />)
    fireEvent.change(screen.getByLabelText('输入你要说的英文句子'), { target: { value: 'We arrived at the harbour today.' } })
    fireEvent.click(screen.getByRole('button', { name: '提交答案' }))
    fireEvent.click(screen.getByRole('button', { name: '提交答案' }))
    expect(onScored).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: '下一题' }))
    expect(screen.getByText('她有两只猫。')).toBeInTheDocument()
    expect(screen.getByText(/第 2 \/ 2 题/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '提交答案' })).toBeDisabled()
  })

  it('falls back to typing when recognition errors and stops the recognizer', () => {
    const { instances } = installRecognition()
    render(<DialogueMode scene={scene} />)
    fireEvent.click(screen.getByRole('button', { name: '开始跟读' }))
    expect(instances).toHaveLength(1)
    act(() => {
      instances[0].onerror?.({ error: 'not-allowed' })
    })
    expect(screen.getByRole('alert')).toHaveTextContent(/已切换到打字输入/)
    expect(screen.queryByRole('button', { name: '开始跟读' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('输入你要说的英文句子')).toBeInTheDocument()
  })

  it('scores a recognition result and honours a low confidence signal', () => {
    const { instances } = installRecognition()
    const onScored = vi.fn()
    render(<DialogueMode scene={scene} onScored={onScored} />)
    fireEvent.click(screen.getByRole('button', { name: '开始跟读' }))
    act(() => {
      instances[0].onresult?.(speechEvent('We arrived at the harbour today.', 0.9))
    })
    expect(onScored).toHaveBeenCalledTimes(1)
    expect(onScored.mock.calls[0][1].stars).toBe(3)
    expect(screen.getByText(/星级 3 \/ 3/)).toBeInTheDocument()
  })

  it('adds a low confidence note from the engine without changing the star rule', () => {
    const { instances } = installRecognition()
    const onScored = vi.fn()
    render(<DialogueMode scene={scene} onScored={onScored} />)
    fireEvent.click(screen.getByRole('button', { name: '开始跟读' }))
    act(() => {
      instances[0].onresult?.(speechEvent('We arrived at the harbour today.', 0.1))
    })
    expect(onScored).toHaveBeenCalledTimes(1)
    expect(onScored.mock.calls[0][1].stars).toBe(3)
    expect(screen.getByText(/置信度偏低/)).toBeInTheDocument()
  })

  it('submits at most once when duplicate recognition callbacks arrive', () => {
    const { instances } = installRecognition()
    const onScored = vi.fn()
    render(<DialogueMode scene={scene} onScored={onScored} />)
    fireEvent.click(screen.getByRole('button', { name: '开始跟读' }))
    act(() => {
      instances[0].onresult?.(speechEvent('We arrived at the harbour today.'))
      instances[0].onresult?.(speechEvent('We arrived at the harbour today.'))
    })
    expect(onScored).toHaveBeenCalledTimes(1)
  })

  it('ignores a late recognition result after unmount', () => {
    const { instances } = installRecognition()
    const onScored = vi.fn()
    const { unmount } = render(<DialogueMode scene={scene} onScored={onScored} />)
    fireEvent.click(screen.getByRole('button', { name: '开始跟读' }))
    const late = instances[0].onresult
    unmount()
    act(() => {
      late?.(speechEvent('We arrived at the harbour today.'))
    })
    expect(onScored).not.toHaveBeenCalled()
    expect(instances[0].aborted).toBe(1)
  })

  it('ignores a late recognition result after the scene changes', () => {
    const { instances } = installRecognition()
    const onScored = vi.fn()
    const { rerender } = render(<DialogueMode scene={scene} onScored={onScored} />)
    fireEvent.click(screen.getByRole('button', { name: '开始跟读' }))
    const late = instances[0].onresult
    rerender(<DialogueMode scene={DIALOGUE_SCENES[1]} onScored={onScored} />)
    act(() => {
      late?.(speechEvent('We arrived at the harbour today.'))
    })
    expect(onScored).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: DIALOGUE_SCENES[1].title })).toBeInTheDocument()
  })

  it('switches to typing on demand even when recognition exists', () => {
    const { instances } = installRecognition()
    render(<DialogueMode scene={scene} />)
    fireEvent.click(screen.getByRole('button', { name: '改用打字输入' }))
    expect(instances).toHaveLength(0)
    expect(screen.getByLabelText('输入你要说的英文句子')).toBeInTheDocument()
  })

  it('shows the scene progress from passed ids and reports completion once', () => {
    const onSceneComplete = vi.fn()
    render(<DialogueMode scene={scene} passedIds={new Set(['t2'])} onSceneComplete={onSceneComplete} />)
    expect(screen.getByLabelText('场景进度 1 星')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('输入你要说的英文句子'), { target: { value: 'We arrived at the harbour today.' } })
    fireEvent.click(screen.getByRole('button', { name: '提交答案' }))
    expect(onSceneComplete).toHaveBeenCalledWith(3)
    expect(onSceneComplete).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('场景进度 3 星')).toBeInTheDocument()
  })
})
