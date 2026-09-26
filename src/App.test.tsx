import 'fake-indexeddb/auto'
import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from './App'
import { db } from './store/db'
import { useProgress } from './store/progressStore'

afterEach(async () => { cleanup(); vi.restoreAllMocks(); await db.delete() })

test('shows retry after initialization fails and recovers on the next attempt', async () => {
  await db.open()
  useProgress.setState({ ready: false, initError: null, profile: null, planet: null, progress: null, daily: null, userWords: [] })
  const get = vi.spyOn(db.userProfile, 'get').mockRejectedValueOnce(new Error('read failed'))
  render(<App />)
  expect(await screen.findByRole('alert')).toHaveTextContent('无法读取本地学习数据')
  fireEvent.click(screen.getByRole('button', { name: '重试' }))
  await waitFor(() => expect(useProgress.getState().ready).toBe(true))
  expect(document.querySelector('main')).not.toBeNull()
  expect(get).toHaveBeenCalledTimes(2)
})
