import type { UserWord } from '../../types'

export type TreeHealth = 'fragile' | 'due' | 'learning' | 'mastered'

export function classifyWordTree(word: UserWord, now = Date.now()): TreeHealth {
  const errorRatio = word.total > 0 ? (word.total - word.correct) / word.total : 0
  if (word.status !== 'mastered' && errorRatio >= 0.4) return 'fragile'
  if (word.status !== 'mastered' && word.nextReview <= now) return 'due'
  return word.status === 'mastered' ? 'mastered' : 'learning'
}

const labels: Record<TreeHealth, string> = { fragile: '脆弱', due: '到期', learning: '生长中', mastered: '茂盛' }

export default function WordForest({ words, onReview }: { words: UserWord[]; onReview: (wordId: string) => void }) {
  const now = Date.now()
  const trees = [...words].sort((left, right) => {
    const rank: Record<TreeHealth, number> = { fragile: 0, due: 1, learning: 2, mastered: 3 }
    return rank[classifyWordTree(left, now)] - rank[classifyWordTree(right, now)] || left.nextReview - right.nextReview
  }).slice(0, 24)

  return <section className="card word-forest" aria-labelledby="word-forest-title">
    <div className="card-title" id="word-forest-title">🌲 错词森林 <span className="chart-hint">错误率、复习日期与掌握度共同决定树木状态</span></div>
    {trees.length === 0 ? <p className="muted">完成词汇任务后，你的记忆森林会在这里生长。</p> : <div className="forest-grid">{trees.map((word) => {
      const health = classifyWordTree(word, now)
      const errorRatio = word.total ? Math.round((word.total - word.correct) / word.total * 100) : 0
      const reviewable = health === 'fragile' || health === 'due'
      return <button key={word.id} className={`forest-tree ${health}`} disabled={!reviewable} onClick={() => onReview(word.wordId)} aria-label={`${word.wordId}，${labels[health]}，错误率 ${errorRatio}%${reviewable ? '，开始复习' : ''}`}><span className="tree-crown" aria-hidden="true">{health === 'mastered' ? '🌳' : health === 'learning' ? '🌱' : health === 'due' ? '🌲' : '🥀'}</span><strong>{word.wordId}</strong><small>{labels[health]} · 错 {errorRatio}%</small></button>
    })}</div>}
  </section>
}
