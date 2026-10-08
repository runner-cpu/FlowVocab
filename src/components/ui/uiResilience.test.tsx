import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import AnimatedNumber from './AnimatedNumber'
import RevealOnScroll from './RevealOnScroll'
import SpotlightCard from './SpotlightCard'

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

it('leaves learning content visible when IntersectionObserver is unavailable', () => {
  vi.stubGlobal('IntersectionObserver', undefined)
  const { container } = render(<RevealOnScroll><p>今日旅程</p></RevealOnScroll>)
  expect(container.firstElementChild).toHaveAttribute('data-revealed', 'true')
})

it('cancels the latest animation frame on unmount rather than only the first', () => {
  let callback: FrameRequestCallback = () => {}
  let id = 0
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(fn => { callback = fn; return ++id })
  const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
  const view = render(<AnimatedNumber value={0} />)
  view.rerender(<AnimatedNumber value={10} />)
  callback(performance.now() + 20)
  view.unmount()
  expect(cancel).toHaveBeenLastCalledWith(2)
})

it('renders number changes immediately when motion is reduced', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }))
  const request = vi.spyOn(window, 'requestAnimationFrame')
  const view = render(<AnimatedNumber value={1} />)
  view.rerender(<AnimatedNumber value={37} />)
  expect(screen.getByText('37')).toBeVisible()
  expect(request).not.toHaveBeenCalled()
})

it('forwards disabled and accessible names to scene buttons', () => {
  render(<SpotlightCard as="button" disabled aria-label="暂未开放">场景</SpotlightCard>)
  expect(screen.getByRole('button', { name: '暂未开放' })).toBeDisabled()
})
