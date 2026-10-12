import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import RoadmapNote from './RoadmapNote'
import { useUI } from '../../store/gameStore'
import { moduleCoverage, plannedItems, tracksOffering } from '../../data/roadmap'
import { GRAMMAR_NODES } from '../../data/grammar'
import { CHAPTERS } from '../../data/reading'
import { TRACK_CURRICULUM } from '../../data/curriculum'

afterEach(() => { cleanup(); useUI.setState({ track: 'middle-high' }) })

describe('roadmap derivation', () => {
  it('lists only the content that exists but is not open on the current route', () => {
    for (const track of ['primary', 'middle-high', 'advanced', 'cet'] as const) {
      const open = new Set(TRACK_CURRICULUM[track].content.grammar ?? [])
      const planned = plannedItems(track, 'grammar')
      expect(planned.map((item) => item.id).sort()).toEqual(
        GRAMMAR_NODES.filter((node) => !open.has(node.id)).map((node) => node.id).sort()
      )
      for (const item of planned) expect(open.has(item.id)).toBe(false)
    }
  })

  it('never plans a reading chapter that is already open', () => {
    for (const track of ['primary', 'middle-high', 'advanced', 'cet'] as const) {
      const open = new Set(TRACK_CURRICULUM[track].content.reading ?? [])
      for (const item of plannedItems(track, 'reading')) expect(open.has(item.id)).toBe(false)
    }
    expect(plannedItems('cet', 'reading')).toEqual([])
    expect(plannedItems('advanced', 'reading').map((item) => item.id)).toEqual(CHAPTERS.filter((chapter) => chapter.id !== 'ch2' && chapter.id !== 'ch3').map((chapter) => chapter.id))
  })

  it('reports coverage against the full content library', () => {
    expect(moduleCoverage('primary', 'grammar')).toEqual({ open: 1, total: GRAMMAR_NODES.length })
    expect(moduleCoverage('advanced', 'reading')).toEqual({ open: 2, total: CHAPTERS.length })
  })

  it('points every planned item at a route where it is actually reachable', () => {
    for (const track of ['primary', 'middle-high', 'advanced', 'cet'] as const) {
      for (const item of plannedItems(track, 'grammar')) {
        const offering = tracksOffering('grammar', item.id)
        expect(offering, `${item.id}`).not.toContain(track)
        for (const candidate of offering) {
          expect(TRACK_CURRICULUM[candidate].content.grammar ?? []).toContain(item.id)
        }
      }
    }
  })

  it('groups grammar items under their branch name', () => {
    const planned = plannedItems('primary', 'grammar')
    expect(planned.find((item) => item.id === 'tense-passive')?.group).toBe('时态语态')
    expect(planned.find((item) => item.id === 'relative-nonrestrictive')?.group).toBe('定语从句')
    expect(planned.find((item) => item.id === 'subjunctive-implied')?.group).toBe('虚拟语气')
  })
})

describe('roadmap surface', () => {
  it('hides the planning block when the route already covers the whole library', () => {
    useUI.setState({ track: 'cet' })
    render(<RoadmapNote module="reading" />)
    expect(screen.queryByRole('heading', { level: 4 })).toBeNull()
  })

  it('states the coverage and expands the planned list on demand', () => {
    useUI.setState({ track: 'primary' })
    render(<RoadmapNote module="grammar" />)
    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent(`本路线已开放 1 / ${GRAMMAR_NODES.length} 个语法知识点`)
    const toggle = screen.getByRole('button', { name: /查看规划/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(document.getElementById('roadmap-grammar-list')).toBeNull()
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const list = document.getElementById('roadmap-grammar-list')!
    expect(within(list).getByText('现在完成时')).toBeInTheDocument()
    expect(within(list).getAllByText(/现在可切到/).length).toBeGreaterThan(0)
  })

  it('tells the learner which route can practise the parked chapter right now', () => {
    useUI.setState({ track: 'primary' })
    render(<RoadmapNote module="reading" />)
    fireEvent.click(screen.getByRole('button', { name: /查看规划/ }))
    const list = document.getElementById('roadmap-reading-list')!
    expect(within(list).getByText('科创展风波')).toBeInTheDocument()
    expect(within(list).getByText(/现在可切到 初高中 \/ 高中 \/ 四六级 路线练习/)).toBeInTheDocument()
  })
})
