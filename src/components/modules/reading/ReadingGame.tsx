import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Lightbulb, Swords, Trophy, ArrowRight, BookOpenText } from 'lucide-react'
import { elapsedSince } from '../../../engine/sessionTiming'
import { useProgress } from '../../../store/progressStore'
import { CHAPTERS } from '../../../data/reading'
import { itemsForTrack } from '../../../data/curriculum'
import { useUI } from '../../../store/gameStore'
import type { Chapter, NarrativeChoice } from '../../../types'
import GameHud from '../../game/GameHud'
import { useChapterResult } from '../../game/ChapterShell'
import RoadmapNote from '../../game/RoadmapNote'
import ResponsiveSceneImage from '../../ui/ResponsiveSceneImage'
import { readingArtFor } from '../../../data/readingArt'
import { useOptionKeyboard } from '../../../hooks/useOptionKeyboard'
import { inferErrorTag } from '../../../engine/errorRouting'
import { displayOptions } from '../../../engine/optionOrder'

export default function ReadingGame() {
  const track = useUI((state) => state.track)
  const chapters = useMemo(() => itemsForTrack(track, 'reading', CHAPTERS), [track])
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
  const chapterResult = useChapterResult()
  /** 本次进入模块的累计成绩，够门槛才交给章节壳结算。 */
  const tally = useRef({ total: 0, correct: 0 })
  const startedAt = useRef(performance.now())
  const advanceTimer = useRef<number | null>(null)
  const narrative = progress?.narrative ?? {}
  useEffect(() => { startedAt.current = performance.now() }, [chapter?.id, nodeId, quizChoice?.next])
  useEffect(() => {
    if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current)
    advanceTimer.current = null
    setChapter(null)
    setNodeId(null)
    setTrail([])
    setQuizChoice(null)
    setQuizPicked(null)
    setQuizAnswered(false)
    setFinished(false)
    tally.current = { total: 0, correct: 0 }
    startedAt.current = performance.now()
    return () => {
      if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current)
      advanceTimer.current = null
    }
  }, [track])

  // 从错题回顾回到阅读模块时，直接落回出题的那一章节点，并把考点题重新摆出来。
  const reviewTarget = useUI((state) => state.reviewTarget)
  const consumeReviewTarget = useUI((state) => state.consumeReviewTarget)
  useEffect(() => {
    if (!reviewTarget || reviewTarget.module !== 'reading') return
    const [chapterId, targetNodeId] = reviewTarget.contentId.split(':')
    const target = chapters.find((candidate) => candidate.id === chapterId)
    consumeReviewTarget()
    if (!target) return
    const nodeKey = targetNodeId && target.nodes[targetNodeId] ? targetNodeId : target.start
    const choice = target.nodes[nodeKey]?.choices.find((candidate) => candidate.quiz)
    if (!choice) return
    setChapter(target)
    setNodeId(nodeKey)
    setTrail([nodeKey])
    setQuizChoice(choice)
    setQuizPicked(null)
    setQuizAnswered(false)
    setFinished(false)
    startedAt.current = performance.now()
  }, [reviewTarget, chapters, consumeReviewTarget])

  function startChapter(nextChapter: Chapter) { setChapter(nextChapter); setNodeId(nextChapter.start); setTrail([nextChapter.start]); setQuizChoice(null); setQuizPicked(null); setQuizAnswered(false); setFinished(false) }
  function goTo(next: string) {
    if (!chapter) return
    setTrail((current) => [...current, next])
    if (next.startsWith('end')) { void completeReading(chapter.id); setFinished(true); chapterResult.report(tally.current.total, tally.current.correct) } else setNodeId(next)
  }
  function choose(choice: NarrativeChoice) { if (choice.quiz) { setQuizChoice(choice); setQuizPicked(null); setQuizAnswered(false) } else goTo(choice.next) }
  // 考点题选项按章节 + 节点重排，避免正确项长期固定在第一位。
  const quizView = useMemo(
    () => (quizChoice?.quiz ? displayOptions(quizChoice.quiz.options, quizChoice.quiz.answer, `${chapter?.id ?? 'chapter'}:${nodeId ?? ''}:${quizChoice.next}`) : []),
    [quizChoice, chapter?.id, nodeId]
  )
  function answerQuiz(displayIndex: number) {
    if (!quizChoice?.quiz || quizAnswered || !chapter) return
    const quiz = quizChoice.quiz
    const option = quizView[displayIndex]
    if (!option) return
    const index = option.sourceIndex
    const correct = index === quiz.answer
    // 考点题的错因多为细节理解，统一走同一套离线规则；把章节与节点写进 contentId 便于回顾定位。
    const tag = inferErrorTag({ module: 'reading', prompt: quiz.prompt, options: quiz.options, chosen: quiz.options[index], correctAnswer: quiz.options[quiz.answer], explain: quiz.explain })
    setQuizPicked(index); setQuizAnswered(true)
    void answer({
      module: 'reading',
      correct,
      timeMs: elapsedSince(startedAt.current, performance.now()),
      mistake: {
        module: 'reading',
        contentId: `${chapter.id}:${nodeId ?? chapter.start}`,
        prompt: quiz.prompt,
        chosen: quiz.options[index],
        correctAnswer: quiz.options[quiz.answer],
        tag,
        explain: quiz.explain
      }
    })
    tally.current = { total: tally.current.total + 1, correct: tally.current.correct + (correct ? 1 : 0) }
    if (correct) {
      advanceTimer.current = window.setTimeout(() => {
        advanceTimer.current = null
        goTo(quizChoice.next)
        setQuizChoice(null)
      }, 1200)
    }
  }

  const quizOptions = quizView
  // 考点题是标准四选一：数字键作答，答错后 Enter 重来（答对会自动推进剧情）。
  useOptionKeyboard({
    enabled: !!quizChoice?.quiz && !quizAnswered,
    count: quizOptions.length,
    onPick: answerQuiz
  })

  if (!chapter) return <div className="quiz-panel"><GameHud module="reading" /><div className="card"><div className="card-title"><BookOpenText size={16} aria-hidden /> 故事图书馆 · 章节地图</div><p className="muted">阅读原故事，在考点处作答；地图会保留你的章节通关轨迹。</p>{chapters.length === 0 ? <p className="muted mt14">当前路线暂无阅读章节，请切换学习路线后重试。</p> : <div className="chapter-map mt14">{chapters.map((candidate, index) => { const done = !!narrative[candidate.id]; const art = readingArtFor(candidate.id); return <button key={candidate.id} className={`chapter-stop ${done ? 'done' : ''}`} onClick={() => startChapter(candidate)}><span className="chapter-stop-art">{art ? <ResponsiveSceneImage assetStem={art.stem} sizes="(max-width: 640px) 100vw, 220px" alt={art.alt} /> : null}<b className="chapter-stop-badge">{done ? <Check size={14} aria-hidden /> : index + 1}</b></span><strong>{candidate.title}</strong><small>{done ? '已通关 · 可重玩' : candidate.intro.slice(0, 36) + '…'}</small></button> })}</div>}<RoadmapNote module="reading" /></div></div>

  if (finished) return <div className="quiz-panel"><div className="card center"><Trophy size={44} aria-hidden /><h2>本章完成！</h2><div className="reading-trail compact">{trail.map((step, index) => <span key={`${step}-${index}`}>{index + 1}</span>)}</div><div className="guide-actions mt14"><button className="btn btn-primary" onClick={() => setChapter(null)}>返回章节地图</button><button className="btn btn-ghost" onClick={() => startChapter(chapter)}>重新探索</button></div></div></div>

  const node = chapter.nodes[nodeId ?? chapter.start] ?? chapter.nodes[chapter.start]
  if (!node) return <div className="quiz-panel"><div className="card center"><h2>本章内容暂不可用</h2><button className="btn btn-ghost mt14" onClick={() => setChapter(null)}>返回章节地图</button></div></div>
  return <div className="quiz-panel"><GameHud module="reading" /><div className="card"><div className="card-title"><BookOpenText size={16} aria-hidden /> {chapter.title}<button className="btn btn-ghost" style={{ marginLeft: 'auto' }} onClick={() => setChapter(null)}>退出</button></div>{readingArtFor(chapter.id) && <figure className="story-hero"><ResponsiveSceneImage assetStem={readingArtFor(chapter.id)!.stem} sizes="(max-width: 640px) 100vw, 800px" alt={readingArtFor(chapter.id)!.alt} /><figcaption>{chapter.intro}</figcaption></figure>}<div className="reading-map-bar"><span>进度轨迹</span><div className="reading-trail">{trail.map((step, index) => <span key={`${step}-${index}`} className={step === nodeId ? 'current' : ''}>{index + 1}</span>)}</div></div><div className="story-box">{node.text}</div>
    {!quizChoice && <div className="mt14">{node.choices.map((choice, index) => <button key={index} className="story-choice" onClick={() => choose(choice)}>{choice.quiz ? <Swords size={14} aria-hidden /> : <ArrowRight size={14} aria-hidden />} {choice.label}</button>)}</div>}
    {quizChoice?.quiz && <div className="mt14"><div className="explain-box"><b><Swords size={13} aria-hidden /> 考点题：</b>{quizChoice.quiz.prompt}</div><div className="options mt8">{quizView.map((option, index) => { let className = 'option'; if (quizAnswered) { if (option.correct) className += ' correct'; else if (quizPicked === option.sourceIndex) className += ' wrong' } return <button key={option.text} className={className} disabled={quizAnswered} onClick={() => answerQuiz(index)}><kbd aria-hidden="true">{index + 1}</kbd><span>{option.text}</span></button> })}</div>{!quizAnswered && <p className="interaction-hint muted mt8">数字键 1–{quizView.length} 选择答案</p>}{quizAnswered && quizPicked !== quizChoice.quiz.answer && <div className="explain-box"><Lightbulb size={14} aria-hidden /> {quizChoice.quiz.explain}<div className="mt8"><button className="btn btn-ghost" onClick={() => { setQuizPicked(null); setQuizAnswered(false) }}>重新作答</button></div></div>}</div>}
  </div></div>
}
