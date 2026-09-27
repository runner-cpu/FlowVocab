import 'fake-indexeddb/auto'
import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import App from './App'
import { db } from './store/db'
import { useProgress } from './store/progressStore'
import { useUI } from './store/gameStore'

afterEach(async () => { cleanup(); vi.restoreAllMocks(); await db.delete() })

test('shows retry after initialization fails and recovers on the next attempt', async () => {
  await db.open()
  useProgress.setState({ ready: false, initError: null, profile: null, planet: null, progress: null, daily: null, userWords: [] })
  const get = vi.spyOn(db.userProfile, 'get').mockRejectedValueOnce(new Error('read failed'))
  render(<App />)
  expect(await screen.findByRole('alert')).toHaveTextContent('无法读取本地学习数据')
  fireEvent.click(screen.getByRole('button', { name: '重试' }))
  await waitFor(() => expect(useProgress.getState().ready).toBe(true))
  await waitFor(() => expect(document.querySelector('.mission-heading h1')).toHaveTextContent('探索、练习、持续成长。'))
  expect(get).toHaveBeenCalledTimes(2)
})

test('moves focus to main content after a hash-routed page change', async () => {
  localStorage.setItem('flowvocab-first-run-complete', '1')
  await db.open()
  await useProgress.getState().init()
  useUI.setState({ page: 'home', guideOpen: false })
  render(<App />)

  const navigation = await screen.findByRole('navigation', { name: '主导航' })
  fireEvent.click(within(navigation).getAllByRole('button')[1])

  await waitFor(() => expect(document.querySelector('#main-content')).toHaveFocus())
})
