import 'fake-indexeddb/auto'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { useUI } from '../../store/gameStore'
import { db } from '../../store/db'
import { useProgress } from '../../store/progressStore'
import TopBar from './TopBar'

beforeEach(async () => { await db.delete(); await db.open(); await useProgress.getState().init() })
afterEach(async () => { cleanup(); await db.delete() })

it('announces the current destination and labels icon-only sound controls', () => {
  useUI.setState({ page: 'vocab' })
  render(<TopBar />)
  expect(within(screen.getByRole('navigation', { name: '主导航' })).getByRole('button', { name: '词汇' })).toHaveAttribute('aria-current', 'page')
  expect(screen.getByRole('button', { name: '关闭学习音效' })).toHaveAttribute('aria-pressed', 'true')
})

it('opens learning settings from the single settings button', () => {
  render(<TopBar />)
  fireEvent.click(screen.getByRole('button', { name: '设置' }))
  expect(screen.getByRole('dialog', { name: '学习设置' })).toBeInTheDocument()
})

it('uses direct, task-oriented labels for the four primary destinations', () => {
  render(<TopBar />)
  const navigation = screen.getByRole('navigation', { name: '主导航' })
  expect(navigation).toHaveTextContent('首页')
  expect(navigation).toHaveTextContent('词汇')
  expect(navigation).toHaveTextContent('语法')
  expect(navigation).toHaveTextContent('学习数据')
})
