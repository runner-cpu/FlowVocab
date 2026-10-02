import { useEffect, useMemo, useRef, useState } from 'react'
import { elapsedSince } from '../../../engine/sessionTiming'
import { useProgress } from '../../../store/progressStore'
import { WRITING_TASKS } from '../../../data/writing'
import { itemsForTrack } from '../../../data/curriculum'
import { useUI } from '../../../store/gameStore'
import type { WritingTask } from '../../../types'
import GameHud from '../../game/GameHud'

function shuffle<T>(values: T[]): T[] {
  const result = [...values]
  for (let i = result.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]] }
  return result
}

export function moveWritingSegment<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const destination = index + direction
  if (index < 0 || index >= items.length || destination < 0 || destination >= items.length) return [...items]
  const next = [...items]
  ;[next[index], next[destination]] = [next[destination], next[index]]
  return next
}

export default function WritingGame() {
  const track = useUI((state) => state.track)
  const tasks = useMemo(() => itemsForTrack(track, 'writing', WRITING_TASKS), [track])
  const answer = useProgress((state) => state.answer)
  const submitWriting = useProgress((state) => state.submitWriting)
  const [taskIdx, setTaskIdx] = useState(0)
  const task = tasks[taskIdx] ?? tasks[0]
  const initialOrder = useMemo(() => shuffle(task?.segments ?? []), [task])
  const [order, setOrder] = useState<string[]>(initialOrder)
  const [previousOrder, setPreviousOrder] = useState<string[] | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [pickErr, setPickErr] = useState<number | null>(null)
  const [result, setResult] = useState<{ pass: boolean } | null>(null)
  const startedAt = useRef(performance.now())

  useEffect(() => {
    setTaskIdx(0)
    setOrder([])
    setPreviousOrder(null)
    setDraggedIndex(null)
    setPickErr(null)
    setResult(null)
    setAnnouncement('')
    startedAt.current = performance.now()
  }, [track])
  useEffect(() => { setOrder(initialOrder); setPreviousOrder(null); setPickErr(null); setResult(null); setAnnouncement(''); startedAt.current = performance.now() }, [initialOrder])
  const sortDone = task?.type === 'sort' && order.length === (task.segments?.length ?? 0)
  const errDone = task?.type === 'error' && pickErr !== null

  function moveSegment(index: number, direction: -1 | 1) {
    if (result) return
    const next = moveWritingSegment(order, index, direction)
    if (next[index] === order[index]) return
    setPreviousOrder(order); setOrder(next); setAnnouncement(`已将 ${order[index]} ${direction < 0 ? '前移' : '后移'}一位`)
  }
  function dropSegment(destination: number) {
    if (draggedIndex === null || draggedIndex === destination || result) return
    const next = [...order]; const [item] = next.splice(draggedIndex, 1); next.splice(destination, 0, item)
    setPreviousOrder(order); setOrder(next); setDraggedIndex(null); setAnnouncement(`已移动 ${item} 到第 ${destination + 1} 位`)
  }
  function submit() {
    if (result || !task) return
    const pass = task.type === 'sort' ? order.every((segment, index) => segment === task.segments?.[index]) : pickErr === task.answer
    setResult({ pass }); void answer({ module: 'writing', correct: pass, timeMs: elapsedSince(startedAt.current, performance.now()) }); void submitWriting(task.id, pass ? 5 : 1)
  }

  if (!task) return <div className="quiz-panel"><GameHud module="writing" /><div className="card center"><h2>当前路线暂无写作练习</h2><p className="muted">请切换学习路线后重试。</p></div></div>

  return <div className="quiz-panel"><GameHud module="writing" /><div className="card">
    <div className="card-title">🃏 写作·句型工坊（排序 / 改错）</div>
    <div className="task-tabs">{tasks.map((candidate, index) => <button key={candidate.id} className={`btn ${index === taskIdx ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTaskIdx(index)}>{candidate.type === 'sort' ? '🧩' : '✍️'} {candidate.title}</button>)}</div>
    <div className="explain-box"><b>📑 {task.title}（{task.type === 'sort' ? '句子排序' : '句子改错'}）</b><div className="ex-eg">{task.prompt}</div></div>
    {task.type === 'sort' && <>
      <div className="card-title mt14">你的答案（拖动或使用方向键调整）</div>
      <div className="sort-answer sortable-answer">{order.map((segment, index) => <div key={`${segment}-${index}`} className="sort-chip placed" draggable={!result} onDragStart={() => setDraggedIndex(index)} onDragEnd={() => setDraggedIndex(null)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); dropSegment(index) }}><span>{segment}</span><span className="sort-controls"><button type="button" aria-label={`向前移动 ${segment}`} disabled={!!result || index === 0} onClick={() => moveSegment(index, -1)}>←</button><button type="button" aria-label={`向后移动 ${segment}`} disabled={!!result || index === order.length - 1} onClick={() => moveSegment(index, 1)}>→</button></span></div>)}</div>
      <div className="interaction-actions"><button className="btn btn-ghost" disabled={!!result || previousOrder === null} onClick={() => { if (previousOrder !== null) { setOrder(previousOrder); setPreviousOrder(null); setAnnouncement('已撤回上一步') } }}>撤回上一步</button><button className="btn btn-ghost" disabled={!!result} onClick={() => { setOrder(initialOrder); setPreviousOrder(null); setAnnouncement('已恢复初始排序') }}>重置排序</button></div><p className="sr-only" aria-live="polite">{announcement}</p>
      {result && <div className={`score-report ${result.pass ? '' : 'miss'}`}><strong>{result.pass ? '✓ 排序正确！' : '× 顺序有误'}</strong><div className="ex-eg mt8">💡 {task.explain}</div></div>}
    </>}
    {task.type === 'error' && <><div className="explain-box mt8"><div className="ex-eg">“{task.sentence}”</div></div><div className="options mt14">{(task.options ?? []).map((option, index) => { let className = 'option'; if (result) { if (index === task.answer) className += ' correct'; else if (pickErr === index) className += ' wrong' } else if (pickErr === index) className += ' picked'; return <button key={index} className={className} disabled={!!result} onClick={() => setPickErr(index)}>{option}</button> })}</div>{result && <div className={`score-report ${result.pass ? '' : 'miss'}`}><strong>{result.pass ? '✓ 改对了！' : '× 再想想'}</strong><div className="ex-eg mt8">💡 {task.explain}</div></div>}</>}
    <div className="progress-strip mt14"><button className="btn btn-primary" onClick={submit} disabled={!sortDone && !errDone}>{result ? '已判定' : '提交判定'}</button>{result && tasks.length > 0 && <button className="btn btn-ghost" onClick={() => setTaskIdx((taskIdx + 1) % tasks.length)}>{taskIdx + 1 >= tasks.length ? '再来一轮' : '下一题 →'}</button>}</div>
  </div></div>
}
