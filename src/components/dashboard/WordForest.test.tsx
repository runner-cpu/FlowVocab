import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { db } from '../../store/db'
import { useProgress } from '../../store/progressStore'
import { useUI } from '../../store/gameStore'
import type { UserWord, Word } from '../../types'
import VocabGame from '../modules/vocab/VocabGame'
import WordForest, { classifyWordTree, reviewLabel } from './WordForest'

const selectedWord: Word = { id: 'ecdict-abandon', word: 'abandon', meaning: '放弃', phonetic: '', example: 'Never abandon the mission.', exampleCn: '永远不要放弃任务。', level: 0, pos: 'v.', source: 'ecdict', tags: ['cet4'], legacyIds: ['cet4-000000'] }
const base: UserWord = { id: selectedWord.id, wordId: selectedWord.id, status: 'learning', correct: 1, total: 5, lastReview: 1, nextReview: 10_000, interval: 2, quality: 2, successfulReviews: 1 }

beforeEach(async () => {
  await db.delete()
  await db.open()
  useUI.setState({ page: 'dashboard', reviewWordId: null, guideOpen: false })
  useProgress.setState({ userWords: [base] })
})
afterEach(async () => { cleanup(); await db.delete() })

describe('word forest guidance', () => {
  it('labels the review horizon for each tree instead of exposing raw timestamps', () => {
    expect(reviewLabel(1_000, 5_000)).toBe('已到期')
    expect(reviewLabel(5_000 + 3_600_000, 5_000)).toBe('今天稍后')
    expect(reviewLabel(5_000 + 86_400_000, 5_000)).toBe('明天')
    expect(reviewLabel(5_000 + 5 * 86_400_000, 5_000)).toBe('5 天后')
    expect(reviewLabel(Number.NaN, 5_000)).toBe('待安排')
  })

  it('summarizes the forest and starts from the earliest due tree', async () => {
    await db.wordBank.put(selectedWord)
    await db.wordBankMeta.put({ id: 1, version: 3, total: 1, updatedAt: Date.now(), loadedLevels: [0] })
    const onReview = vi.fn()
    render(<WordForest words={[base]} onReview={onReview} />)
    expect(await screen.findByText(/待复习 1/)).toBeVisible()
    expect(screen.getByText(/最近一棵：abandon/)).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: '从最早到期开始复习' }))
    expect(onReview).toHaveBeenCalledWith(selectedWord.id)
  })

  it('explains when a healthy tree is not yet due instead of doing nothing', async () => {
    await db.wordBank.put(selectedWord)
    await db.wordBankMeta.put({ id: 1, version: 3, total: 1, updatedAt: Date.now(), loadedLevels: [0] })
    const later = { ...base, correct: 5, total: 5, nextReview: Date.now() + 3 * 86_400_000 }
    render(<WordForest words={[later]} onReview={vi.fn()} />)
    const tree = await screen.findByRole('button', { name: /abandon.*生长中/ })
    fireEvent.click(tree)
    expect(await screen.findByText(/先处理脆弱与到期的树更划算/)).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: '知道了' }))
    expect(screen.queryByText(/先处理脆弱与到期的树更划算/)).toBeNull()
  })
})

describe('word forest health', () => {
  it('classifies fragile, due, learning, and mastered trees', () => {
    expect(classifyWordTree(base, 5_000)).toBe('fragile')
    expect(classifyWordTree({ ...base, correct: 4, total: 5, nextReview: 4_000 }, 5_000)).toBe('due')
    expect(classifyWordTree({ ...base, correct: 4, total: 5 }, 5_000)).toBe('learning')
    expect(classifyWordTree({ ...base, status: 'mastered' }, 5_000)).toBe('mastered')
  })

  it('resolves spelling from IndexedDB and opens that exact word in vocabulary', async () => {
    await db.wordBank.put(selectedWord)
    await db.wordBankMeta.put({ id: 1, version: 3, total: 1, updatedAt: Date.now(), loadedLevels: [0] })

    function Journey() {
      const page = useUI((state) => state.page)
      return page === 'dashboard'
        ? <WordForest words={[base]} onReview={(wordId) => useUI.getState().reviewWord(wordId)} />
        : <VocabGame roundSize={1} random={() => 0} />
    }

    render(<Journey />)
    const tree = await screen.findByRole('button', { name: /abandon.*脆弱.*开始复习/ })
    expect(screen.getByRole('heading', { name: /脆弱.*1/ })).toBeVisible()
    expect(screen.queryByText(selectedWord.id)).toBeNull()

    fireEvent.click(tree)

    expect(useUI.getState()).toMatchObject({ page: 'vocab', reviewWordId: selectedWord.id })
    expect(window.location.hash).toBe('#/module/vocab')
    expect(await screen.findByRole('heading', { name: selectedWord.word })).toBeVisible()
    await waitFor(() => expect(useUI.getState().reviewWordId).toBeNull())
  })

  it('does not expose an opaque ID when the word bank record is unavailable', async () => {
    const unknown = { ...base, id: 'unknown-id', wordId: 'unknown-id' }
    render(<WordForest words={[unknown]} onReview={() => {}} />)
    expect(await screen.findByText('词条暂不可用')).toBeVisible()
    expect(screen.queryByText('unknown-id')).toBeNull()
    expect(screen.getByRole('status')).toHaveTextContent('1 个词条尚未在离线词库中找到')
  })

  it('shows a visual empty state and starts a vocabulary mission', () => {
    const onStart = vi.fn()
    render(<WordForest words={[]} onReview={() => {}} onStart={onStart} />)
    expect(screen.getByRole('img', { name: '发光记忆花园插画' })).toBeVisible()
    const start = screen.getByRole('button', { name: '开始词汇任务' })
    fireEvent.click(start)
    expect(onStart).toHaveBeenCalledTimes(1)
  })
})
