import type { ButtonHTMLAttributes, HTMLAttributes, PointerEvent } from 'react'

type Props = ({ as: 'button' } & ButtonHTMLAttributes<HTMLButtonElement>) | ({ as?: 'div' } & HTMLAttributes<HTMLDivElement>)

export default function SpotlightCard({ children, className = '', ...props }: Props) {
  const handleMove = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'mouse' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const node = event.currentTarget
    const rect = node.getBoundingClientRect()
    node.style.setProperty('--spot-x', `${event.clientX - rect.left}px`)
    node.style.setProperty('--spot-y', `${event.clientY - rect.top}px`)
  }
  if (props.as === 'button') {
    const { as: _as, ...buttonProps } = props
    return <button type="button" onPointerMove={handleMove} {...buttonProps} className={`spotlight-card ${className}`}>{children}</button>
  }
  const { as: _as, ...divProps } = props
  return <div onPointerMove={handleMove} {...divProps} className={`spotlight-card ${className}`}>{children}</div>
}
