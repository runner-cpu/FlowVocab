import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Lightbulb, ListOrdered, PenLine, Puzzle, Ticket, X } from 'lucide-react'
import { elapsedSince } from '../../../engine/sessionTiming'
import { useProgress } from '../../../store/progressStore'
import { WRITING_TASKS } from '../../../data/writing'
import { itemsForTrack } from '../../../data/curriculum'
import { useUI } from '../../../store/gameStore'
import type { WritingTask } from '../../../types'
import GameHud from '../../game/GameHud'
import ErrorCard from '../../game/ErrorCard'
import { useChapterResult } from '../../game/ChapterShell'
import { inferErrorTag, type ErrorTag } from '../../../engine/errorRouting'
import { useOptionKeyboard } from '../../../hooks/useOptionKeyboard'

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
  // 判定失败后旁路渲染的离线错因卡；换题、换路线、重新提交前即卸载。
  const [errorCard, setErrorCard] = useState<{ tag: ErrorTag; chosen?: string; correctAnswer?: string; explain?: string } | null>(null)
  const chapterResult = useChapterResult()
  /** 本次进入模块的累计成绩，够门槛才交给章节壳结算。 */
  const tally = useRef({ total: 0, correct: 0 })
  const startedAt = useRef(performance.now())

  useEffect(() => {
    setTaskIdx(0)
    setOrder([])
    setPreviousOrder(null)
    setDraggedIndex(null)
    setPickErr(null)
    setResult(null)
    setErrorCard(null)
    setAnnouncement('')
    tally.current = { total: 0, correct: 0 }
    startedAt.current = performance.now()
  }, [track])
  useEffect(() => { setOrder(initialOrder); setPreviousOrder(null); setPickErr(null); setResult(null); setErrorCard(null); setAnnouncement(''); startedAt.current = performance.now() }, [initialOrder])
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
    setResult({ pass })
    // 判定失败时叠加离线错因路由；判定通过或重新提交时清空，同一时刻最多一张错因卡。
    const chosen = pickErr !== null ? task.options?.[pickErr] : undefined
    const correctAnswer = task.answer !== undefined ? task.options?.[task.answer] : undefined
    setErrorCard(pass ? null : { tag: inferErrorTag({ module: 'writing', prompt: task.prompt, sentence: task.sentence, options: task.options, chosen, correctAnswer, explain: task.explain }), chosen, correctAnswer, explain: task.explain })
    void answer({ module: 'writing', correct: pass, timeMs: elapsedSince(startedAt.current, performance.now()) }); void submitWriting(task.id, pass ? 5 : 1)
    tally.current = { total: tally.current.total + 1, correct: tally.current.correct + (pass ? 1 : 0) }
    chapterResult.report(tally.current.total, tally.current.correct)
  }
  // 改错题只有一个动作（选错项 → 提交），数字键先选中，Enter 提交；
  // 排序题的 Enter 已经归「提交判定」按钮，这里不再接管。
  const errorOptions = task?.type === 'error' ? task.options ?? [] : []
  useOptionKeyboard({
    enabled: !!task && task.type === 'error' && !result,
    count: errorOptions.length,
    onPick: (index) => { setPickErr(index); setErrorCard(null) },
    onConfirm: pickErr !== null ? submit : undefined
  })

  if (!task) return <div className="quiz-panel"><GameHud module="writing" /><div className="card center"><h2>当前路线暂无写作练习</h2><p className="muted">请切换学习路线后重试。</p></div></div>

  return <div className="quiz-panel"><GameHud module="writing" /><div className="card">
    <div className="card-title"><PenLine size={16} aria-hidden /> 写作·灵感工作室（排序 / 改错）</div>
    <div className="task-tabs">{tasks.map((candidate, index) => <button key={candidate.id} className={`btn ${index === taskIdx ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTaskIdx(index)}>{candidate.type === 'sort' ? <ListOrdered size={14} aria-hidden /> : <Puzzle size={14} aria-hidden />} {candidate.title}</button>)}</div>
    <div className="explain-box"><b><Ticket size={14} aria-hidden /> {task.title}（{task.type === 'sort' ? '句子排序' : '句子改错'}）</b><div className="ex-eg">{task.prompt}</div></div>
    {task.type === 'sort' && <>
      <div className="card-title mt14">你的答案（拖动或使用方向键调整）</div>
      <div className="sort-answer sortable-answer">{order.map((segment, index) => <div key={`${segment}-${index}`} className="sort-chip placed" draggable={!result} onDragStart={() => setDraggedIndex(index)} onDragEnd={() => setDraggedIndex(null)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); dropSegment(index) }}><span>{segment}</span><span className="sort-controls"><button type="button" aria-label={`向前移动 ${segment}`} disabled={!!result || index === 0} onClick={() => moveSegment(index, -1)}><ArrowLeft size={14} aria-hidden /></button><button type="button" aria-label={`向后移动 ${segment}`} disabled={!!result || index === order.length - 1} onClick={() => moveSegment(index, 1)}><ArrowRight size={14} aria-hidden /></button></span></div>)}</div>
      <div className="interaction-actions"><button className="btn btn-ghost" disabled={!!result || previousOrder === null} onClick={() => { if (previousOrder !== null) { setOrder(previousOrder); setPreviousOrder(null); setAnnouncement('已撤回上一步') } }}>撤回上一步</button><button className="btn btn-ghost" disabled={!!result} onClick={() => { setOrder(initialOrder); setPreviousOrder(null); setAnnouncement('已恢复初始排序') }}>重置排序</button></div><p className="sr-only" aria-live="polite">{announcement}</p>
      {result && <div className={`score-report ${result.pass ? '' : 'miss'}`}><strong>{result.pass ? <><Check size={14} aria-hidden /> 排序正确！</> : <><X size={14} aria-hidden /> 顺序有误</>}</strong><div className="ex-eg mt8"><Lightbulb size={14} aria-hidden /> {task.explain}</div></div>}
      {errorCard && <ErrorCard tag={errorCard.tag} chosen={errorCard.chosen} correctAnswer={errorCard.correctAnswer} explain={errorCard.explain} onDismiss={() => setErrorCard(null)} />}
    </>}
    {task.type === 'error' && <><div className="explain-box mt8"><div className="ex-eg">“{task.sentence}”</div></div><div className="options mt14">{(task.options ?? []).map((option, index) => { let className = 'option'; if (result) { if (index === task.answer) className += ' correct'; else if (pickErr === index) className += ' wrong' } else if (pickErr === index) className += ' picked'; return <button key={index} className={className} disabled={!!result} onClick={() => { setPickErr(index); setErrorCard(null) }}><kbd aria-hidden="true">{index + 1}</kbd><span>{option}</span></button> })}</div>{!result && <p className="interaction-hint muted mt8">数字键 1–{(task.options ?? []).length} 选中要改的位置{pickErr !== null ? ' · Enter 提交判定' : ''}</p>}{result && <div className={`score-report ${result.pass ? '' : 'miss'}`}><strong>{result.pass ? <><Check size={14} aria-hidden /> 改对了！</> : <><X size={14} aria-hidden /> 再想想</>}</strong><div className="ex-eg mt8"><Lightbulb size={14} aria-hidden /> {task.explain}</div></div>}{errorCard && <ErrorCard tag={errorCard.tag} chosen={errorCard.chosen} correctAnswer={errorCard.correctAnswer} explain={errorCard.explain} onDismiss={() => setErrorCard(null)} />}</>}
    <div className="progress-strip mt14"><button className="btn btn-primary" onClick={submit} disabled={!sortDone && !errDone}>{result ? '已判定' : '提交判定'}</button>{result && tasks.length > 0 && <button className="btn btn-ghost" onClick={() => setTaskIdx((taskIdx + 1) % tasks.length)}>{taskIdx + 1 >= tasks.length ? '再来一轮' : <><span>下一题</span> <ArrowRight size={14} aria-hidden /></>}</button>}</div>
  </div></div>
}
