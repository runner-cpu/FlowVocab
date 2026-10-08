import { useEffect, useMemo, useRef, useState } from 'react'
import { elapsedSince } from '../../../engine/sessionTiming'
import { useProgress } from '../../../store/progressStore'
import { SENTENCE_QUESTS } from '../../../data/sentences'
import { itemsForTrack } from '../../../data/curriculum'
import { useUI } from '../../../store/gameStore'
import type { SentenceQuest } from '../../../types'
import GameHud from '../../game/GameHud'

export type Bucket = 'main' | 'clause' | 'modifier'

export function placeSentenceSegment(segments: { bucket: Bucket }[], placed: Record<number, Bucket>, index: number, bucket: Bucket) {
  if (placed[index] !== undefined || segments[index]?.bucket !== bucket) return { placed, correct: false, complete: false }
  const next = { ...placed, [index]: bucket }
  return { placed: next, correct: true, complete: segments.every((_, segmentIndex) => next[segmentIndex] !== undefined) }
}

const bucketNames: Record<Bucket, string> = { main: '主干', clause: '从句', modifier: '修饰成分' }

export default function SentenceGame() {
  const track = useUI((state) => state.track)
  const quests = useMemo(() => itemsForTrack(track, 'sentence', SENTENCE_QUESTS), [track])
  const answer = useProgress((state) => state.answer)
  const passSentence = useProgress((state) => state.passSentence)
  const [qIndex, setQIndex] = useState(0)
  const [placed, setPlaced] = useState<Record<number, Bucket>>({})
  const [previousPlaced, setPreviousPlaced] = useState<Record<number, Bucket> | null>(null)
  const [picked, setPicked] = useState<number | null>(null)
  const [dragged, setDragged] = useState<number | null>(null)
  const [flashWrong, setFlashWrong] = useState<number | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [answerPicked, setAnswerPicked] = useState<number | null>(null)
  const [answered, setAnswered] = useState(false)
  const [done, setDone] = useState(false)
  const startedAt = useRef(performance.now())
  const puzzleMistake = useRef(false)
  const quest = quests[qIndex]
  const advanceTimer = useRef<number | null>(null)
  const flashTimer = useRef<number | null>(null)
  useEffect(() => { startedAt.current = performance.now(); puzzleMistake.current = false }, [qIndex])
  useEffect(() => {
    if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current)
    if (flashTimer.current !== null) window.clearTimeout(flashTimer.current)
    advanceTimer.current = null
    flashTimer.current = null
    setQIndex(0)
    setPlaced({})
    setPreviousPlaced(null)
    setPicked(null)
    setDragged(null)
    setFlashWrong(null)
    setAnnouncement('')
    setAnswerPicked(null)
    setAnswered(false)
    setDone(false)
    startedAt.current = performance.now()
    puzzleMistake.current = false
    return () => {
      if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current)
      if (flashTimer.current !== null) window.clearTimeout(flashTimer.current)
      advanceTimer.current = null
      flashTimer.current = null
    }
  }, [track])

  const segments = useMemo(() => {
    if (!quest || quest.type !== 'puzzle' || !quest.segments) return []
    const result = quest.segments.map((segment, index) => ({ ...segment, idx: index }))
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[result[i], result[j]] = [result[j], result[i]]
    }
    return result
  }, [quest])

  function resetPuzzle(message = '已重置本题') { setPlaced({}); setPreviousPlaced(null); setPicked(null); setDragged(null); setAnnouncement(message) }
  function nextQuestion() {
    if (qIndex + 1 >= quests.length) setDone(true)
    else { setQIndex((index) => index + 1); resetPuzzle(''); setAnswerPicked(null); setAnswered(false) }
  }
  function placeSeg(index: number, bucket: Bucket) {
    if (!quest?.segments) return
    const result = placeSentenceSegment(quest.segments, placed, index, bucket)
    setPicked(null); setDragged(null)
    if (!result.correct) {
      setFlashWrong(index); setAnnouncement(`位置不对，${quest.segments[index].text} 仍在待选区`)
      puzzleMistake.current = true
      flashTimer.current = window.setTimeout(() => { flashTimer.current = null; setFlashWrong(null) }, 500); return
    }
    setPreviousPlaced(placed); setPlaced(result.placed); setAnnouncement(`${quest.segments[index].text} 已放入${bucketNames[bucket]}`)
    if (result.complete) { void answer({ module: 'sentence', correct: !puzzleMistake.current, timeMs: elapsedSince(startedAt.current, performance.now()) }); void passSentence(quest.id); advanceTimer.current = window.setTimeout(() => { advanceTimer.current = null; nextQuestion() }, 900) }
  }
  function onTranslate(index: number) {
    if (!quest || answered) return
    const correct = index === quest.answer
    setAnswerPicked(index); setAnswered(true)
    void answer({ module: 'sentence', correct, timeMs: elapsedSince(startedAt.current, performance.now()) })
    advanceTimer.current = window.setTimeout(() => {
      advanceTimer.current = null
      if (correct) { void passSentence(quest.id); nextQuestion() } else { setAnswered(false); setAnswerPicked(null) }
    }, correct ? 1300 : 1000)
  }
  const bucketCorrect = (bucket: Bucket) => quest?.type === 'puzzle' && quest.segments!.filter((segment) => segment.bucket === bucket).every((segment) => placed[quest.segments!.findIndex((candidate) => candidate === segment)] === bucket)
  if (!quest && !done) return <div className="quiz-panel"><div className="card center"><h2>当前路线暂无句子练习</h2><p className="muted">请切换学习路线后重试。</p></div></div>

  if (done) return <div className="quiz-panel"><div className="card center"><div style={{ fontSize: 44 }}>🧩</div><h2 className="mt8">拆解工坊全部完成！</h2><p className="muted mt8">长难句拆解与翻译对决已经全部通关。</p><button className="btn btn-primary mt14" onClick={() => { setQIndex(0); setDone(false); resetPuzzle('') }}>再来一轮</button></div></div>

  return <div className="quiz-panel"><GameHud module="sentence" /><div className="card">
    <div className="card-title">{quest.type === 'puzzle' ? '🧩 长难句拼图' : '🔧 翻译对决'}<span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)' }}>{qIndex + 1} / {quests.length}</span></div>
    <div className="story-box" style={{ fontSize: 14.5 }}>{quest.sentence}</div>
    {quest.type === 'puzzle' && quest.segments && <>
      <div className="chips segment-pool">{segments.map((segment) => <button type="button" key={segment.idx} draggable={placed[segment.idx] === undefined} disabled={placed[segment.idx] !== undefined} aria-pressed={picked === segment.idx} onDragStart={() => setDragged(segment.idx)} onDragEnd={() => setDragged(null)} onClick={() => setPicked(picked === segment.idx ? null : segment.idx)} className={`chip segment-chip ${picked === segment.idx ? 'picked' : ''} ${placed[segment.idx] !== undefined ? 'placed' : ''} ${flashWrong === segment.idx ? 'wrong-flash' : ''}`}>{segment.text}</button>)}</div>
      <p className="muted interaction-hint">拖动片段，或先点选片段再选择目标区域。</p>
      <div className="buckets mt14">{(['main', 'clause', 'modifier'] as Bucket[]).map((bucket) => <div key={bucket} className={`bucket ${bucketCorrect(bucket) ? 'correct' : ''}`} role="button" tabIndex={0} aria-label={`将选中片段放入${bucketNames[bucket]}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (dragged !== null) placeSeg(dragged, bucket) }} onClick={() => { if (picked !== null) placeSeg(picked, bucket) }} onKeyDown={(event) => { if ((event.key === 'Enter' || event.key === ' ') && picked !== null) { event.preventDefault(); placeSeg(picked, bucket) } }}><h5>{bucketNames[bucket]}</h5><div className="bucket-content">{quest.segments!.filter((_, index) => placed[index] === bucket).map((segment, index) => <span key={index} className="chip">{segment.text}</span>)}</div></div>)}</div>
      <div className="interaction-actions"><button className="btn btn-ghost" disabled={previousPlaced === null} onClick={() => { if (previousPlaced !== null) { setPlaced(previousPlaced); setPreviousPlaced(null); setAnnouncement('已撤回上一步') } }}>撤回上一步</button><button className="btn btn-ghost" onClick={() => resetPuzzle()}>重置本题</button></div><p className="sr-only" aria-live="polite">{announcement}</p>
    </>}
    {quest.type === 'translate' && <><div className="options mt14">{quest.options!.map((option, index) => { let className = 'option'; if (answered) { if (index === quest.answer) className += ' correct'; else if (answerPicked === index) className += ' wrong' } return <button key={index} className={className} disabled={answered} onClick={() => onTranslate(index)}>{option}</button> })}</div>{answered && <div className="explain-box">{quest.explain}</div>}</>}
  </div></div>
}
