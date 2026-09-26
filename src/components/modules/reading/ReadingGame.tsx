import { useEffect, useRef, useState } from 'react'
import { elapsedSince } from '../../../engine/sessionTiming'
import { useProgress } from '../../../store/progressStore'
import { CHAPTERS } from '../../../data/reading'
import type { Chapter, NarrativeChoice } from '../../../types'
import GameHud from '../../game/GameHud'

export default function ReadingGame() {
  const progress = useProgress((state) => state.progress)
  const answer = useProgress((state) => state.answer)
  const completeReading = useProgress((state) => state.completeReading)
  const [chapter, setChapter] = useState<Chapter | null>(null)
  const [nodeId, setNodeId] = useState<string | null>(null)
  const [trail, setTrail] = useState<string[]>([])
  const [quizChoice, setQuizChoice] = useState<NarrativeChoice | null>(null)
  const [quizPicked, setQuizPicked] = useState<number | null>(null)
  const [quizAnswered, setQuizAnswered] = useState(false)
  const [finished, setFinished] = useState(false)
  const startedAt = useRef(performance.now())
  const narrative = progress?.narrative ?? {}
  useEffect(() => { startedAt.current = performance.now() }, [chapter?.id, nodeId, quizChoice?.next])

  function startChapter(nextChapter: Chapter) { setChapter(nextChapter); setNodeId(nextChapter.start); setTrail([nextChapter.start]); setQuizChoice(null); setQuizPicked(null); setQuizAnswered(false); setFinished(false) }
  function goTo(next: string) {
    if (!chapter) return
    setTrail((current) => [...current, next])
    if (next.startsWith('end')) { void completeReading(chapter.id); setFinished(true) } else setNodeId(next)
  }
  function choose(choice: NarrativeChoice) { if (choice.quiz) { setQuizChoice(choice); setQuizPicked(null); setQuizAnswered(false) } else goTo(choice.next) }
  function answerQuiz(index: number) {
    if (!quizChoice?.quiz || quizAnswered) return
    const correct = index === quizChoice.quiz.answer
    setQuizPicked(index); setQuizAnswered(true); void answer({ module: 'reading', correct, timeMs: elapsedSince(startedAt.current, performance.now()) })
    if (correct) window.setTimeout(() => { goTo(quizChoice.next); setQuizChoice(null) }, 1200)
  }

  if (!chapter) return <div className="quiz-panel"><GameHud module="reading" /><div className="card"><div className="card-title">📖 叙事剧本 · 章节地图</div><p className="muted">阅读原故事，在考点处作答；地图会保留你的章节通关轨迹。</p><div className="chapter-map mt14">{CHAPTERS.map((candidate, index) => { const done = !!narrative[candidate.id]; return <button key={candidate.id} className={`chapter-stop ${done ? 'done' : ''}`} onClick={() => startChapter(candidate)}><span>{done ? '✓' : index + 1}</span><strong>{candidate.title}</strong><small>{done ? '已通关 · 可重玩' : candidate.intro.slice(0, 36) + '…'}</small></button> })}</div></div></div>

  if (finished) return <div className="quiz-panel"><div className="card center"><div style={{ fontSize: 44 }}>🏆</div><h2>本章完成！</h2><div className="reading-trail compact">{trail.map((step, index) => <span key={`${step}-${index}`}>{index + 1}</span>)}</div><div className="guide-actions mt14"><button className="btn btn-primary" onClick={() => setChapter(null)}>返回章节地图</button><button className="btn btn-ghost" onClick={() => startChapter(chapter)}>重新探索</button></div></div></div>

  const node = chapter.nodes[nodeId ?? chapter.start]
  return <div className="quiz-panel"><GameHud module="reading" /><div className="card"><div className="card-title">📖 {chapter.title}<button className="btn btn-ghost" style={{ marginLeft: 'auto' }} onClick={() => setChapter(null)}>退出</button></div><div className="reading-map-bar"><span>进度轨迹</span><div className="reading-trail">{trail.map((step, index) => <span key={`${step}-${index}`} className={step === nodeId ? 'current' : ''}>{index + 1}</span>)}</div></div><div className="story-box">{node.text}</div>
    {!quizChoice && <div className="mt14">{node.choices.map((choice, index) => <button key={index} className="story-choice" onClick={() => choose(choice)}>{choice.quiz ? '⚔️ ' : '➡️ '}{choice.label}</button>)}</div>}
    {quizChoice?.quiz && <div className="mt14"><div className="explain-box"><b>⚔️ 考点题：</b>{quizChoice.quiz.prompt}</div><div className="options mt8">{quizChoice.quiz.options.map((option, index) => { let className = 'option'; if (quizAnswered) { if (index === quizChoice.quiz!.answer) className += ' correct'; else if (quizPicked === index) className += ' wrong' } return <button key={option} className={className} disabled={quizAnswered} onClick={() => answerQuiz(index)}>{option}</button> })}</div>{quizAnswered && quizPicked !== quizChoice.quiz.answer && <div className="explain-box">💡 {quizChoice.quiz.explain}<div className="mt8"><button className="btn btn-ghost" onClick={() => { setQuizPicked(null); setQuizAnswered(false) }}>重新作答</button></div></div>}</div>}
  </div></div>
}
