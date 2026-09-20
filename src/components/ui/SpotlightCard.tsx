import type { PointerEvent, ReactNode } from 'react'

export default function SpotlightCard({ children, className = '', as = 'div', onClick }: { children: ReactNode; className?: string; as?: 'div' | 'button'; onClick?: () => void }) {
  const handleMove = (event: PointerEvent<HTMLElement>) => {
    const node = event.currentTarget
    const rect = node.getBoundingClientRect()
    node.style.setProperty('--spot-x', `${event.clientX - rect.left}px`)
    node.style.setProperty('--spot-y', `${event.clientY - rect.top}px`)
  }
  const props = { onPointerMove: handleMove, onClick, className: `spotlight-card ${className}` }
  return as === 'button' ? <button type="button" {...props}>{children}</button> : <div {...props}>{children}</div>
}
