import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useUI } from '../../store/gameStore'
import FirstRunGuide from './FirstRunGuide'

function Harness() {
  const openGuide = useUI((state) => state.openGuide)
  return <div className="app"><div className="app-content"><button onClick={openGuide}>Open guide</button><button>Background action</button></div><FirstRunGuide /></div>
}

beforeEach(() => {
  window.localStorage.clear()
  useUI.setState({ guideOpen: false, page: 'home' })
})
afterEach(() => cleanup())

describe('first-run guide focus lifecycle', () => {
  it('contains Tab focus, makes the background inert, and restores the opener after Escape', async () => {
    render(<Harness />)
    const opener = screen.getByRole('button', { name: 'Open guide' })
    fireEvent.click(opener)

    const close = await screen.findByRole('button', { name: /关闭新手指南/ })
    const start = screen.getByRole('button', { name: /开始每日任务/ })
    expect(close).toHaveFocus()
    expect(document.querySelector('.app-content')).toHaveAttribute('inert')
    expect(document.querySelector('.app-content')).toHaveAttribute('aria-hidden', 'true')

    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true })
    expect(start).toHaveFocus()
    fireEvent.keyDown(window, { key: 'Tab' })
    expect(close).toHaveFocus()

    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(window.localStorage.getItem('flowvocab-first-run-complete')).toBe('1')
    expect(opener).toHaveFocus()
    expect(document.querySelector('.app-content')).not.toHaveAttribute('inert')
    expect(document.querySelector('.app-content')).not.toHaveAttribute('aria-hidden')
  })
})
