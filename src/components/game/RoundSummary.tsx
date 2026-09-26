import { useEffect, useRef } from 'react'
import FlowGuide from './FlowGuide'

export interface RoundResult { total: number; correct: number; maxCombo: number; xp: number; rewards: string[] }
export default function RoundSummary({ result, onRestart, busy }: { result: RoundResult; onRestart: () => void; busy: boolean }) {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus() }, [])
  const accuracy = result.total ? Math.round(result.correct / result.total * 100) : 0
  const stars = accuracy >= 90 ? 3 : accuracy >= 70 ? 2 : accuracy >= 40 ? 1 : 0
  return <section className="card mission-summary" aria-label="词汇航程战报">
    <FlowGuide state={stars === 3 ? 'level-up' : 'hit'} />
    <p className="mission-eyebrow">EXPEDITION COMPLETE</p>
    <h2 tabIndex={-1} ref={heading}>航程完成</h2>
    <p className="muted">已抵达 {result.total} 站 · 答对 {result.correct} 题</p>
    <div className="summary-stars" aria-label="本轮星级"><span aria-hidden="true">{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</span><small>{stars} / 3</small></div>
    <div className="mission-result-grid">
      <div><span>正确率</span><strong aria-label="正确率">{accuracy}%</strong></div>
      <div><span>最高连击</span><strong aria-label="本轮最高连击">{result.maxCombo}</strong></div>
      <div><span>获得经验</span><strong aria-label="本轮经验">{result.xp} XP</strong></div>
    </div>
    <h3>新解锁奖励</h3>
    {result.rewards.length ? <ul className="mission-rewards">{result.rewards.map(reward => <li key={reward}>{reward}</li>)}</ul> : <p className="muted">这次没有新奖励，经验已计入你的成长航迹。</p>}
    <button className="btn btn-primary" disabled={busy} onClick={onRestart}>{busy ? '准备启航…' : '再启一段航程'}</button>
  </section>
}
