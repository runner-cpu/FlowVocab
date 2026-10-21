import { useEffect, useMemo, useRef, useState } from 'react'
import { Puzzle, Wrench } from 'lucide-react'
import { elapsedSince } from '../../../engine/sessionTiming'
import { useProgress } from '../../../store/progressStore'
import { SENTENCE_QUESTS } from '../../../data/sentences'
import { itemsForTrack } from '../../../data/curriculum'
import { useUI } from '../../../store/gameStore'
import type { SentenceQuest } from '../../../types'
import GameHud from '../../game/GameHud'
import ErrorCard from '../../game/ErrorCard'
import { useChapterResult } from '../../game/ChapterShell'
import { inferErrorTag, type ErrorTag } from '../../../engine/errorRouting'
import { displayOptions } from '../../../engine/optionOrder'
import { useOptionKeyboard } from '../../../hooks/useOptionKeyboard'

export type Bucket = 'main' | 'clause' | 'modifier'

export function placeSentenceSegment(segments: { bucket: Bucket }[], placed: Record<number, Bucket>, index: number, bucket: Bucket) {
  if (placed[index] !== undefined || segments[index]?.bucket !== bucket) return { placed, correct: false, complete: false }
  const next = { ...placed, [index]: bucket }
  return { placed: next, correct: true, complete: segments.every((_, segmentIndex) => next[segmentIndex] !== undefined) }
}

/** 片段打乱后必须真的打乱：若正好还是原文顺序，拼图一开始就是答案。 */
export function shuffledSegments<T extends { bucket: Bucket }>(segments: T[], random: () => number = Math.random): (T & { idx: number })[] {
  const result = segments.map((segment, index) => ({ ...segment, idx: index }))
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  const solved = result.every((segment, position) => segment.idx === position)
  if (solved && result.length > 1) {
    // 保底：把首尾对调，顺序必然与原文不同，同时保留原有的随机性。
    ;[result[0], result[result.length - 1]] = [result[result.length - 1], result[0]]
  }
  return result
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
  // 答错后旁路渲染的离线错因卡：错放桶或错选译文时出现，撤回/重置/下一题/换路线即卸载。
  const [errorCard, setErrorCard] = useState<{ tag: ErrorTag; chosen?: string; correctAnswer?: string; explain?: string } | null>(null)
  const chapterResult = useChapterResult()
  /** 本次进入模块的累计成绩，够门槛才交给章节壳结算。 */
  const tally = useRef({ total: 0, correct: 0 })
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
    setErrorCard(null)
    startedAt.current = performance.now()
    puzzleMistake.current = false
    return () => {
      if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current)
      if (flashTimer.current !== null) window.clearTimeout(flashTimer.current)
      advanceTimer.current = null
      flashTimer.current = null
    }
  }, [track])

  // 从错题回顾回到句子模块时，直接跳到那道题，而不是从第一题重新开始。
  const reviewTarget = useUI((state) => state.reviewTarget)
  const consumeReviewTarget = useUI((state) => state.consumeReviewTarget)
  useEffect(() => {
    if (!reviewTarget || reviewTarget.module !== 'sentence') return
    const index = quests.findIndex((candidate) => candidate.id === reviewTarget.contentId)
    consumeReviewTarget()
    if (index < 0) return
    setQIndex(index)
    setDone(false)
    setPlaced({})
    setPreviousPlaced(null)
    setPicked(null)
    setDragged(null)
    setFlashWrong(null)
    setAnnouncement('')
    setAnswerPicked(null)
    setAnswered(false)
    setErrorCard(null)
    puzzleMistake.current = false
    startedAt.current = performance.now()
  }, [reviewTarget, quests, consumeReviewTarget])

  const segments = useMemo(() => {
    if (!quest || quest.type !== 'puzzle' || !quest.segments) return []
    return shuffledSegments(quest.segments, Math.random)
  }, [quest])

  function resetPuzzle(message = '已重置本题') { setPlaced({}); setPreviousPlaced(null); setPicked(null); setDragged(null); setAnnouncement(message); setErrorCard(null) }
  function nextQuestion() {
    if (qIndex + 1 >= quests.length) setDone(true)
    else { setQIndex((index) => index + 1); resetPuzzle(''); setAnswerPicked(null); setAnswered(false); setErrorCard(null) }
  }
  function placeSeg(index: number, bucket: Bucket) {
    if (!quest?.segments) return
    const result = placeSentenceSegment(quest.segments, placed, index, bucket)
    setPicked(null); setDragged(null)
    if (!result.correct) {
      // 拼图题没有 explain 文本，只传可得字段；规则卡仍按同一离线规则渲染。
      setErrorCard({ tag: inferErrorTag({ module: 'sentence', sentence: quest.sentence, options: quest.options, chosen: bucketNames[bucket], correctAnswer: bucketNames[quest.segments[index].bucket] }), chosen: bucketNames[bucket], correctAnswer: bucketNames[quest.segments[index].bucket] })
      setFlashWrong(index); setAnnouncement(`位置不对，${quest.segments[index].text} 仍在待选区`)
      puzzleMistake.current = true
      flashTimer.current = window.setTimeout(() => { flashTimer.current = null; setFlashWrong(null) }, 500); return
    }
    setErrorCard(null)
    setPreviousPlaced(placed); setPlaced(result.placed); setAnnouncement(`${quest.segments[index].text} 已放入${bucketNames[bucket]}`)
    if (result.complete) {
      const correct = !puzzleMistake.current
      // 拼图是「整句拆对」才算一题：答错记一条，答对把同一条移出。
      const tag = inferErrorTag({ module: 'sentence', sentence: quest.sentence, options: quest.options })
      void answer({
        module: 'sentence',
        correct,
        timeMs: elapsedSince(startedAt.current, performance.now()),
        mistake: {
          module: 'sentence',
          contentId: quest.id,
          prompt: quest.sentence,
          tag,
          explain: quest.explain
        }
      })
      void passSentence(quest.id)
      tally.current = { total: tally.current.total + 1, correct: tally.current.correct + (correct ? 1 : 0) }
      // 拼图题没有“下一题”按钮，必须在这里就把成绩交给章节壳，否则拼图路线永远不结算。
      chapterResult.report(tally.current.total, tally.current.correct)
      advanceTimer.current = window.setTimeout(() => { advanceTimer.current = null; nextQuestion() }, 900)
    }
  }
  function onTranslate(displayIndex: number) {
    if (!quest || answered) return
    const option = translateView[displayIndex]
    if (!option) return
    const index = option.sourceIndex
    const correct = index === quest.answer
    setAnswerPicked(index); setAnswered(true)
    // 答错时按同一离线规则给出错因卡；答对立即清空，保证最多一张。
    const tag = inferErrorTag({ module: 'sentence', sentence: quest.sentence, options: quest.options, chosen: quest.options?.[index], correctAnswer: quest.answer !== undefined ? quest.options?.[quest.answer] : undefined, explain: quest.explain })
    setErrorCard(correct ? null : { tag, chosen: quest.options?.[index], correctAnswer: quest.answer !== undefined ? quest.options?.[quest.answer] : undefined, explain: quest.explain })
    void answer({
      module: 'sentence',
      correct,
      timeMs: elapsedSince(startedAt.current, performance.now()),
      mistake: {
        module: 'sentence',
        contentId: quest.id,
        prompt: quest.sentence,
        chosen: quest.options?.[index],
        correctAnswer: quest.answer !== undefined ? quest.options?.[quest.answer] : undefined,
        tag,
        explain: quest.explain
      }
    })
    tally.current = { total: tally.current.total + 1, correct: tally.current.correct + (correct ? 1 : 0) }
    advanceTimer.current = window.setTimeout(() => {
      advanceTimer.current = null
      if (correct) { void passSentence(quest.id); chapterResult.report(tally.current.total, tally.current.correct); nextQuestion() } else { setAnswered(false); setAnswerPicked(null); setErrorCard(null) }
    }, correct ? 1300 : 1000)
  }
  const bucketCorrect = (bucket: Bucket) => quest?.type === 'puzzle' && quest.segments!.filter((segment) => segment.bucket === bucket).every((segment) => placed[quest.segments!.findIndex((candidate) => candidate === segment)] === bucket)
  // 译文选项按题目 id 重排，避免正确译文长期固定在第一位。
  const translateView = useMemo(
    () => (quest?.type === 'translate' && quest.options ? displayOptions(quest.options, quest.answer ?? 0, quest.id) : []),
    [quest]
  )
  const translateOptions = translateView
  // 翻译对决是标准选择题：数字键选译文，答错后 Enter 重新作答（答对会自动进入下一题）。
  useOptionKeyboard({
    enabled: !!quest && quest.type === 'translate' && !done,
    count: translateOptions.length,
    onPick: onTranslate,
    onConfirm: answered && answerPicked !== quest?.answer ? () => { setAnswered(false); setAnswerPicked(null); setErrorCard(null) } : undefined
  })
  if (!quest && !done) return <div className="quiz-panel"><div className="card center"><h2>当前路线暂无句子练习</h2><p className="muted">请切换学习路线后重试。</p></div></div>

  if (done) return <div className="quiz-panel"><div className="card center"><Puzzle size={44} aria-hidden /><h2 className="mt8">桥梁工坊全部完成！</h2><p className="muted mt8">长难句拆解与翻译对决已经全部通关。</p><button className="btn btn-primary mt14" onClick={() => { setQIndex(0); setDone(false); resetPuzzle('') }}>再来一轮</button></div></div>

  return <div className="quiz-panel"><GameHud module="sentence" /><div className="card">
    <div className="card-title">{quest.type === 'puzzle' ? <><Puzzle size={16} aria-hidden /> 长难句拼图</> : <><Wrench size={16} aria-hidden /> 翻译对决</>}<span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)' }}>{qIndex + 1} / {quests.length}</span></div>
    <div className="story-box" style={{ fontSize: 14.5 }}>{quest.sentence}</div>
    {quest.type === 'translate' && quest.prompt && <p className="muted mt8">{quest.prompt}</p>}
    {quest.type === 'puzzle' && quest.segments && <>
      <div className="chips segment-pool">{segments.map((segment) => <button type="button" key={segment.idx} draggable={placed[segment.idx] === undefined} disabled={placed[segment.idx] !== undefined} aria-pressed={picked === segment.idx} onDragStart={() => setDragged(segment.idx)} onDragEnd={() => setDragged(null)} onClick={() => setPicked(picked === segment.idx ? null : segment.idx)} className={`chip segment-chip ${picked === segment.idx ? 'picked' : ''} ${placed[segment.idx] !== undefined ? 'placed' : ''} ${flashWrong === segment.idx ? 'wrong-flash' : ''}`}>{segment.text}</button>)}</div>
      <p className="muted interaction-hint">拖动片段，或先点选片段再选择目标区域。</p>
      <div className="buckets mt14">{(['main', 'clause', 'modifier'] as Bucket[]).map((bucket) => <div key={bucket} className={`bucket ${bucketCorrect(bucket) ? 'correct' : ''}`} role="button" tabIndex={0} aria-label={`将选中片段放入${bucketNames[bucket]}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (dragged !== null) placeSeg(dragged, bucket) }} onClick={() => { if (picked !== null) placeSeg(picked, bucket) }} onKeyDown={(event) => { if ((event.key === 'Enter' || event.key === ' ') && picked !== null) { event.preventDefault(); placeSeg(picked, bucket) } }}><h5>{bucketNames[bucket]}</h5><div className="bucket-content">{quest.segments!.filter((_, index) => placed[index] === bucket).map((segment, index) => <span key={index} className="chip">{segment.text}</span>)}</div></div>)}</div>
      <div className="interaction-actions"><button className="btn btn-ghost" disabled={previousPlaced === null} onClick={() => { if (previousPlaced !== null) { setPlaced(previousPlaced); setPreviousPlaced(null); setAnnouncement('已撤回上一步'); setErrorCard(null) } }}>撤回上一步</button><button className="btn btn-ghost" onClick={() => resetPuzzle()}>重置本题</button></div>{errorCard && <ErrorCard tag={errorCard.tag} chosen={errorCard.chosen} correctAnswer={errorCard.correctAnswer} explain={errorCard.explain} onDismiss={() => setErrorCard(null)} />}<p className="sr-only" aria-live="polite">{announcement}</p>
    </>}
    {quest.type === 'translate' && <><div className="options mt14">{translateView.map((option, index) => { let className = 'option'; if (answered) { if (option.correct) className += ' correct'; else if (answerPicked === option.sourceIndex) className += ' wrong' } return <button key={option.text} className={className} disabled={answered} onClick={() => onTranslate(index)}><kbd aria-hidden="true">{index + 1}</kbd><span>{option.text}</span></button> })}</div>{answered && <div className="explain-box">{quest.explain}</div>}{errorCard && <ErrorCard tag={errorCard.tag} chosen={errorCard.chosen} correctAnswer={errorCard.correctAnswer} explain={errorCard.explain} onDismiss={() => setErrorCard(null)} />}<p className="interaction-hint muted mt8">{answered ? (answerPicked === quest.answer ? '答对了，正在进入下一题…' : 'Enter 重新作答') : `数字键 1–${translateView.length} 选择译文`}</p></>}
  </div></div>
}
