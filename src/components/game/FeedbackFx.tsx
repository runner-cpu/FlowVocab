import { useEffect, useRef, useState } from 'react'
import { useProgress } from '../../store/progressStore'
import type { FeedbackEvent } from '../../types'

interface Particle {
  id: number
  x: number
  y: number
  char: string
}

export default function FeedbackFx() {
  const feedback = useProgress((s) => s.feedback)
  const clear = useProgress((s) => s.clearFeedback)
  const [show, setShow] = useState<FeedbackEvent | null>(null)
  const [particles, setParticles] = useState<Particle[]>([])
  const idRef = useRef(0)

  useEffect(() => {
    if (!feedback) return
    setShow(feedback)
    // 金币粒子
    if (feedback.type === 'hit' || feedback.type === 'critical') {
      const n = feedback.type === 'critical' ? 10 : 5
      const arr: Particle[] = []
      for (let i = 0; i < n; i++) {
        arr.push({
          id: ++idRef.current,
          x: window.innerWidth / 2 + (Math.random() - 0.5) * 120,
          y: window.innerHeight / 2 + (Math.random() - 0.5) * 80,
          char: Math.random() > 0.5 ? '🪙' : '✨'
        })
      }
      setParticles((p) => [...p, ...arr])
      setTimeout(() => setParticles((p) => p.filter((pt) => !arr.some((a) => a.id === pt.id))), 750)
    }
    const t = setTimeout(() => {
      setShow(null)
      clear()
    }, 900)
    return () => clearTimeout(t)
  }, [feedback, clear])

  if (!show) return null

  const cls =
    show.type === 'critical' ? 'fx-critical' : show.type === 'rage' ? 'fx-rage' : show.type === 'miss' ? 'fx-miss' : 'fx-combo'
  const text =
    show.type === 'critical' ? '⚡ 暴击！' :
    show.type === 'rage' ? '💥 怒气爆发！' :
    show.type === 'miss' ? '再接再厉' :
    show.type === 'levelup' ? (show.message ?? '升级！') :
    show.message ?? `连击 ×${show.combo}`

  return (
    <>
      <div className="fx-overlay">
        <div className={`fx-text ${cls}`} key={show.combo + show.type} role="status" aria-live="polite">
          {text}
        </div>
      </div>
      {particles.map((p) => (
        <span
          key={p.id}
          className="particle"
          style={{ left: p.x, top: p.y }}
        >
          {p.char}
        </span>
      ))}
    </>
  )
}
