import { useEffect, useMemo, useRef, useState } from 'react'
import { useProgress } from '../../../store/progressStore'
import { ensureWordBank, getWordPool, buildVocabOptions } from '../../../store/wordBank'
import type { Word } from '../../../types'
import GameHud from '../../game/GameHud'

const ROUND_TARGET = 30
const MEDIAN_MS = 4500

export default function VocabGame() {
  const difficulty = useProgress((s) => s.difficulty)
  const userWords = useProgress((s) => s.userWords)
  const answer = useProgress((s) => s.answer)

  const [current, setCurrent] = useState<Word | null>(null)
  const [options, setOptions] = useState<{ text: string; correct: boolean }[]>([])
  const [answered, setAnswered] = useState(false)
  const [picked, setPicked] = useState<number | null>(null)
  const [round, setRound] = useState(0)
  const [done, setDone] = useState(false)
  const [bankReady, setBankReady] = useState(false)
  const t0 = useRef(0)
  const used = useRef<Set<string>>(new Set())

  const level = difficulty.level

  const nextWord = useMemo(() => {
    // 供 pickNext 使用
    return () => {
      const pool = getWordPool(level)
      const candidates = pool.filter((w) => {
        if (used.current.has(w.id)) return false
        const uw = userWords.find((u) => u.wordId === w.id)
        return !uw || uw.status !== 'mastered' || uw.nextReview <= Date.now()
      })
      const source = candidates.length > 0 ? candidates : pool.filter((w) => !used.current.has(w.id))
      if (source.length === 0) return null
      const w = source[Math.floor(Math.random() * source.length)]
      used.current.add(w.id)
      return w
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, userWords])

  const loadNext = () => {
    const w = nextWord()
    if (!w) {
      setDone(true)
      return
    }
    setCurrent(w)
    setOptions(buildVocabOptions(w, getWordPool(level)))
    setAnswered(false)
    setPicked(null)
    t0.current = performance.now()
  }

  useEffect(() => {
    ensureWordBank().then(() => {
      setBankReady(true)
      loadNext()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!bankReady) {
    return (
      <div className="quiz-panel">
        <GameHud module="vocab" />
        <div className="card center">
          <div style={{ fontSize: 44 }}>⚔️</div>
          <h2 className="mt8">正在装载词库…</h2>
          <p className="muted mt8">首次加载约 1.3 万词（CET4+CET6），导入后离线可用。</p>
        </div>
      </div>
    )
  }

  const onPick = (idx: number, opt: { text: string; correct: boolean }) => {
    if (answered) return
    const timeMs = performance.now() - t0.current
    setPicked(idx)
    setAnswered(true)
    answer({ module: 'vocab', wordId: current!.id, correct: opt.correct, timeMs, medianMs: MEDIAN_MS })
    setTimeout(() => {
      const r = round + 1
      setRound(r)
      if (r >= ROUND_TARGET) setDone(true)
      else loadNext()
    }, 1300)
  }

  if (done) {
    return (
      <div className="quiz-panel">
        <div className="card center">
          <div style={{ fontSize: 44 }}>⚔️</div>
          <h2 className="mt8">本轮词魂战场结束！</h2>
          <p className="muted mt8">你完成了 {ROUND_TARGET} 题的节奏打击。回首页看看星球能量吧！</p>
          <button className="btn btn-primary mt14" onClick={() => { used.current.clear(); setDone(false); setRound(0); loadNext() }}>
            再来一轮
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="quiz-panel">
      <GameHud module="vocab" />
      <div className="card">
        <div className="word-display">
          <div className="w-word">{current?.word}</div>
          <div className="w-phonetic">{current?.phonetic}</div>
          <div className="w-pos">{current?.pos}</div>
        </div>
        <div className="options">
          {options.map((opt, i) => {
            let cls = 'option'
            if (answered) {
              if (opt.correct) cls += ' correct'
              else if (picked === i) cls += ' wrong'
            }
            return (
              <button key={i} className={cls} disabled={answered} onClick={() => onPick(i, opt)}>
                {opt.text}
              </button>
            )
          })}
        </div>
        {answered && current && (
          <div className="explain-box">
            <b>{current.word}</b> {current.meaning}
            <div className="ex-eg">💬 {current.example}</div>
            <div className="ex-eg muted">{current.exampleCn}</div>
          </div>
        )}
        <div className="progress-strip mt14">
          <span>第 {Math.min(round + 1, ROUND_TARGET)} / {ROUND_TARGET} 题</span>
        </div>
      </div>
    </div>
  )
}
