import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it } from 'vitest'
import Home from './Home'
import { useProgress, emptyDaily } from '../store/progressStore'
import { useUI } from '../store/gameStore'
import { dayKey } from '../engine/forget'

beforeEach(() => {
  useUI.setState({ track: 'middle-high' })
  useProgress.setState({ profile: null, planet: null, progress: null, userWords: [], daily: emptyDaily(dayKey(Date.now())) })
})
afterEach(cleanup)

it('does not complete a five-answer journey after only one answer', () => {
  useProgress.setState({ daily: { ...emptyDaily(dayKey(Date.now())), modules: { vocab: 1, grammar: 0, sentence: 0, listening: 0, writing: 0, reading: 0 } } })
  render(<Home />)
  const journey = screen.getByRole('region', { name: '今日旅程' })
  expect(within(journey).getByRole('button', { name: /5/ })).not.toHaveTextContent('已完成')
})

it('does not show yesterday’s XP or completed journey as today’s progress', () => {
  useProgress.setState({ daily: { ...emptyDaily('2020-01-01'), xp: 999, modules: { vocab: 9, grammar: 2, sentence: 3, listening: 1, writing: 0, reading: 0 } } })
  render(<Home />)
  expect(screen.getByText('再获得 100 XP')).toBeVisible()
  expect(within(screen.getByRole('region', { name: '今日旅程' })).queryByText('已完成')).toBeNull()
})

it('offers an available journey on the primary route and includes due mastered words', () => {
  useUI.setState({ track: 'primary' })
  useProgress.setState({ userWords: [{ id: 'due', wordId: 'due', status: 'mastered', nextReview: 1, lastReview: 1, interval: 30, correct: 3, total: 3, quality: 2, successfulReviews: 3 }] })
  render(<Home />)
  expect(within(screen.getByRole('region', { name: '今日旅程' })).queryByRole('button', { name: /句子/ })).toBeNull()
  expect(screen.getByText('1 张记忆卡正在等你')).toBeVisible()
})
