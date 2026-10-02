import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useNow } from './useNow'

function Clock({ intervalMs = 60_000 }: { intervalMs?: number }) {
  const now = useNow(intervalMs)
  return <output data-testid="now">{now}</output>
}

describe('useNow', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-02T08:00:00.000Z'))
  })

  afterEach(() => { cleanup(); vi.useRealTimers() })

  it('refreshes time at the configured interval', () => {
    render(<Clock />)
    expect(screen.getByTestId('now')).toHaveTextContent(String(Date.now()))

    act(() => { vi.advanceTimersByTime(60_000) })
    expect(screen.getByTestId('now')).toHaveTextContent(String(Date.now()))
  })

  it('refreshes immediately when the window regains focus', () => {
    render(<Clock intervalMs={60_000 * 60} />)
    const initial = screen.getByTestId('now').textContent
    act(() => { vi.setSystemTime(new Date('2026-10-02T08:15:00.000Z')); window.dispatchEvent(new Event('focus')) })
    expect(screen.getByTestId('now')).not.toHaveTextContent(initial ?? '')
    expect(screen.getByTestId('now')).toHaveTextContent(String(Date.now()))
  })
})
