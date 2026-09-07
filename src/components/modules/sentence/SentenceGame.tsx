import { useMemo, useState } from 'react'
import { useProgress } from '../../../store/progressStore'
import { SENTENCE_QUESTS } from '../../../data/sentences'
import type { SentenceQuest } from '../../../types'
import GameHud from '../../game/GameHud'

type Bucket = 'main' | 'clause' | 'modifier'

export default function SentenceGame() {
  const answer = useProgress((s) => s.answer)
  const passSentence = useProgress((s) => s.passSentence)

  const [qIndex, setQIndex] = useState(0)
  const [placed, setPlaced] = useState<Record<number, Bucket>>({})
  const [flashWrong, setFlashWrong] = useState<number | null>(null)
  const [picked, setPicked] = useState<number | null>(null)
  const [answered, setAnswered] = useState(false)
  const [done, setDone] = useState(false)

  const quest: SentenceQuest = SENTENCE_QUESTS[qIndex]

  // ---------- 拼图 ----------
  const segments = useMemo(() => {
    if (quest.type !== 'puzzle' || !quest.segments) return []
    const arr = quest.segments.map((s, i) => ({ ...s, idx: i }))
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }, [quest])

  const placeSeg = (idx: number, bucket: Bucket) => {
    if (placed[idx] !== undefined) return
    const seg = quest.segments![idx]
    if (seg.bucket === bucket) {
      const next = { ...placed, [idx]: bucket }
      setPlaced(next)
      const allPlaced = quest.segments!.every((s, i) => next[i] !== undefined)
      if (allPlaced) {
        answer({ module: 'sentence', correct: true, timeMs: 5000, medianMs: 8000 })
        passSentence()
        setTimeout(() => nextQuestion(), 900)
      }
    } else {
      setFlashWrong(idx)
      answer({ module: 'sentence', correct: false, timeMs: 5000, medianMs: 8000 })
      setTimeout(() => setFlashWrong(null), 500)
    }
  }

  // ---------- 翻译 ----------
  const onTranslate = (idx: number) => {
    if (answered) return
    const correct = idx === quest.answer
    setPicked(idx)
    setAnswered(true)
    answer({ module: 'sentence', correct, timeMs: 8000, medianMs: 10000 })
    setTimeout(() => {
      if (correct) {
        passSentence()
        nextQuestion()
      } else {
        setAnswered(false)
        setPicked(null)
      }
    }, correct ? 1300 : 1000)
  }

  const nextQuestion = () => {
    if (qIndex + 1 >= SENTENCE_QUESTS.length) setDone(true)
    else {
      setQIndex(qIndex + 1)
      setPlaced({})
      setPicked(null)
      setAnswered(false)
    }
  }

  const bucketNames: Record<Bucket, string> = { main: '主干', clause: '从句', modifier: '修饰成分' }
  const bucketCorrect = (b: Bucket) =>
    quest.type === 'puzzle' && quest.segments!.filter((s) => s.bucket === b).every((s, i) => {
      const realIdx = quest.segments!.findIndex((x) => x === s)
      return placed[realIdx] === b
    })

  if (done) {
    return (
      <div className="quiz-panel">
        <div className="card center">
          <div style={{ fontSize: 44 }}>🧩</div>
          <h2 className="mt8">拆解工坊全部完成！</h2>
          <p className="muted mt8">长难句拆解 + 翻译对战，你已经通关所有示例题。</p>
          <button className="btn btn-primary mt14" onClick={() => { setQIndex(0); setDone(false); setPlaced({}); }}>再来一轮</button>
        </div>
      </div>
    )
  }

  return (
    <div className="quiz-panel">
      <GameHud module="sentence" />
      <div className="card">
        <div className="card-title">
          {quest.type === 'puzzle' ? '🧩 长难句拼图' : '🔄 翻译对决'}
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)' }}>
            {qIndex + 1} / {SENTENCE_QUESTS.length}
          </span>
        </div>
        <div className="story-box" style={{ fontSize: 14.5 }}>{quest.sentence}</div>

        {quest.type === 'puzzle' && quest.segments && (
          <>
            <div className="chips">
              {segments.map((s) => (
                <div key={s.idx} className={`chip ${placed[s.idx] !== undefined ? 'placed' : ''} ${flashWrong === s.idx ? 'wrong-flash' : ''}`}>
                  {s.text}
                  {placed[s.idx] === undefined && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                      {(['main', 'clause', 'modifier'] as Bucket[]).map((b) => (
                        <button key={b} className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 6px' }} onClick={() => placeSeg(s.idx, b)}>
                          {bucketNames[b]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="buckets mt14">
              {(['main', 'clause', 'modifier'] as Bucket[]).map((b) => (
                <div key={b} className={`bucket ${bucketCorrect(b) ? 'correct' : ''}`}>
                  <h5>{bucketNames[b]}</h5>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {quest.segments!.filter((s, i) => placed[i] === b).map((s, i) => (
                      <span key={i} className="chip" style={{ pointerEvents: 'none' }}>{s.text}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {quest.type === 'translate' && (
          <>
            <div className="options mt14">
              {quest.options!.map((opt, i) => {
                let cls = 'option'
                if (answered) {
                  if (i === quest.answer) cls += ' correct'
                  else if (picked === i) cls += ' wrong'
                }
                return (
                  <button key={i} className={cls} disabled={answered} onClick={() => onTranslate(i)}>
                    {opt}
                  </button>
                )
              })}
            </div>
            {answered && picked === quest.answer && (
              <div className="explain-box">✅ {quest.explain}</div>
            )}
            {answered && picked !== quest.answer && (
              <div className="explain-box" style={{ background: 'rgba(234,67,53,0.08)' }}>
                ❌ {quest.explain}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
