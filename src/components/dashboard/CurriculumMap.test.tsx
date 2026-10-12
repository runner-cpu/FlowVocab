import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import CurriculumMap from './CurriculumMap'
import { useUI } from '../../store/gameStore'
import { openCount, trackScopes, trackSummary } from '../../data/curriculumOverview'
import { GRAMMAR_NODES } from '../../data/grammar'
import { CHAPTERS } from '../../data/reading'

afterEach(() => { cleanup(); useUI.setState({ track: 'middle-high' }) })

describe('curriculum overview derivation', () => {
  it('counts open content from the real curriculum, not hard-coded numbers', () => {
    expect(openCount('primary', 'sentence')).toBe(0)
    expect(openCount('primary', 'grammar')).toBeLessThan(GRAMMAR_NODES.length)
    expect(openCount('cet', 'reading')).toBe(CHAPTERS.length)
    expect(openCount('cet', 'listening')).toBe(8)
  })

  it('reports module and item totals that stay within the content library size', () => {
    for (const track of ['primary', 'middle-high', 'advanced', 'cet'] as const) {
      const scopes = trackScopes(track)
      expect(scopes).toHaveLength(6)
      for (const scope of scopes) {
        expect(scope.open, `${track}:${scope.module}`).toBeLessThanOrEqual(scope.total)
        expect(scope.open, `${track}:${scope.module}`).toBeGreaterThanOrEqual(0)
      }
      const summary = trackSummary(track)
      expect(summary.modules).toBe(scopes.filter((scope) => scope.available).length)
      expect(summary.items).toBe(scopes.reduce((sum, scope) => sum + scope.open, 0))
    }
  })

  it('keeps every closed primary module closed and every CET module open', () => {
    expect(trackScopes('primary').filter((scope) => scope.available).map((scope) => scope.module)).toEqual(['vocab', 'grammar', 'listening', 'reading'])
    expect(trackScopes('cet').every((scope) => scope.available)).toBe(true)
  })
})

describe('curriculum map surface', () => {
  it('renders the active route matrix with per-cell open counts', () => {
    useUI.setState({ track: 'primary' })
    render(<CurriculumMap />)
    const table = screen.getByRole('table')
    expect(within(table).getByText(/小学启蒙：开放 4 个模块/)).toBeInTheDocument()
    // 每个「路线 × 模块」的开放单元都是一个按钮，数量必须与派生数据一致。
    const expected = (['primary', 'middle-high', 'advanced', 'cet'] as const)
      .reduce((sum, item) => sum + trackScopes(item).filter((scope) => scope.available).length, 0)
    expect(within(table).getAllByRole('button')).toHaveLength(expected)
    expect(within(table).getByRole('button', { name: /切换到四六级备考路线并进入语法·语法花园/ })).toBeInTheDocument()
  })

  it('switches the route and opens the module when a cell is activated', () => {
    useUI.setState({ track: 'primary' })
    render(<CurriculumMap />)
    fireEvent.click(screen.getByRole('button', { name: /切换到四六级备考路线并进入语法·语法花园/ }))
    expect(useUI.getState().track).toBe('cet')
    expect(useUI.getState().page).toBe('grammar')
  })

  it('keeps unavailable modules out of the matrix as labelled dashes', () => {
    useUI.setState({ track: 'primary' })
    render(<CurriculumMap />)
    expect(screen.getByLabelText(/小学启蒙 未开放 句子·桥梁工坊/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /切换到小学启蒙路线并进入句子·桥梁工坊/ })).toBeNull()
  })

  it('lists the current route focus for all six modules with counts', () => {
    useUI.setState({ track: 'cet' })
    render(<CurriculumMap />)
    const focus = screen.getByRole('heading', { name: /四六级备考 · 各模块训练侧重/ }).parentElement!
    expect(within(focus).getByText('考纲语法辨析')).toBeInTheDocument()
    expect(within(focus).getByText('题型模拟速读与定位')).toBeInTheDocument()
    expect(within(focus).queryByText('本路线未开放')).toBeNull()
  })

  it('marks the closed modules of the primary route in the focus list', () => {
    useUI.setState({ track: 'primary' })
    render(<CurriculumMap />)
    const focus = screen.getByRole('heading', { name: /小学启蒙 · 各模块训练侧重/ }).parentElement!
    expect(within(focus).getAllByText('本路线未开放')).toHaveLength(2)
  })
})
