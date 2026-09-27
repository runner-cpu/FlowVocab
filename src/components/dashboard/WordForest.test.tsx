import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { db } from '../../store/db'
import { useProgress } from '../../store/progressStore'
import { useUI } from '../../store/gameStore'
import type { UserWord, Word } from '../../types'
import VocabGame from '../modules/vocab/VocabGame'
import WordForest, { classifyWordTree } from './WordForest'

const selectedWord: Word = { id: 'ecdict-abandon', word: 'abandon', meaning: '放弃', phonetic: '', example: 'Never abandon the mission.', exampleCn: '永远不要放弃任务。', level: 0, pos: 'v.', source: 'ecdict', tags: ['cet4'], legacyIds: ['cet4-000000'] }
const base: UserWord = { id: selectedWord.id, wordId: selectedWord.id, status: 'learning', correct: 1, total: 5, lastReview: 1, nextReview: 10_000, interval: 2, quality: 2, successfulReviews: 1 }

beforeEach(async () => {
  await db.delete()
  await db.open()
  useUI.setState({ page: 'dashboard', reviewWordId: null, guideOpen: false })
  useProgress.setState({ userWords: [base] })
})
afterEach(async () => { cleanup(); await db.delete() })

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
})
