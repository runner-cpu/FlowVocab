import { afterEach, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { useProgress } from '../../store/progressStore'
import FeedbackFx from './FeedbackFx'

afterEach(cleanup)

it('renders celebratory particles as silent CSS shapes', () => {
  useProgress.setState({ feedback: { type: 'hit', combo: 1 } })
  const { container } = render(<FeedbackFx />)

  const particles = [...container.querySelectorAll('.particle')]
  expect(particles).toHaveLength(5)
  for (const particle of particles) {
    expect(particle).toHaveAttribute('aria-hidden', 'true')
    expect(particle).toHaveTextContent('')
  }
})
