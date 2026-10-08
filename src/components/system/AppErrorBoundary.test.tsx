import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import AppErrorBoundary from './AppErrorBoundary'

afterEach(() => { cleanup(); vi.restoreAllMocks() })

test('offers a reload action when a child throws', () => {
  const error = new Error('expected render failure')
  const expectedError = (event: ErrorEvent) => { if (event.error === error) event.preventDefault() }
  window.addEventListener('error', expectedError)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const Boom = () => { throw error }
  try {
    render(<AppErrorBoundary><Boom /></AppErrorBoundary>)
    expect(screen.getByRole('button', { name: '重新加载' })).toBeVisible()
  } finally { window.removeEventListener('error', expectedError) }
})
