import { useEffect, useState } from 'react'

/**
 * A small wall-clock signal for views whose meaning changes while they stay
 * mounted (for example, a card becoming due at midnight or after a review
 * interval). Focus/visibility refreshes make the UI catch up immediately
 * after a tab has been backgrounded without requiring a full route change.
 */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const refresh = () => setNow(Date.now())
    const interval = window.setInterval(refresh, Math.max(1_000, intervalMs))
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [intervalMs])

  return now
}
