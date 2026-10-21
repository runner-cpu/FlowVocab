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
  it('shows the quiz sentence itself and keeps the examples collapsed', async () => {
    render(<GrammarGame />)
    fireEvent.click(await screen.findByRole('button', { name: '一般时态' }))

    // 题干必须出现在页面上：旧版只渲染选项，学习者只能看到上面两句例句。
    expect(screen.getByText('Lily ___ her teeth twice a day.')).toBeInTheDocument()
    // 例句默认折叠，避免边答题边逐字对照。
    const examples = screen.getByText(/看例句/).closest('details')
    expect(examples).not.toBeNull()
    expect(examples).not.toHaveAttribute('open')
  })

  it('answers the active node with number keys instead of requiring the mouse', async () => {
    render(<GrammarGame />)
    // 首个分支的首个节点是解锁状态，进入后直接答题。
    fireEvent.click(await screen.findByRole('button', { name: '一般时态' }))

    const options = await screen.findAllByRole('button', { name: /^(brush|brushes|brushed|brushing)$/ })
    expect(options).toHaveLength(4)

    // 选项按题目种子打乱过，找正确项当前的实际位置，再按对应数字键。
    const answerPosition = options.findIndex((option) => option.textContent?.includes('brushes')) + 1
    fireEvent.keyDown(window, { key: String(answerPosition) })
    await waitFor(() => expect(screen.getByText(/一般现在时/)).toBeInTheDocument())
  })

  it('ignores number keys while a text field owns the focus', async () => {
    render(<GrammarGame />)
    fireEvent.click(await screen.findByRole('button', { name: '一般时态' }))
    await screen.findAllByRole('button', { name: /^(brush|brushes|brushed|brushing)$/ })

    const input = document.createElement('input')
    document.body.append(input)
    input.focus()
    fireEvent.keyDown(input, { key: '2' })
    // 没有作答就不该出现讲解文案。
    expect(screen.queryByText(/twice a day 表示日常习惯/)).toBeNull()
    input.remove()
  })
})
