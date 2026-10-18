import { useMemo, useState } from 'react'
import { ArrowRight, ClipboardList, RotateCcw, Trash2 } from 'lucide-react'
import { useProgress } from '../../store/progressStore'
import { useUI } from '../../store/gameStore'
import { MODULE_META, type ModuleKey } from '../../types'
import { ERROR_TAG_LABELS, type ErrorTag } from '../../engine/errorRouting'
import { summarizeMistakes } from '../../engine/mistakes'

/** 列表默认只展开最近几条：错题本的作用是提醒，不是把成长页撑成一张长表。 */
const VISIBLE = 5

const relativeDay = (ts: number, now: number): string => {
  const days = Math.floor((now - ts) / 86400000)
  if (days <= 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days} 天前`
  const date = new Date(ts)
  return `${date.getMonth() + 1}-${String(date.getDate()).padStart(2, '0')}`
}

/**
 * 成长图谱里的错题回顾。
 *
 * 之前错因卡看完即焚：答错那一屏有讲解，题一过就再也找不到。
 * 这个卡片把记录读出来，按模块归组、按最近答错排序，点一条能直接回到对应模块重练。
 *
 * 交互取舍：不提供「一键清空」，因为错题是学习证据，误删的代价比多留几条高；
 * 单条删除只用于「我已经会了」的显式动作，且立刻从列表消失。
 */
export default function MistakeReview() {
  const progress = useProgress((state) => state.progress)
  const clearMistake = useProgress((state) => state.clearMistake)
  const go = useUI((state) => state.go)
  const [expanded, setExpanded] = useState(false)
  const now = Date.now()

  const records = useMemo(() => progress?.mistakes ?? [], [progress?.mistakes])
  const summary = useMemo(() => summarizeMistakes(records), [records])
  const visible = expanded ? records : records.slice(0, VISIBLE)

  // 词汇错题能精确到词；其他模块把 contentId 交给对应组件，落回原题。
  // 两者都不只是「进入模块」，否则错题回顾就退化成了一个普通导航按钮。
  function reviewRecord(record: (typeof records)[number]) {
    if (record.module === 'vocab') useUI.getState().reviewWord(record.contentId)
    else useUI.getState().reviewMistake(record.module as ModuleKey, record.contentId)
  }

  if (records.length === 0) {
    return (
      <section className="card mistake-card" aria-labelledby="mistake-title">
        <div className="card-title" id="mistake-title"><ClipboardList size={16} /> 错题回顾 <span className="chart-hint">答错会自动收进这里</span></div>
        <p className="muted mistake-empty">还没有错题。答错的题会连同错因和正确答案一起留在这里，方便随时回看。</p>
        <div className="mistake-actions">
          <button className="btn btn-ghost" onClick={() => go('vocab')}>去练一轮 <ArrowRight size={15} /></button>
        </div>
      </section>
    )
  }

  return (
    <section className="card mistake-card" aria-labelledby="mistake-title">
      <div className="card-title" id="mistake-title">
        <ClipboardList size={16} /> 错题回顾
        <span className="chart-hint">{summary.total} 条待回看</span>
      </div>
      <p className="muted mistake-intro">
        同一题再答对会自动移出。错因分布：
        {summary.topTags.map(({ tag, count }, index) => (
          <span key={tag}>{index > 0 ? ' · ' : ''}{ERROR_TAG_LABELS[tag as ErrorTag] ?? '其他'} {count}</span>
        ))}
      </p>
      <ul className="mistake-list">
        {visible.map((record) => {
          const meta = MODULE_META[record.module as ModuleKey]
          return (
            <li className="mistake-row" key={record.id}>
              <button
                className="mistake-main"
                onClick={() => reviewRecord(record)}
                aria-label={`回到${meta.name.split('·')[0]}重练：${record.prompt}`}
              >
                <span className="mistake-module" style={{ background: meta.color }} aria-hidden="true" />
                <span className="mistake-copy">
                  <strong>{record.prompt}</strong>
                  <small>
                    {meta.name.split('·')[0]} · {ERROR_TAG_LABELS[record.tag as ErrorTag] ?? '其他'} · 错 {record.count} 次 · {relativeDay(record.lastAt, now)}
                  </small>
                </span>
                <ArrowRight size={15} aria-hidden="true" />
              </button>
              <button
                className="mistake-dismiss"
                onClick={() => void clearMistake(record.module as ModuleKey, record.contentId)}
                aria-label={`把「${record.prompt}」移出错题本`}
                title="我已经会了"
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </li>
          )
        })}
      </ul>
      <div className="mistake-actions">
        {records.length > VISIBLE && (
          <button className="btn btn-ghost" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
            {expanded ? '收起' : `查看全部 ${records.length} 条`}
          </button>
        )}
        <button className="btn btn-ghost" onClick={() => go(summary.byModule[0]?.module ?? 'vocab')}>
          <RotateCcw size={15} /> 去重练最多错的模块
        </button>
      </div>
    </section>
  )
}
