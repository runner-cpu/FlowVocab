import 'fake-indexeddb/auto'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import echarts from '../../charts/echarts'
import { db } from '../../store/db'
import type { Session } from '../../types'
import DifficultyFlow from './DifficultyFlow'

vi.mock('../../charts/echarts', () => ({ default: { init: vi.fn() } }))
const chart = { setOption: vi.fn(), resize: vi.fn(), dispose: vi.fn(), on: vi.fn(), off: vi.fn() }
const session = (id: number, difficultyFlow: number[]): Session => ({ id, time: id * 1000, module: 'vocab', comboMax: 0, correct: 0, total: difficultyFlow.length, difficultyFlow, energy: 0 })

beforeEach(async () => {
  vi.clearAllMocks()
  vi.mocked(echarts.init).mockReturnValue(chart as unknown as echarts.ECharts)
  await db.delete()
  await db.open()
})
afterEach(async () => { cleanup(); vi.restoreAllMocks(); await db.delete() })

describe('DifficultyFlow accessible data', () => {
  it('exposes the most recent 60 answers chronologically as named difficulty rows', async () => {
    await db.sessions.bulkPut([session(1, [4]), session(2, Array.from({ length: 58 }, () => 1)), session(3, [2, 4])])
    render(<DifficultyFlow />)
    fireEvent.click(await screen.findByText(/查看.*数据/))
    const table = screen.getByRole('table', { name: /难度/ })
    const rows = within(table).getAllByRole('row')
    expect(rows).toHaveLength(61)
    expect(rows[1]).toHaveTextContent('四级高频')
    expect(rows[59]).toHaveTextContent('六级')
    expect(rows[60]).toHaveTextContent('考研超纲')
    await waitFor(() => expect(chart.setOption).toHaveBeenCalled())
    expect(chart.setOption.mock.lastCall![0].series[0].data).toEqual([...Array.from({ length: 58 }, () => 1), 2, 4])
  })

  it('explains the hovered point, then falls back to the guidance line', async () => {
    await db.sessions.put(session(1, [2, 4]))
    render(<DifficultyFlow />)
    await waitFor(() => expect(chart.setOption).toHaveBeenCalled())
    const hover = chart.on.mock.calls.find(([event]: unknown[]) => event === 'mouseover')?.[1] as ((params: unknown) => void) | undefined
    expect(hover).toBeTypeOf('function')
    expect(screen.getByRole('status')).toHaveTextContent('把指针移到曲线上')
    act(() => hover?.({ dataIndex: 1, value: 4 }))
    expect(screen.getByRole('status')).toHaveTextContent('第 2 题 · 考研超纲')
    const leave = chart.on.mock.calls.find(([event]: unknown[]) => event === 'mouseout')?.[1] as (() => void) | undefined
    act(() => leave?.())
    expect(screen.getByRole('status')).toHaveTextContent('把指针移到曲线上')
  })

  it('renders a React-owned accessible empty state without HTML injection', async () => {
    // Mount first: Testing Library itself clears containers via innerHTML.
    let resolve!: (sessions: Session[]) => void
    const query = db.sessions.orderBy('time').reverse().limit(10)
    vi.spyOn(query, 'toArray').mockReturnValueOnce(new Promise((done) => { resolve = done }) as ReturnType<typeof query.toArray>)
    vi.spyOn(db.sessions, 'orderBy').mockReturnValueOnce(query)
    render(<DifficultyFlow />)
    const htmlSetter = vi.spyOn(Element.prototype, 'innerHTML', 'set')
    await act(async () => { resolve([]) })
    expect(htmlSetter).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent(/还没有难度数据/)
    expect(chart.setOption).not.toHaveBeenCalled()
    htmlSetter.mockRestore()
  })

  it('announces loading and a failed read, then retries the actual sessions query', async () => {
    let reject!: (error: Error) => void
    const query = db.sessions.orderBy('time').reverse().limit(10)
    vi.spyOn(query, 'toArray').mockReturnValueOnce(new Promise((_, fail) => { reject = fail }) as ReturnType<typeof query.toArray>)
    vi.spyOn(db.sessions, 'orderBy').mockReturnValueOnce(query)
    render(<DifficultyFlow />)
    const loading = screen.queryByRole('status')
    await act(async () => { reject(new Error('disk unavailable')) })
    expect(loading).toHaveTextContent(/加载/)
    expect(screen.getByRole('alert')).toHaveTextContent(/失败/)
    await db.sessions.put(session(1, [3]))
    fireEvent.click(screen.getByRole('button', { name: /重试/ }))
    fireEvent.click(await screen.findByText(/查看.*数据/))
    expect(screen.getByRole('row', { name: /1.*六级高频/ })).toBeVisible()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('does not mount a chart when its pending read finishes after unmount', async () => {
    let resolve!: (sessions: Session[]) => void
    const query = db.sessions.orderBy('time').reverse().limit(10)
    vi.spyOn(query, 'toArray').mockReturnValueOnce(new Promise((done) => { resolve = done }) as ReturnType<typeof query.toArray>)
    vi.spyOn(db.sessions, 'orderBy').mockReturnValueOnce(query)
    const view = render(<DifficultyFlow />)
    view.unmount()
    await act(async () => { resolve([session(1, [4])]) })
    expect(echarts.init).not.toHaveBeenCalled()
  })
})
