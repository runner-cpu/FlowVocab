import { expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useProgress } from '../store/progressStore'
import Dashboard from './Dashboard'

vi.mock('../components/dashboard/RadarChart', () => ({ default: () => <div data-testid="radar" /> }))

test('shows the first-study state without a catch-up CTA when every radar axis is zero', () => {
  useProgress.setState({ progress: { id: 1, radar: { vocab: 0, grammar: 0, sentence: 0, listening: 0, writing: 0, reading: 0 }, skillTree: {}, cards: [], narrative: {}, writingLog: [], sentencePassed: 0, listeningPassed: 0, writingDone: 0, writingScoreSum: 0, readingDone: 0 } })
  render(<Dashboard />)
  expect(screen.getByText('完成第一轮练习后，这里会显示你的能力变化')).toBeVisible()
  expect(screen.queryByRole('button', { name: /去补强/ })).toBeNull()
})
