import { render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import AppErrorBoundary from './AppErrorBoundary'

test('offers a reload action when a child throws', () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const Boom = () => { throw new Error('boom') }
  render(<AppErrorBoundary><Boom /></AppErrorBoundary>)
  expect(screen.getByRole('button', { name: '重新加载' })).toBeVisible()
})
