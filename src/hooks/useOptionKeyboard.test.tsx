import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { useOptionKeyboard } from './useOptionKeyboard'

function Harness(props: { enabled: boolean; count: number; onPick: (i: number) => void; onConfirm?: () => void }) {
  useOptionKeyboard(props)
  return <input aria-label="text" />
}

afterEach(cleanup)

describe('useOptionKeyboard', () => {
  it('picks options with number keys inside range', () => {
    const onPick = vi.fn()
    render(<Harness enabled count={4} onPick={onPick} />)
    fireEvent.keyDown(window, { key: '2' })
    expect(onPick).toHaveBeenCalledWith(1)
  })

  it('ignores number keys outside the option count', () => {
    const onPick = vi.fn()
    render(<Harness enabled count={2} onPick={onPick} />)
    fireEvent.keyDown(window, { key: '4' })
    expect(onPick).not.toHaveBeenCalled()
  })

  it('does nothing while disabled', () => {
    const onPick = vi.fn()
    render(<Harness enabled={false} count={4} onPick={onPick} />)
    fireEvent.keyDown(window, { key: '1' })
    expect(onPick).not.toHaveBeenCalled()
  })

  it('ignores repeat, composing and modifier combinations', () => {
    const onPick = vi.fn()
    render(<Harness enabled count={4} onPick={onPick} />)
    fireEvent.keyDown(window, { key: '1', repeat: true })
    fireEvent.keyDown(window, { key: '1', isComposing: true })
    fireEvent.keyDown(window, { key: '1', ctrlKey: true })
    fireEvent.keyDown(window, { key: '1', metaKey: true })
    expect(onPick).not.toHaveBeenCalled()
  })

  it('leaves typing in an input to the input itself', () => {
    const onPick = vi.fn()
    render(<Harness enabled count={4} onPick={onPick} />)
    const input = document.querySelector('input')!
    input.focus()
    fireEvent.keyDown(input, { key: '1' })
    expect(onPick).not.toHaveBeenCalled()
  })

  it('confirms with Enter but not while a button owns the key', () => {
    const onConfirm = vi.fn()
    render(<Harness enabled count={4} onPick={() => {}} onConfirm={onConfirm} />)
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(onConfirm).toHaveBeenCalledTimes(1)

    const button = document.createElement('button')
    document.body.append(button)
    fireEvent.keyDown(button, { key: 'Enter' })
    expect(onConfirm).toHaveBeenCalledTimes(1)
    button.remove()
  })

  it('detaches the listener on unmount', () => {
    const onPick = vi.fn()
    const view = render(<Harness enabled count={4} onPick={onPick} />)
    view.unmount()
    fireEvent.keyDown(window, { key: '1' })
    expect(onPick).not.toHaveBeenCalled()
  })
})
