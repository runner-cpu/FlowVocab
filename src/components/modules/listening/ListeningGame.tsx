import { useEffect, useRef, useState } from 'react'
import { useProgress } from '../../../store/progressStore'
import { LISTENING_ITEMS } from '../../../data/listening'
import type { ListeningItem } from '../../../types'
import GameHud from '../../game/GameHud'

// ---------- 词级 Levenshtein ----------
function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      )
    }
  }
  return dp[m][n]
}

/** 原句词是否被读到：从左到右贪心对齐，Levenshtein ≤1 视为命中（容错拼写/时态） */
function alignWords(target: string[], spoken: string[]): boolean[] {
  const result = new Array(target.length).fill(false)
  let si = 0
  for (let ti = 0; ti < target.length; ti++) {
    for (let j = si; j < spoken.length; j++) {
      if (levenshtein(target[ti], spoken[j]) <= 1) {
        result[ti] = true
        si = j + 1
        break
      }
    }
  }
  return result
}

const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9']/g, '')

export default function ListeningGame() {
  const answer = useProgress((s) => s.answer)
  const passListening = useProgress((s) => s.passListening)

  const [qIndex, setQIndex] = useState(0)
  const [speaking, setSpeaking] = useState(false)
  const [listening, setListening] = useState(false)
  const [recognized, setRecognized] = useState<string>('')
  const [result, setResult] = useState<{ hits: boolean[]; ratio: number } | null>(null)
  const [done, setDone] = useState(false)
  // 降级模式（挖空选择）状态：无条件声明，遵守 Rules of Hooks
  const [picked, setPicked] = useState<Record<number, number>>({})
  const [answered, setAnswered] = useState(false)
  const t0 = useRef(0)
  const ttsSupport = useRef(typeof window !== 'undefined' && 'speechSynthesis' in window)
  const recRef = useRef<{ start: () => void; stop: () => void } | null>(null)

  const item: ListeningItem = LISTENING_ITEMS[qIndex]
  const targetWords = item.text.split(' ')

  // 探测语音识别可用性
  const [recSupport] = useState(() => {
    if (typeof window === 'undefined') return false
    const w = window as unknown as Record<string, unknown>
    return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition)
  })

  const speak = () => {
    if (!ttsSupport.current) return
    const u = new SpeechSynthesisUtterance(item.text)
    u.lang = 'en-US'
    u.rate = 0.85
    setSpeaking(true)
    u.onend = () => setSpeaking(false)
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  }

  useEffect(() => () => {
    if (ttsSupport.current) window.speechSynthesis.cancel()
    recRef.current?.stop()
  }, [])

  const startListen = () => {
    if (!recSupport) return
    const w = window as unknown as {
      SpeechRecognition?: new () => {
        lang: string
        interimResults: boolean
        continuous: boolean
        onresult: ((e: { results: { [k: number]: { 0: { transcript: string } } } }) => void) | null
        onend: (() => void) | null
        onerror: (() => void) | null
        start: () => void
        stop: () => void
      }
      webkitSpeechRecognition?: new () => {
        lang: string
        interimResults: boolean
        continuous: boolean
        onresult: ((e: { results: { [k: number]: { 0: { transcript: string } } } }) => void) | null
        onend: (() => void) | null
        onerror: (() => void) | null
        start: () => void
        stop: () => void
      }
    }
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!Ctor) return
    const rec = new Ctor()
    rec.lang = 'en-US'
    rec.interimResults = false
    rec.continuous = false
    setListening(true)
    setRecognized('')
    setResult(null)
    t0.current = performance.now()
    rec.onresult = (e) => {
      const transcript = e.results[0]?.[0]?.transcript ?? ''
      setRecognized(transcript)
      finish(transcript)
    }
    rec.onend = () => {
      setListening(false)
      recRef.current = null
    }
    rec.onerror = () => {
      setListening(false)
      recRef.current = null
      setRecognized('')
    }
    recRef.current = { start: () => rec.start(), stop: () => rec.stop() }
    rec.start()
  }

  const finish = (transcript: string) => {
    const spoken = transcript
      .split(/\s+/)
      .map(clean)
      .filter(Boolean)
    const hits = alignWords(targetWords.map(clean), spoken)
    const ratio = hits.filter(Boolean).length / Math.max(hits.length, 1)
    setResult({ hits, ratio })
    const timeMs = performance.now() - t0.current
    const passed = ratio >= 0.6
    answer({ module: 'listening', correct: passed, timeMs, medianMs: 12000 })
    if (passed) passListening()
  }

  const next = () => {
    setResult(null)
    setRecognized('')
    if (qIndex + 1 >= LISTENING_ITEMS.length) setDone(true)
    else setQIndex(qIndex + 1)
  }

  if (done) {
    return (
      <div className="quiz-panel">
        <div className="card center">
          <div style={{ fontSize: 44 }}>🎧</div>
          <h2 className="mt8">听写工坊通关！</h2>
          <p className="muted mt8">跟读命中率 ≥ 60% 即可点亮本句。坚持每天一句，听力越来越稳。</p>
          <button className="btn btn-primary mt14" onClick={() => { setQIndex(0); setDone(false); setResult(null); setRecognized('') }}>再来一轮</button>
        </div>
      </div>
    )
  }

  // ---------- 跟读（主模式，需语音识别） ----------
  if (recSupport) {
    return (
      <div className="quiz-panel">
        <GameHud module="listening" />
        <div className="card audio-panel">
          <p className="muted" style={{ fontSize: 13, marginBottom: 8 }}>
            ① 点播放听原句 → ② 点开始跟读并大声读出句子
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="listen-btn" onClick={speak} disabled={speaking} title="播放原句">
              {speaking ? '🔊' : '▶️ 播放原句'}
            </button>
            <button className="btn btn-primary" onClick={startListen} disabled={listening}>
              {listening ? '🎤 正在听…' : '🎤 开始跟读'}
            </button>
          </div>
          {!ttsSupport.current && (
            <p className="muted" style={{ color: 'var(--err)', marginTop: 6 }}>⚠️ 当前浏览器不支持语音朗读，请对照屏幕文字跟读。</p>
          )}

          <div className="sentence-blanks mt14" style={{ minHeight: 28 }}>
            {result ? (
              targetWords.map((w, i) => (
                <span
                  key={i}
                  className={`lm-word ${result.hits[i] ? 'lm-hit' : 'lm-miss'}`}
                  title={result.hits[i] ? '读对了' : '读错/漏读'}
                >
                  {w}
                </span>
              ))
            ) : listening ? (
              <span className="muted">🎤 请大声读出你听到的句子……</span>
            ) : (
              <span className="muted">👂 播放后跟读，这里会逐词点亮结果</span>
            )}
          </div>

          {result && (
            <div className="score-report">
              <div style={{ fontSize: 20, fontWeight: 900, color: result.ratio >= 0.6 ? 'var(--ok)' : 'var(--err)' }}>
                命中 {Math.round(result.ratio * 100)}%
                {result.ratio >= 0.6 ? ' ✓ 点亮本句' : ' ✗ 未达标（≥60% 点亮）'}
              </div>
              {recognized && (
                <div className="ex-eg muted" style={{ marginTop: 6 }}>
                  🗣 识别结果：{recognized}
                </div>
              )}
              <div className="ex-eg mt8">💡 原句：{item.text}</div>
              <button className="btn btn-primary mt8" onClick={next}>
                {qIndex + 1 >= LISTENING_ITEMS.length ? '完成本轮' : '下一句 →'}
              </button>
            </div>
          )}

          <p className="muted mt14" style={{ fontSize: 12 }}>第 {qIndex + 1} / {LISTENING_ITEMS.length} 句</p>
        </div>
      </div>
    )
  }

  // ---------- 降级模式：挖空选择（不支持语音识别时） ----------
  const words = item.text.split(' ')

  const pick = (blankIdx: number, optIdx: number) => {
    if (answered || picked[blankIdx] !== undefined) return
    const blank = item.blanks[blankIdx]
    const correct = blank.options[optIdx] === blank.answer
    const next = { ...picked, [blankIdx]: optIdx }
    setPicked(next)
    answer({ module: 'listening', correct, timeMs: 6000, medianMs: 8000 })
    const allAnswered = item.blanks.every((b, i) => next[i] !== undefined)
    const allCorrect = item.blanks.every((b, i) => blank.options[next[i]] === b.answer) && allAnswered
    if (allCorrect) {
      setAnswered(true)
      passListening()
      setTimeout(() => {
        if (qIndex + 1 >= LISTENING_ITEMS.length) setDone(true)
        else {
          setQIndex(qIndex + 1)
          setPicked({})
          setAnswered(false)
        }
      }, 1100)
    }
  }

  return (
    <div className="quiz-panel">
      <GameHud module="listening" />
      <div className="card audio-panel">
        <button className="listen-btn" onClick={speak} disabled={speaking} title="播放句子">
          {speaking ? '🔊' : '▶️'}
        </button>
        <p className="muted mt8">
          {speaking ? '正在播放……' : '点击播放，然后选出听到的单词'}
          <span className="muted" style={{ color: 'var(--err)' }}>（当前浏览器不支持语音识别，已切换为选词模式）</span>
        </p>

        <div className="sentence-blanks">
          {words.map((w, i) => (
            <span key={i}>
              {item.blanks.some((b) => b.index === i) ? (
                <span style={{ color: 'var(--accent)', fontWeight: 900 }}>
                  {picked[i] !== undefined ? item.blanks.find((b) => b.index === i)!.options[picked[i]] : '_____'}
                </span>
              ) : (
                w
              )}{' '}
            </span>
          ))}
        </div>

        {item.blanks.map((blank) => {
          const filled = picked[blank.index] !== undefined
          return (
            <div key={blank.index} className="word-options">
              {blank.options.map((opt, oi) => {
                let cls = 'btn btn-ghost'
                if (filled) {
                  if (blank.options[oi] === blank.answer) cls = 'btn btn-success'
                  else if (picked[blank.index] === oi) cls = 'btn'
                  else cls = 'btn btn-ghost'
                }
                return (
                  <button
                    key={oi}
                    className={cls}
                    disabled={filled}
                    onClick={() => pick(blank.index, oi)}
                    style={{ minWidth: 96 }}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
          )
        })}

        <p className="muted mt14" style={{ fontSize: 12 }}>第 {qIndex + 1} / {LISTENING_ITEMS.length} 句</p>
      </div>
    </div>
  )
}
