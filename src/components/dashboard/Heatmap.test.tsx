import 'fake-indexeddb/auto'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import echarts from '../../charts/echarts'
import { db } from '../../store/db'
import { useProgress } from '../../store/progressStore'
import type { DailyStat } from '../../types'
import Heatmap, { buildHeatmapData } from './Heatmap'

vi.mock('../../charts/echarts', () => ({ default: { init: vi.fn() } }))
const chart = { setOption: vi.fn(), resize: vi.fn(), dispose: vi.fn(), on: vi.fn(), off: vi.fn() }
const stat = (date: string, xp: number): DailyStat => ({ date, xp, energy: 0, comboMax: 0, modules: { vocab: 0, grammar: 0, sentence: 0, listening: 0, writing: 0, reading: 0 } })

beforeEach(async () => {
  vi.clearAllMocks()
  vi.mocked(echarts.init).mockReturnValue(chart as unknown as echarts.ECharts)
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 2, 12))
  useProgress.setState({ daily: null, planet: null })
  await db.delete()
  await db.open()
})
afterEach(async () => {
  cleanup()
  vi.restoreAllMocks()
  vi.useRealTimers()
  vi.unstubAllEnvs()
  await db.delete()
})

describe('heatmap range construction', () => {
  it('returns exactly the requested number of local calendar days ending today', () => {
    const today = new Date(2026, 9, 2, 23, 45)
    const values = buildHeatmapData([
      { date: '2026-09-30', xp: 7 } as never,
      { date: '2026-10-01', xp: 11 } as never,
      { date: '2026-10-02', xp: 13 } as never
    ], 3, 100, today)

    expect(values.values).toEqual([7, 11, 13])
    expect(values.values).toHaveLength(3)
  })

  it('does not include the previous day when the request is one day', () => {
    const today = new Date(2026, 9, 2, 0, 5)
    const values = buildHeatmapData([
      { date: '2026-10-01', xp: 99 } as never,
      { date: '2026-10-02', xp: 3 } as never
    ], 1, 100, today)

    expect(values.values).toEqual([3])
  })
})

describe('Heatmap rendering', () => {
  it('plots only the selected dates with raw XP and exposes the same data without a pointer', async () => {
    await db.dailyStats.bulkPut([stat('2026-09-28', 9999), stat('2026-09-30', 7), stat('2026-10-01', 0), stat('2026-10-02', 431)])
    render(<Heatmap days={3} />)
    await waitFor(() => expect(chart.setOption).toHaveBeenCalled())
    const option = chart.setOption.mock.lastCall![0]
    expect(option.series[0].data).toHaveLength(3)
    expect(option.series[0].data.map((item: { value: number[] }) => item.value)).toEqual([[0, 2, 7], [0, 3, 0], [0, 4, 431]])
    expect(option.tooltip.formatter({ data: option.series[0].data[2] })).toContain('2026-10-02')
    expect(option.tooltip.formatter({ data: option.series[0].data[2] })).toContain('431 XP')
    expect(option.tooltip.formatter({ data: option.series[0].data[1] })).toContain('0 XP')
    fireEvent.click(screen.getByText(/查看.*数据/))
    const table = screen.getByRole('table', { name: /学习热力图/ })
    expect(within(table).getAllByRole('row')).toHaveLength(4)
    expect(within(table).getByRole('row', { name: /2026-10-02.*431/ })).toBeVisible()
    expect(within(table).queryByText('2026-09-28')).not.toBeInTheDocument()
  })

  it('reports a database error and retries without disguising it as zero activity', async () => {
    let fail!: (error: Error) => void
    vi.spyOn(db.dailyStats, 'toArray').mockReturnValueOnce(new Promise((_, reject) => { fail = reject }) as ReturnType<typeof db.dailyStats.toArray>)
    render(<Heatmap days={1} />)
    const loading = screen.queryByRole('status')
    await act(async () => { fail(new Error('unavailable')) })
    expect(loading).toHaveTextContent(/加载/)
    expect(screen.getByRole('alert')).toHaveTextContent(/失败/)
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    await db.dailyStats.put(stat('2026-10-02', 19))
    fireEvent.click(screen.getByRole('button', { name: /重试/ }))
    fireEvent.click(await screen.findByText(/查看.*数据/))
    expect(screen.getByRole('row', { name: /2026-10-02.*19/ })).toBeVisible()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('ignores an obsolete range request that completes after the new one', async () => {
    let finish!: (stats: DailyStat[]) => void
    vi.spyOn(db.dailyStats, 'toArray').mockReturnValueOnce(new Promise((resolve) => { finish = resolve }) as ReturnType<typeof db.dailyStats.toArray>)
    await db.dailyStats.put(stat('2026-10-02', 13))
    const view = render(<Heatmap days={30} />)
    view.rerender(<Heatmap days={1} />)
    fireEvent.click(await screen.findByText(/查看.*数据/))
    await act(async () => { finish([stat('2026-10-02', 999)]) })
    expect(screen.getAllByRole('row')).toHaveLength(2)
    expect(screen.getByRole('row', { name: /2026-10-02.*13/ })).toBeVisible()
    expect(screen.queryByText('999')).not.toBeInTheDocument()
  })

  it('follows the caller-supplied local day so a mounted dashboard crosses midnight', async () => {
    await db.dailyStats.bulkPut([stat('2026-10-01', 11), stat('2026-10-02', 22)])
    const view = render(<Heatmap days={2} today="2026-10-01" />)
    await waitFor(() => expect(chart.setOption).toHaveBeenCalled())
    expect(chart.setOption.mock.lastCall![0].series[0].data).toHaveLength(2)
    view.rerender(<Heatmap days={2} today="2026-10-02" />)
    await waitFor(() => expect(chart.setOption.mock.lastCall![0].series[0].data).toHaveLength(2))
    const option = chart.setOption.mock.lastCall![0]
    expect(option.series[0].data.map((item: { value: number[] }) => item.value)).toEqual([[0, 3, 11], [0, 4, 22]])
  })

  it('uses calendar positions over spring DST instead of losing or shifting XP', async () => {
    vi.stubEnv('TZ', 'America/New_York')
    expect(new Date(2026, 2, 8).getTimezoneOffset()).toBe(300)
    expect(new Date(2026, 2, 9).getTimezoneOffset()).toBe(240)
    vi.setSystemTime(new Date(2026, 2, 9, 12))
    await db.dailyStats.bulkPut([stat('2026-03-07', 11), stat('2026-03-08', 22), stat('2026-03-09', 33)])
    render(<Heatmap days={3} />)
    await waitFor(() => expect(chart.setOption).toHaveBeenCalled())
    const data = chart.setOption.mock.lastCall![0].series[0].data
    expect(data.map((item: { value: number[] }) => item.value)).toEqual([[0, 5, 11], [0, 6, 22], [1, 0, 33]])
    fireEvent.click(screen.getByText(/查看.*数据/))
    expect(screen.getByRole('row', { name: /2026-03-07.*11/ })).toBeVisible()
    expect(screen.getByRole('row', { name: /2026-03-08.*22/ })).toBeVisible()
    expect(screen.getByRole('row', { name: /2026-03-09.*33/ })).toBeVisible()
  })
})
