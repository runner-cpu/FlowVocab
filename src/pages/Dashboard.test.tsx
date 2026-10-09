import 'fake-indexeddb/auto'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useProgress } from '../store/progressStore'
import Dashboard from './Dashboard'
import { db } from '../store/db'
import { useUI } from '../store/gameStore'

vi.mock('../components/dashboard/RadarChart', () => ({ default: () => <div data-testid="radar" /> }))
vi.mock('../components/dashboard/PlanetView', () => ({ default: () => <div /> }))
vi.mock('../components/dashboard/Heatmap', () => ({ default: () => <div /> }))

test('shows the first-study state without a catch-up CTA when every radar axis is zero', () => {
  useProgress.setState({ progress: { id: 1, radar: { vocab: 0, grammar: 0, sentence: 0, listening: 0, writing: 0, reading: 0 }, skillTree: {}, cards: [], narrative: {}, writingLog: [], sentencePassed: 0, listeningPassed: 0, writingDone: 0, writingScoreSum: 0, readingDone: 0 } })
  render(<Dashboard />)
  expect(screen.getByText('完成第一轮练习后，这里会显示你的能力变化')).toBeVisible()
  expect(screen.queryByRole('button', { name: /去补强/ })).toBeNull()
  expect(screen.getByRole('heading', { name: '成长图谱' })).toBeVisible()
  expect(screen.getByText('累计 XP')).toBeVisible()
  expect(screen.getByRole('button', { name: '开始第一轮练习' })).toBeVisible()
})

beforeEach(async () => {
  await db.delete(); await db.open()
  useUI.setState({ page: 'dashboard', reviewWordId: null, reviewWordLevel: null, guideOpen: false })
})
afterEach(async () => { cleanup(); await db.delete() })

test('turns the due review tile into a start button and leaves empty days inert', () => {
  useProgress.setState({
    progress: { id: 1, radar: { vocab: 1, grammar: 0, sentence: 0, listening: 0, writing: 0, reading: 0 }, skillTree: {}, cards: [], narrative: {}, writingLog: [], sentencePassed: 0, listeningPassed: 0, writingDone: 0, writingScoreSum: 0, readingDone: 0 },
    userWords: [
      { id: 'due', wordId: 'due', status: 'learning', correct: 0, total: 1, lastReview: 0, nextReview: 1, interval: 1, quality: 0, successfulReviews: 0 },
      { id: 'later', wordId: 'later', status: 'learning', correct: 1, total: 1, lastReview: 0, nextReview: Date.now() + 5 * 86400000, interval: 3, quality: 2, successfulReviews: 1 }
    ]
  })
  render(<Dashboard />)
  const dueTile = screen.getByRole('button', { name: /今日到期 1 个词，开始复习/ })
  fireEvent.click(dueTile)
  expect(useUI.getState().page).toBe('vocab')

  cleanup()
  useUI.setState({ page: 'dashboard' })
  useProgress.setState({ userWords: [{ id: 'later', wordId: 'later', status: 'learning', correct: 1, total: 1, lastReview: 0, nextReview: Date.now() + 5 * 86400000, interval: 3, quality: 2, successfulReviews: 1 }] })
  render(<Dashboard />)
  // 没有到期词时按钮存在但不可点，并给出「暂无到期」的说明。
  const idle = screen.getByRole('button', { name: /今日到期 0 个词/ })
  expect(idle).toBeDisabled()
  expect(screen.getByText('暂无到期')).toBeVisible()
})

test('passes the persisted forest word level into the vocabulary review request', async () => {
  const word = { id: 'ecdict-forest', word: 'abandon', meaning: 'give up', phonetic: '', example: '', exampleCn: '', level: 4 as const, pos: 'verb', source: 'ecdict' as const, tags: [] }
  await db.wordBank.put(word)
  useProgress.setState({
    progress: { id: 1, radar: { vocab: 1, grammar: 0, sentence: 0, listening: 0, writing: 0, reading: 0 }, skillTree: {}, cards: [], narrative: {}, writingLog: [], sentencePassed: 0, listeningPassed: 0, writingDone: 0, writingScoreSum: 0, readingDone: 0 },
    userWords: [{ id: word.id, wordId: word.id, status: 'learning', correct: 0, total: 1, lastReview: 1, nextReview: 1, interval: 1, quality: 1, successfulReviews: 0 }],
  })

  render(<Dashboard />)
  fireEvent.click(await screen.findByRole('button', { name: /abandon/ }))

  await waitFor(() => expect(useUI.getState()).toMatchObject({ page: 'vocab', reviewWordId: word.id, reviewWordLevel: 4 }))
})
