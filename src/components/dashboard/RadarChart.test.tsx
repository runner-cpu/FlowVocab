import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import echarts from '../../charts/echarts'
import { useProgress } from '../../store/progressStore'
import type { Progress } from '../../types'
import RadarChart, { moduleForRadarLabel, RADAR_LABELS } from './RadarChart'

vi.mock('../../charts/echarts', () => ({ default: { init: vi.fn() } }))
const chart = { setOption: vi.fn(), resize: vi.fn(), dispose: vi.fn(), on: vi.fn(), off: vi.fn() }
const progress: Progress = { id: 1, radar: { vocab: 12, grammar: 24, sentence: 36, listening: 48, writing: 60, reading: 72 }, skillTree: {}, cards: [], narrative: {}, writingLog: [], sentencePassed: 0, listeningPassed: 0, writingDone: 0, writingScoreSum: 0, readingDone: 0 }
const retryInit = useProgress.getState().retryInit
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(echarts.init).mockReturnValue(chart as unknown as echarts.ECharts)
  useProgress.setState({ ready: true, progress, initError: null, retryInit })
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); useProgress.setState({ retryInit }) })

describe('radar dimension navigation', () => {
  it('maps every displayed dimension to its learning module', () => {
    expect(RADAR_LABELS.map(moduleForRadarLabel)).toEqual(['vocab', 'grammar', 'sentence', 'listening', 'writing', 'reading'])
  })

  it('ignores chart labels that are not dimensions', () => {
    expect(moduleForRadarLabel('unknown')).toBeNull()
  })
})

describe('radar pointer feedback', () => {
  it('binds hover and leave handlers, updates the readout, and unbinds on unmount', () => {
    const view = render(<RadarChart onModuleSelect={vi.fn()} />)
    const hover = chart.on.mock.calls.find(([event]) => event === 'mouseover')?.[1] as ((params: unknown) => void) | undefined
    const leave = chart.on.mock.calls.find(([event]) => event === 'mouseout')?.[1] as (() => void) | undefined
    expect(hover).toBeTypeOf('function')
    expect(leave).toBeTypeOf('function')
    expect(screen.getByRole('status')).toHaveTextContent('点击雷达上的维度名')
    act(() => hover?.({ name: '写作' }))
    expect(screen.getByRole('status')).toHaveTextContent('写作 60%')
    act(() => leave?.())
    expect(screen.getByRole('status')).toHaveTextContent('点击雷达上的维度名')
    view.unmount()
    expect(chart.off).toHaveBeenCalledWith('mouseover', hover)
    expect(chart.off).toHaveBeenCalledWith('mouseout', leave)
  })
})

describe('RadarChart accessible states', () => {
  it('offers all six real mastery values, the target, and native module buttons', () => {
    const select = vi.fn()
    render(<RadarChart onModuleSelect={select} />)
    fireEvent.click(screen.getByText(/查看.*数据/))
    const table = screen.getByRole('table', { name: /掌握度/ })
    expect(within(table).getAllByRole('row')).toHaveLength(7)
    expect(within(table).getByRole('row', { name: /词汇.*12%.*70%/ })).toBeVisible()
    expect(within(table).getByRole('row', { name: /阅读.*72%.*70%/ })).toBeVisible()
    const reading = within(table).getByRole('button', { name: /阅读/ })
    expect(reading).not.toHaveAttribute('tabindex', '-1')
    fireEvent.click(reading)
    expect(select).toHaveBeenCalledWith('reading')
    const click = chart.on.mock.calls.find(([event]) => event === 'click')![1]
    click({ name: '听力' })
    click({ name: '六维掌握度' })
    expect(select.mock.calls).toEqual([['reading'], ['listening']])
  })

  it('distinguishes loading from empty progress and does not invent zero mastery', () => {
    useProgress.setState({ ready: false, progress: null })
    render(<RadarChart />)
    expect(screen.getByRole('status')).toHaveTextContent(/加载/)
    expect(chart.setOption).not.toHaveBeenCalled()
    act(() => useProgress.setState({ ready: true }))
    expect(screen.getByRole('status')).toHaveTextContent(/暂无|还没有/)
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('reports initialization failure and lets the store retry restore actual data', async () => {
    useProgress.setState({ ready: false, progress: null, initError: '无法读取本地学习数据', retryInit: async () => { useProgress.setState({ ready: true, progress, initError: null }) } })
    render(<RadarChart />)
    expect(screen.getByRole('alert')).toHaveTextContent(/无法读取|失败/)
    fireEvent.click(screen.getByRole('button', { name: /重试/ }))
    fireEvent.click(await screen.findByText(/查看.*数据/))
    expect(screen.getByRole('row', { name: /写作.*60%/ })).toBeVisible()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
