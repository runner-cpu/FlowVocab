import { useState } from 'react'
import { useProgress } from '../../../store/progressStore'
import { CHAPTERS } from '../../../data/reading'
import type { Chapter, NarrativeChoice } from '../../../types'
import GameHud from '../../game/GameHud'

export default function ReadingGame() {
  const progress = useProgress((s) => s.progress)
  const answer = useProgress((s) => s.answer)
  const completeReading = useProgress((s) => s.completeReading)

  const [chapter, setChapter] = useState<Chapter | null>(null)
  const [nodeId, setNodeId] = useState<string | null>(null)
  const [quizChoice, setQuizChoice] = useState<NarrativeChoice | null>(null)
  const [quizPicked, setQuizPicked] = useState<number | null>(null)
  const [quizAnswered, setQuizAnswered] = useState(false)
  const [finished, setFinished] = useState(false)

  const narrative = progress?.narrative ?? {}

  const startChapter = (c: Chapter) => {
    setChapter(c)
    setNodeId(c.start)
    setQuizChoice(null)
    setQuizPicked(null)
    setQuizAnswered(false)
    setFinished(false)
  }

  const choose = (choice: NarrativeChoice) => {
    if (choice.quiz) {
      setQuizChoice(choice)
      setQuizPicked(null)
      setQuizAnswered(false)
    } else {
      goTo(choice.next)
    }
  }

  const answerQuiz = (idx: number) => {
    if (!quizChoice?.quiz || quizAnswered) return
    const correct = idx === quizChoice.quiz.answer
    setQuizPicked(idx)
    setQuizAnswered(true)
    answer({ module: 'reading', correct, timeMs: 10000, medianMs: 12000 })
    if (correct) {
      setTimeout(() => {
        goTo(quizChoice.next)
        setQuizChoice(null)
      }, 1200)
    }
  }

  const goTo = (next: string) => {
    if (!chapter) return
    if (next.startsWith('end')) {
      completeReading(chapter.id)
      setFinished(true)
      return
    }
    setNodeId(next)
  }

  // ---------- 章节选择 ----------
  if (!chapter) {
    return (
      <div className="quiz-panel">
        <GameHud module="reading" />
        <div className="card">
          <div className="card-title">📖 叙事副本 · 选章节</div>
          <p className="muted" style={{ fontSize: 13 }}>阅读剧情、在考点处作答，选择影响剧情走向。答案藏在上下文里。</p>
          <div className="grid mt14">
            {CHAPTERS.map((c) => {
              const done = !!narrative[c.id]
              return (
                <div key={c.id} className="module-card" onClick={() => startChapter(c)}>
                  <div className="m-icon">{done ? '✅' : '📖'}</div>
                  <div className="m-name">{c.title}</div>
                  <div className="m-desc">{c.intro.slice(0, 30)}…</div>
                  <div className="m-desc muted">{done ? '已通关 · 可重玩' : '未开始'}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ---------- 完成 ----------
  if (finished) {
    return (
      <div className="quiz-panel">
        <div className="card center">
          <div style={{ fontSize: 44 }}>🏆</div>
          <h2 className="mt8">本章完成！</h2>
          <p className="muted mt8">{chapter.nodes[nodeId ?? chapter.start]?.text}</p>
          <div className="mt14" style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => setChapter(null)}>返回章节列表</button>
            <button className="btn btn-ghost" onClick={() => startChapter(chapter)}>重新玩</button>
          </div>
        </div>
      </div>
    )
  }

  const node = chapter.nodes[nodeId ?? chapter.start]
  const endNode = nodeId?.startsWith('end')

  return (
    <div className="quiz-panel">
      <GameHud module="reading" />
      <div className="card">
        <div className="card-title">
          📖 {chapter.title}
          <button className="btn btn-ghost" style={{ marginLeft: 'auto', fontSize: 12, padding: '4px 10px' }} onClick={() => setChapter(null)}>退出</button>
        </div>
        <div className="story-box">{node.text}</div>

        {!quizChoice && !endNode && (
          <div className="mt14">
            {node.choices.map((c, i) => (
              <button key={i} className="story-choice" onClick={() => choose(c)}>
                {c.quiz ? '⚔️ ' : '➡️ '}{c.label}
              </button>
            ))}
          </div>
        )}

        {quizChoice?.quiz && (
          <div className="mt14">
            <div className="explain-box" style={{ background: 'rgba(234,67,53,0.08)' }}>
              <b>⚔️ 考点题：</b>{quizChoice.quiz.prompt}
            </div>
            <div className="options mt8">
              {quizChoice.quiz.options.map((opt, i) => {
                let cls = 'option'
                if (quizAnswered) {
                  if (i === quizChoice.quiz!.answer) cls += ' correct'
                  else if (quizPicked === i) cls += ' wrong'
                }
                return (
                  <button key={i} className={cls} disabled={quizAnswered} onClick={() => answerQuiz(i)}>
                    {opt}
                  </button>
                )
              })}
            </div>
            {quizAnswered && quizPicked !== quizChoice.quiz.answer && (
              <div className="explain-box">💡 {quizChoice.quiz.explain}</div>
            )}
          </div>
        )}

        {endNode && (
          <div className="mt14 center">
            <button className="btn btn-primary" onClick={() => setChapter(null)}>返回章节列表</button>
          </div>
        )}
      </div>
    </div>
  )
}
