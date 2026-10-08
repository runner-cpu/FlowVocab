import 'fake-indexeddb/auto'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Heatmap from '../components/dashboard/Heatmap'
import RadarChart from '../components/dashboard/RadarChart'
import DifficultyFlow from '../components/dashboard/DifficultyFlow'
import { db } from '../store/db'
import { useUI } from '../store/gameStore'
import { useProgress } from '../store/progressStore'
import echarts from './echarts'

vi.mock('./echarts', () => ({ default: { init: vi.fn() } }))
const chart = { setOption: vi.fn(), resize: vi.fn(), dispose: vi.fn(), on: vi.fn(), off: vi.fn() }
let tokens: HTMLStyleElement
let media: MediaQueryList
let motionListeners: Set<() => void>
let observers: Array<{ callback: ResizeObserverCallback; observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }>

beforeEach(async () => {
  vi.clearAllMocks()
  vi.mocked(echarts.init).mockReturnValue(chart as unknown as echarts.ECharts)
  useUI.setState({ theme: 'light' })
  document.documentElement.dataset.theme = 'light'
  tokens = document.createElement('style')
  tokens.textContent = `:root { --ink: #102030; --ink2: #405060; --card: #fefefe; --line: #ddeeff; --accent: #123456; --accent-bg: #edfafa; --accent-light: #aabbcc; --gold: #ae631e; }
    :root[data-theme="dark"] { --ink: #f0f1f2; --ink2: #c0c1c2; --card: #102030; --line: #546576; --accent: #65abcd; --accent-bg: #203040; --accent-light: #ddeeff; --gold: #eebbaa; }`
  document.head.append(tokens)
  motionListeners = new Set()
  media = { matches: false, media: '(prefers-reduced-motion: reduce)', addEventListener: (_: string, listener: () => void) => motionListeners.add(listener), removeEventListener: (_: string, listener: () => void) => motionListeners.delete(listener) } as unknown as MediaQueryList
  vi.stubGlobal('matchMedia', () => media)
  observers = []
  vi.stubGlobal('ResizeObserver', class {
    observe = vi.fn()
    disconnect = vi.fn()
    constructor(public callback: ResizeObserverCallback) { observers.push(this) }
  })
  useProgress.setState({ ready: true, initError: null, daily: null, progress: { id: 1, radar: { vocab: 12, grammar: 24, sentence: 36, listening: 48, writing: 60, reading: 72 }, skillTree: {}, cards: [], narrative: {}, writingLog: [], sentencePassed: 0, listeningPassed: 0, writingDone: 0, writingScoreSum: 0, readingDone: 0 } })
  await db.delete()
  await db.open()
  await db.sessions.put({ id: 1, time: 1, module: 'vocab', comboMax: 0, correct: 0, total: 2, difficultyFlow: [1, 3], energy: 0 })
})
afterEach(async () => {
  cleanup()
  tokens.remove()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  await db.delete()
})

const components = [
  { name: 'Heatmap', Component: Heatmap, label: (option: any) => option.yAxis.axisLabel.color },
  { name: 'RadarChart', Component: RadarChart, label: (option: any) => option.radar.axisName.color },
  { name: 'DifficultyFlow', Component: DifficultyFlow, label: (option: any) => option.yAxis.axisLabel.color },
]

describe.each(components)('$name theme, motion and lifecycle', ({ Component, label }) => {
  it('resolves CSS tokens and updates the existing chart when useUI changes theme', async () => {
    render(<Component />)
    await waitFor(() => expect(chart.setOption).toHaveBeenCalled())
    expect(label(chart.setOption.mock.lastCall![0])).toBe('#405060')
    expect(chart.setOption.mock.lastCall![0].tooltip.backgroundColor).toBe('#fefefe')
    const optionCount = chart.setOption.mock.calls.length
    act(() => useUI.getState().toggleTheme())
    await waitFor(() => expect(chart.setOption.mock.calls.length).toBeGreaterThan(optionCount))
    expect(label(chart.setOption.mock.lastCall![0])).toBe('#c0c1c2')
    expect(chart.setOption.mock.lastCall![0].tooltip.backgroundColor).toBe('#102030')
    expect(echarts.init).toHaveBeenCalledTimes(1)
  })

  it('honors initial and changing reduced motion preferences, removing its listener', async () => {
    Object.defineProperty(media, 'matches', { value: true, writable: true })
    const view = render(<Component />)
    await waitFor(() => expect(chart.setOption).toHaveBeenCalled())
    expect(chart.setOption.mock.lastCall![0].animation).toBe(false)
    act(() => {
      Object.defineProperty(media, 'matches', { value: false })
      motionListeners.forEach((listener) => listener())
    })
    expect(chart.setOption.mock.lastCall![0].animation).toBe(true)
    view.unmount()
    expect(motionListeners.size).toBe(0)
  })

  it('responds to container resize and disconnects before disposing the chart', async () => {
    const view = render(<Component />)
    await waitFor(() => expect(chart.setOption).toHaveBeenCalled())
    expect(observers).toHaveLength(1)
    const observer = observers[0]
    expect(observer.observe).toHaveBeenCalledWith(expect.any(HTMLDivElement))
    act(() => observer.callback([], observer as unknown as ResizeObserver))
    expect(chart.resize).toHaveBeenCalledTimes(1)
    view.unmount()
    expect(observer.disconnect).toHaveBeenCalledOnce()
    expect(chart.dispose).toHaveBeenCalledOnce()
    act(() => observer.callback([], observer as unknown as ResizeObserver))
    expect(chart.resize).toHaveBeenCalledTimes(1)
  })

  it('keeps the data alternative usable after chart rendering fails and offers a redraw retry', async () => {
    chart.setOption.mockImplementationOnce(() => { throw new Error('renderer unavailable') })
    render(<Component />)
    expect(await screen.findByRole('alert')).toHaveTextContent(/图表.*失败/)
    fireEvent.click(screen.getByText(/查看.*数据/, { selector: 'summary' }))
    expect(screen.getByRole('table')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: /重试/ }))
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    expect(chart.dispose).toHaveBeenCalledOnce()
    expect(echarts.init).toHaveBeenCalledTimes(2)
  })

  it('makes the container visible before retrying a failed renderer initialization', async () => {
    vi.mocked(echarts.init).mockImplementationOnce(() => { throw new Error('initialization failed') })
    render(<Component />)
    expect(await screen.findByRole('alert')).toHaveTextContent(/图表.*失败/)
    let visibleAtInit = false
    vi.mocked(echarts.init).mockImplementationOnce((element) => {
      visibleAtInit = !(element as HTMLDivElement).hidden
      return chart as unknown as echarts.ECharts
    })
    fireEvent.click(screen.getByRole('button', { name: /重试/ }))
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    expect(visibleAtInit).toBe(true)
    expect(chart.setOption).toHaveBeenCalled()
  })

  it('falls back to window resize when ResizeObserver is unavailable and cleans up', async () => {
    vi.stubGlobal('ResizeObserver', undefined)
    const view = render(<Component />)
    await waitFor(() => expect(chart.setOption).toHaveBeenCalled())
    act(() => window.dispatchEvent(new Event('resize')))
    expect(chart.resize).toHaveBeenCalledTimes(1)
    view.unmount()
    act(() => window.dispatchEvent(new Event('resize')))
    expect(chart.resize).toHaveBeenCalledTimes(1)
    expect(chart.dispose).toHaveBeenCalledOnce()
  })
})
