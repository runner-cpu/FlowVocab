import { useEffect, useRef, type ReactNode } from 'react'

export default function RevealOnScroll({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (typeof window.IntersectionObserver !== 'function' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      node.dataset.revealed = 'true'
      return
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        node.dataset.revealed = 'true'
        observer.disconnect()
      }
    }, { threshold: 0.12 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return <div ref={ref} className={`reveal-on-scroll ${className}`}>{children}</div>
}
