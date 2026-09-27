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
})

beforeEach(async () => {
  await db.delete(); await db.open()
  useUI.setState({ page: 'dashboard', reviewWordId: null, reviewWordLevel: null, guideOpen: false })
})
afterEach(async () => { cleanup(); await db.delete() })

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
