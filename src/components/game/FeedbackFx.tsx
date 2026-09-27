import { useEffect, useRef, useState } from 'react'
import { useProgress } from '../../store/progressStore'
import type { FeedbackEvent } from '../../types'

interface Particle { id: number; x: number; y: number }

export default function FeedbackFx() {
  const feedback = useProgress((s) => s.feedback)
  const clear = useProgress((s) => s.clearFeedback)
  const [show, setShow] = useState<FeedbackEvent | null>(null)
  const [particles, setParticles] = useState<Particle[]>([])
  const idRef = useRef(0)

  useEffect(() => {
    if (!feedback) return
    setShow(feedback)
    if (feedback.type === 'hit' || feedback.type === 'critical') {
      const amount = feedback.type === 'critical' ? 10 : 5
      const arr = Array.from({ length: amount }, () => ({
        id: ++idRef.current,
        x: window.innerWidth / 2 + (Math.random() - 0.5) * 120,
        y: window.innerHeight / 2 + (Math.random() - 0.5) * 80,
      }))
      setParticles((current) => [...current, ...arr])
      window.setTimeout(() => setParticles((current) => current.filter((particle) => !arr.some((item) => item.id === particle.id))), 750)
    }
    const timer = window.setTimeout(() => { setShow(null); clear() }, 900)
    return () => window.clearTimeout(timer)
  }, [feedback, clear])

  if (!show) return null
  const cls = show.type === 'critical' ? 'fx-critical' : show.type === 'rage' ? 'fx-rage' : show.type === 'miss' ? 'fx-miss' : 'fx-combo'
  const text = show.type === 'levelup' ? (show.message ?? '升级！') : show.message ?? `连击 ×${show.combo}`
  return <>
    <div className="fx-overlay"><div className={`fx-text ${cls}`} key={show.combo + show.type} role="status" aria-live="polite">{text}</div></div>
    {particles.map((particle) => <span key={particle.id} className="particle" aria-hidden="true" style={{ left: particle.x, top: particle.y }} />)}
  </>
}
