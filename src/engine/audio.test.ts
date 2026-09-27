import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => { vi.restoreAllMocks(); vi.resetModules() })

it('scales hit gain by the configured volume', async () => {
  const ramp = vi.fn()
  class MockAudioContext {
    state = 'running'; currentTime = 0; destination = {}
    createOscillator() { return { type: 'sine', frequency: { value: 0 }, connect: () => ({ connect: () => undefined }), start: () => undefined, stop: () => undefined } }
    createGain() { return { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: ramp }, connect: () => ({ connect: () => undefined }) } }
  }
  vi.stubGlobal('AudioContext', MockAudioContext)
  const { SoundBank } = await import('./audio')
  SoundBank.setVolume(.5); SoundBank.hit()
  expect(ramp).toHaveBeenCalledWith(.07, .01)
})
