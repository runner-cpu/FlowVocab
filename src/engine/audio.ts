// Web Audio API 合成音效（零资源、零版权）
let ctx: AudioContext | null = null

function ac(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext
      if (!AC) return null
      ctx = new AC()
    }
    if (ctx.state === 'suspended') ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.16, when = 0) {
  const c = ac()
  if (!c) return
  const t = c.currentTime + when
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.value = freq
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(c.destination)
  o.start(t)
  o.stop(t + dur + 0.05)
}

export const SoundBank = {
  hit() {
    tone(660, 0.09, 'sine', 0.14)
  },
  critical() {
    tone(880, 0.12, 'triangle', 0.16)
    tone(1320, 0.16, 'sine', 0.12, 0.03)
  },
  combo(n: number) {
    tone(540 + Math.min(n, 20) * 30, 0.12, 'square', 0.08)
  },
  rage() {
    tone(523, 0.15, 'triangle', 0.15)
    tone(659, 0.15, 'triangle', 0.15, 0.08)
    tone(784, 0.2, 'triangle', 0.15, 0.16)
  },
  miss() {
    tone(200, 0.18, 'sine', 0.07)
  },
  levelup() {
    tone(587, 0.12, 'triangle', 0.14)
    tone(880, 0.18, 'triangle', 0.14, 0.09)
  },
  click() {
    tone(420, 0.06, 'sine', 0.06)
  },
  done() {
    tone(523, 0.12, 'triangle', 0.13)
    tone(659, 0.12, 'triangle', 0.13, 0.1)
    tone(784, 0.2, 'triangle', 0.13, 0.2)
  }
}
