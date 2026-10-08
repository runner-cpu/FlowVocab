import { useEffect, useState } from 'react'

export default function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(value)
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setDisplay(value); return }
    const from = display
    const delta = value - from
    if (!delta) return
    const start = performance.now()
    let id = window.requestAnimationFrame(function tick(now) {
      const progress = Math.min(1, (now - start) / 450)
      setDisplay(Math.round(from + delta * (1 - Math.pow(1 - progress, 3))))
      if (progress < 1) id = window.requestAnimationFrame(tick)
    })
    return () => window.cancelAnimationFrame(id)
    // display is intentionally the previous visual value, not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  return <>{display}{suffix}</>
}
