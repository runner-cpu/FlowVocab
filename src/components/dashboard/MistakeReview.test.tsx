import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { db } from '../../store/db'
import { useProgress } from '../../store/progressStore'
import { useUI } from '../../store/gameStore'
import MistakeReview from './MistakeReview'
import type { MistakeRecord } from '../../types'

const record = (overrides: Partial<MistakeRecord> = {}): MistakeRecord => ({
  id: 'grammar:tense-basic#0',
  module: 'grammar',
  contentId: 'tense-basic#0',
  prompt: 'She ___ to work by bus every day.',
  chosen: 'go',
  correctAnswer: 'goes',
  tag: 'agreement',
  explain: '第三人称单数加 -s。',
  count: 1,
  firstAt: 1000,
  lastAt: Date.now(),
  ...overrides
})

beforeEach(async () => {
  await db.delete(); await db.open()
  await useProgress.getState().init()
  useUI.setState({ page: 'dashboard', reviewWordId: null, reviewWordLevel: null, reviewTarget: null })
})
afterEach(async () => { cleanup(); await db.delete() })

describe('MistakeReview', () => {
  it('invites a first round when the notebook is empty', () => {
    render(<MistakeReview />)
    expect(screen.getByText(/还没有错题/)).toBeInTheDocument()
    expect(screen.queryByRole('list')).toBeNull()
  })

  it('lists recorded mistakes with module, tag and repeat count', async () => {
    act(() => useProgress.setState({ progress: { ...useProgress.getState().progress!, mistakes: [record({ count: 3 })] } }))
    render(<MistakeReview />)
    const list = await screen.findByRole('list')
    expect(list).toHaveTextContent('She ___ to work by bus every day.')
    expect(list).toHaveTextContent('语法')
    expect(list).toHaveTextContent('主谓一致')
    expect(list).toHaveTextContent('错 3 次')
  })

  it('sends the learner back to the module when a row is activated', async () => {
    act(() => useProgress.setState({ progress: { ...useProgress.getState().progress!, mistakes: [record()] } }))
    render(<MistakeReview />)
    fireEvent.click(await screen.findByRole('button', { name: /回到语法重练/ }))
    expect(useUI.getState()).toMatchObject({ page: 'grammar', reviewTarget: { module: 'grammar', contentId: 'tense-basic#0' } })
  })

  it('focuses the exact word when a vocabulary mistake is reopened', async () => {
    act(() => useProgress.setState({
      progress: {
        ...useProgress.getState().progress!,
        mistakes: [record({ id: 'vocab:w-123', module: 'vocab', contentId: 'w-123', prompt: 'adapt', tag: 'spelling' })]
      }
    }))
    render(<MistakeReview />)
    fireEvent.click(await screen.findByRole('button', { name: /回到词汇重练/ }))
    expect(useUI.getState()).toMatchObject({ page: 'vocab', reviewWordId: 'w-123', reviewWordLevel: null })
  })

  it('removes a row after the learner clears it', async () => {
    act(() => useProgress.setState({ progress: { ...useProgress.getState().progress!, mistakes: [record()] } }))
    render(<MistakeReview />)
    fireEvent.click(await screen.findByRole('button', { name: /移出错题本/ }))
    await waitFor(() => expect(useProgress.getState().progress?.mistakes).toHaveLength(0))
    await waitFor(() => expect(screen.getByText(/还没有错题/)).toBeInTheDocument())
  })

  it('collapses long notebooks behind an explicit expand control', async () => {
    const many = Array.from({ length: 8 }, (_, index) => record({ id: `grammar:q${index}`, contentId: `q${index}`, prompt: `题目 ${index}`, lastAt: Date.now() - index }))
    act(() => useProgress.setState({ progress: { ...useProgress.getState().progress!, mistakes: many } }))
    render(<MistakeReview />)
    expect(await screen.findByText('查看全部 8 条')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(5)
    fireEvent.click(screen.getByText('查看全部 8 条'))
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(8))
  })
})
