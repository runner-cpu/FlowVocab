import { beforeEach, describe, expect, it, vi } from 'vitest'

async function loadStore(hash: string) {
  vi.resetModules()
  window.location.hash = hash
  const module = await import('./gameStore')
  return module.useUI
}

describe('hash navigation', () => {
  beforeEach(() => {
    window.location.hash = ''
    window.localStorage.clear()
  })

  it('opens a module directly from its hash route', async () => {
    const useUI = await loadStore('#/module/listening')

    expect(useUI.getState().page).toBe('listening')
  })

  it('follows browser back and forward hash changes', async () => {
    const useUI = await loadStore('#/home')

    window.location.hash = '#/dashboard'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    expect(useUI.getState().page).toBe('dashboard')

    window.location.hash = '#/module/reading'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    expect(useUI.getState().page).toBe('reading')
  })

  it('marks an unknown module route as not found', async () => {
    const useUI = await loadStore('#/module/unknown')

    expect(useUI.getState().page).toBe('not-found')
  })

  it('writes the route when navigating through go', async () => {
    const useUI = await loadStore('#/home')

    useUI.getState().go('dashboard')

    expect(useUI.getState().page).toBe('dashboard')
    expect(window.location.hash).toBe('#/dashboard')
  })

  it('opens vocabulary review for the selected fragile word', async () => {
    const useUI = await loadStore('#/dashboard')

    useUI.getState().reviewWord('fragile-word')

    expect(useUI.getState().page).toBe('vocab')
    expect(useUI.getState().reviewWordId).toBe('fragile-word')
    expect(window.location.hash).toBe('#/module/vocab')
  })
})
