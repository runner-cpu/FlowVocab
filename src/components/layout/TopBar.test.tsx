import 'fake-indexeddb/auto'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { db } from '../../store/db'
import { useProgress } from '../../store/progressStore'
import TopBar from './TopBar'

beforeEach(async () => { await db.delete(); await db.open(); await useProgress.getState().init() })
afterEach(async () => { cleanup(); await db.delete() })

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
