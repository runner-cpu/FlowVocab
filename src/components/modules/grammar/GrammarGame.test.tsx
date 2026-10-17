import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { db } from '../../../store/db'
import { useProgress } from '../../../store/progressStore'
import { useUI } from '../../../store/gameStore'
import GrammarGame from './GrammarGame'

beforeEach(async () => {
  await db.delete(); await db.open()
  await useProgress.getState().init()
  useUI.setState({ track: 'middle-high' })
})
afterEach(async () => { cleanup(); await db.delete() })

describe('grammar keyboard answering', () => {
  it('answers the active node with number keys instead of requiring the mouse', async () => {
    render(<GrammarGame />)
    // 首个分支的首个节点是解锁状态，进入后直接答题。
    fireEvent.click(await screen.findByRole('button', { name: '一般时态' }))

    const options = await screen.findAllByRole('button', { name: /^(go|goes|went|going)$/ })
    expect(options).toHaveLength(4)

    // 第 2 个选项是正确答案，按 2 应当直接判对。
    fireEvent.keyDown(window, { key: '2' })
    await waitFor(() => expect(screen.getByText(/一般现在时，主语第三人称单数/)).toBeInTheDocument())
  })

  it('ignores number keys while a text field owns the focus', async () => {
    render(<GrammarGame />)
    fireEvent.click(await screen.findByRole('button', { name: '一般时态' }))
    await screen.findAllByRole('button', { name: /^(go|goes|went|going)$/ })

    const input = document.createElement('input')
    document.body.append(input)
    input.focus()
    fireEvent.keyDown(input, { key: '2' })
    // 没有作答就不该出现讲解文案。
    expect(screen.queryByText(/一般现在时，主语第三人称单数/)).toBeNull()
    input.remove()
  })
})
