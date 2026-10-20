import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useServiceWorkerUpdate } from './useServiceWorkerUpdate'

function mockWorker() {
  return {
    postMessage: vi.fn()
  } as unknown as ServiceWorker
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('useServiceWorkerUpdate', () => {
  it('stays idle when service workers are unavailable', () => {
    vi.stubGlobal('navigator', {})
    function Probe() {
      const { updateReady } = useServiceWorkerUpdate()
      return <p>{updateReady ? 'ready' : 'idle'}</p>
    }
    render(<Probe />)
    expect(screen.getByText('idle')).toBeVisible()
  })

  it('reports a waiting worker and asks it to activate on demand', async () => {
    const worker = mockWorker()
    const registration = {
      waiting: worker,
      installing: null,
      addEventListener: () => {},
      removeEventListener: () => {}
    }
    vi.stubGlobal('navigator', {
      serviceWorker: {
        controller: {},
        getRegistration: async () => registration,
        addEventListener: () => {},
        removeEventListener: () => {}
      }
    })
    function Probe() {
      const { updateReady, applyUpdate } = useServiceWorkerUpdate()
      return <button onClick={applyUpdate}>{updateReady ? 'ready' : 'idle'}</button>
    }
    render(<Probe />)
    const button = await screen.findByRole('button', { name: 'ready' })
    button.click()
    expect(worker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
  })
})
