import { useEffect, useMemo, useState } from 'react'
import { WORDS } from '../../data/words'
import { db } from '../../store/db'
import type { UserWord } from '../../types'
import { useNow } from '../../hooks/useNow'
import ResponsiveSceneImage from '../ui/ResponsiveSceneImage'

export type TreeHealth = 'fragile' | 'due' | 'learning' | 'mastered'

export function classifyWordTree(word: UserWord, now = Date.now()): TreeHealth {
  const errorRatio = word.total > 0 ? (word.total - word.correct) / word.total : 0
  if (word.status !== 'mastered' && errorRatio >= 0.4) return 'fragile'
  if (word.status !== 'mastered' && word.nextReview <= now) return 'due'
  return word.status === 'mastered' ? 'mastered' : 'learning'
}

const healthOrder: TreeHealth[] = ['fragile', 'due', 'learning', 'mastered']
const labels: Record<TreeHealth, string> = { fragile: '脆弱', due: '到期', learning: '生长中', mastered: '茂盛' }
const crowns: Record<TreeHealth, string> = { fragile: '🥀', due: '🌲', learning: '🌱', mastered: '🌳' }
const builtInWords = new Map(WORDS.map((word) => [word.id, word.word]))

/** 复习日期的人类可读文案：今天 / 明天 / N 天后 / YYYY-MM-DD。 */
export function reviewLabel(nextReview: number, now: number): string {
  if (!Number.isFinite(nextReview)) return '待安排'
  const days = Math.floor((nextReview - now) / 86400000)
  if (nextReview <= now) return '已到期'
  if (days <= 0) return '今天稍后'
  if (days === 1) return '明天'
  if (days <= 14) return `${days} 天后`
  const date = new Date(nextReview)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

async function resolveWordLabels(wordIds: string[]) {
  const labelsById: Record<string, string> = {}
  try {
    const cachedWords = await db.wordBank.bulkGet(wordIds)
    cachedWords.forEach((word, index) => {
      const fallback = builtInWords.get(wordIds[index])
      const label = word?.word || fallback
      if (label) labelsById[wordIds[index]] = label
    })
  } catch {
    wordIds.forEach((wordId) => {
      const label = builtInWords.get(wordId)
      if (label) labelsById[wordId] = label
    })
  }
  return labelsById
}

export default function WordForest({ words, onReview, onStart }: { words: UserWord[]; onReview: (wordId: string) => void; onStart?: () => void }) {
  const now = useNow()
  const [notice, setNotice] = useState('')
  const trees = useMemo(() => [...words].sort((left, right) => {
    const rank: Record<TreeHealth, number> = { fragile: 0, due: 1, learning: 2, mastered: 3 }
    return rank[classifyWordTree(left, now)] - rank[classifyWordTree(right, now)] || left.nextReview - right.nextReview
  }).slice(0, 24), [words, now])
  const wordIds = useMemo(() => trees.map((word) => word.wordId), [trees])
  const [wordLabels, setWordLabels] = useState<Record<string, string> | null>(null)

  useEffect(() => {
    let active = true
    setWordLabels(null)
    resolveWordLabels(wordIds).then((resolved) => {
      if (active) setWordLabels(resolved)
    })
    return () => { active = false }
  }, [wordIds])

  const groups = healthOrder.map((health) => ({
    health,
    trees: trees.filter((word) => classifyWordTree(word, now) === health)
  }))
  const unavailableCount = wordLabels === null ? 0 : trees.filter((word) => !wordLabels[word.wordId]).length
  const reviewable = trees.filter((word) => {
    const health = classifyWordTree(word, now)
    return health === 'fragile' || health === 'due'
  })
  const earliest = reviewable[0] ?? trees.find((word) => word.status !== 'mastered')

  return <section className="card word-forest" aria-labelledby="word-forest-title">
    <div className="card-title" id="word-forest-title">🌲 错词森林 <span className="chart-hint">错误率、复习日期与掌握度共同决定树木状态</span></div>
    {trees.length === 0 ? <div className="forest-empty">
      <ResponsiveSceneImage assetStem="flowvocab-memory-garden" sizes="(max-width: 640px) 100vw, 50vw" alt="发光记忆花园插画" />
      <div className="forest-empty-copy"><strong>你的记忆花园还在等第一颗种子</strong><p className="muted">完成一轮词汇任务，错词森林会记录每个词的成长状态。</p>{onStart && <button className="btn btn-primary" onClick={onStart}>开始词汇任务</button>}</div>
    </div> : wordLabels === null ? <p className="muted" role="status">正在读取离线词库…</p> : <>
      <div className="forest-summary">
        <span>本轮共 {trees.length} 棵</span>
        <span>待复习 {reviewable.length}</span>
        {earliest && <span>最近一棵：{wordLabels[earliest.wordId] ?? '词条'} · {reviewLabel(earliest.nextReview, now)}</span>}
        {reviewable.length > 0 && <button type="button" className="btn btn-ghost" onClick={() => onReview(earliest!.wordId)}>从最早到期开始复习</button>}
      </div>
      <div className="forest-groups">{groups.map(({ health, trees: groupTrees }) => <section className="forest-group" key={health} aria-labelledby={`forest-${health}-title`}>
        <h3 id={`forest-${health}-title`}>{labels[health]} <span>{groupTrees.length}</span></h3>
        <div className="forest-grid">{groupTrees.map((word) => {
          const errorRatio = word.total ? Math.round((word.total - word.correct) / word.total * 100) : 0
          const label = wordLabels[word.wordId]
          const canReview = Boolean(label) && (health === 'fragile' || health === 'due')
          const displayLabel = label || '词条暂不可用'
          const detail = `${labels[health]} · 错 ${errorRatio}% · ${reviewLabel(word.nextReview, now)}`
          return <button
            key={word.id}
            className={`forest-tree ${health}`}
            disabled={!label}
            onClick={() => {
              if (canReview) { setNotice(''); onReview(word.wordId); return }
              // 未到期的词点一下给出「什么时候回来复习」的答复，而不是毫无反应。
              setNotice(`${displayLabel} 属于「${labels[health]}」，${reviewLabel(word.nextReview, now)}复习；先处理脆弱与到期的树更划算。`)
            }}
            aria-label={`${displayLabel}，${detail}${canReview ? '，开始复习' : ''}`}
          ><span className="tree-crown" aria-hidden="true">{crowns[health]}</span><strong>{displayLabel}</strong><small>{detail}</small></button>
        })}</div>
      </section>)}</div>
      {notice && <p className="forest-status" role="status">{notice} <button type="button" className="btn btn-ghost" onClick={() => setNotice('')}>知道了</button></p>}
      {unavailableCount > 0 && <p className="muted forest-status" role="status">{unavailableCount} 个词条尚未在离线词库中找到</p>}
    </>}
  </section>
}
