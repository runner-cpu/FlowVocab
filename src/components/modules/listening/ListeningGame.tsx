import { useEffect, useRef, useState } from 'react'
import { useProgress } from '../../../store/progressStore'
import { LISTENING_ITEMS } from '../../../data/listening'
import { itemsForTrack } from '../../../data/curriculum'
import { useUI } from '../../../store/gameStore'
import type { ListeningItem } from '../../../types'
import GameHud from '../../game/GameHud'
import { elapsedSince } from '../../../engine/sessionTiming'

interface Recognition {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((event: { results: { [index: number]: { 0: { transcript: string } } } }) => void) | null
  onend: (() => void) | null
  onerror: ((event: { error?: string }) => void) | null
  start: () => void
  stop: () => void
  abort?: () => void
}
const clean = (text: string) => text.toLowerCase().replace(/[^a-z0-9']/g, '')
function alignWords(target: string[], spoken: string[]): boolean[] {
  let cursor = 0
  return target.map((word) => {
    const index = spoken.findIndex((candidate, i) => i >= cursor && candidate === clean(word))
    if (index < 0) return false
    cursor = index + 1
    return true
  })
}

export default function ListeningGame({ items = LISTENING_ITEMS }: { items?: ListeningItem[] }) {
  const track = useUI(state => state.track)
  const selectedItems = items === LISTENING_ITEMS ? itemsForTrack(track, 'listening', items) : items
  const answer = useProgress(state => state.answer)
  const passListening = useProgress(state => state.passListening)
  const saveError = useProgress(state => state.saveError)
  const voiceRate = useProgress(state => state.profile?.settings.voiceRate ?? .9)
  const [qIndex, setQIndex] = useState(0)
  const [speaking, setSpeaking] = useState(false)
  const [listening, setListening] = useState(false)
  const [recognized, setRecognized] = useState('')
  const [result, setResult] = useState<{ hits: boolean[]; ratio: number } | null>(null)
  const [done, setDone] = useState(false)
  const [picked, setPicked] = useState<Record<number, number>>({})
  const [answered, setAnswered] = useState(false)
  const [speechError, setSpeechError] = useState('')
  const [selectionMode, setSelectionMode] = useState(false)
  const t0 = useRef(performance.now())
  const submitted = useRef(false)
  const generation = useRef(0)
  const recRef = useRef<Recognition | null>(null)
  const advanceTimer = useRef<number | null>(null)
  const speechWindow = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }
  const RecognitionCtor = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition
  const recSupport = !!RecognitionCtor && !selectionMode
  const ttsSupport = 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'
  const item = selectedItems[qIndex]
  const contentKey = selectedItems.map(candidate => candidate.id).join('|')
  const targetWords = item?.text.split(/\s+/) ?? []

  function stopMedia() {
    generation.current += 1
    const recognition = recRef.current
    recRef.current = null
    if (recognition) {
      recognition.onresult = recognition.onend = recognition.onerror = null
      try { if (recognition.abort) recognition.abort(); else recognition.stop() } catch { /* Recognition may already be stopped. */ }
    }
    if (ttsSupport) window.speechSynthesis.cancel()
    if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current)
    advanceTimer.current = null
  }
  function resetQuestion() {
    stopMedia()
    t0.current = performance.now()
    submitted.current = false
    setPicked({})
    setAnswered(false)
    setResult(null)
    setRecognized('')
    setListening(false)
    setSpeaking(false)
  }
  useEffect(() => {
    resetQuestion()
    setQIndex(0)
    setDone(false)
    return stopMedia
    // The route content owns the practice lifecycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track, contentKey])
  useEffect(() => { resetQuestion() }, [qIndex])

  function speak() {
    if (!item || !ttsSupport) return
    try {
      const token = generation.current
      const utterance = new SpeechSynthesisUtterance(item.text)
      utterance.lang = 'en-US'
      utterance.rate = voiceRate
      utterance.onend = () => { if (generation.current === token) setSpeaking(false) }
      utterance.onerror = () => { if (generation.current === token) { setSpeaking(false); setSpeechError('朗读暂不可用，可以对照原句练习。') } }
      window.speechSynthesis.cancel()
      setSpeaking(true)
      window.speechSynthesis.speak(utterance)
    } catch { setSpeaking(false); setSpeechError('朗读暂不可用，可以对照原句练习。') }
  }
  function finish(transcript: string) {
    if (!item || submitted.current) return
    submitted.current = true
    const hits = alignWords(targetWords, transcript.split(/\s+/).map(clean).filter(Boolean))
    const ratio = hits.filter(Boolean).length / Math.max(hits.length, 1)
    setRecognized(transcript)
    setResult({ hits, ratio })
    void answer({ module: 'listening', correct: ratio >= .6, timeMs: elapsedSince(t0.current, performance.now()) })
    if (ratio >= .6) void passListening(item.id)
  }
  function startListen() {
    if (!RecognitionCtor || !item || submitted.current || listening || saveError) return
    stopMedia()
    const token = generation.current
    const current = () => token === generation.current
    const fail = () => {
      if (!current()) return
      stopMedia()
      setListening(false)
      setSelectionMode(true)
      setSpeechError('麦克风或语音识别暂不可用，已切换到选词练习。')
    }
    try {
      const recognition = new RecognitionCtor()
      recognition.lang = 'en-US'
      recognition.interimResults = false
      recognition.continuous = false
      recognition.onresult = event => { if (current()) finish(event.results[0]?.[0]?.transcript ?? '') }
      recognition.onend = () => { if (current()) { setListening(false); recRef.current = null } }
      recognition.onerror = fail
      recRef.current = recognition
      setListening(true)
      setSpeechError('')
      t0.current = performance.now()
      recognition.start()
    } catch { fail() }
  }
  function next() {
    if (saveError) return
    resetQuestion()
    if (qIndex + 1 >= selectedItems.length) setDone(true)
    else setQIndex(qIndex + 1)
  }
  function pick(blankIndex: number, optionIndex: number) {
    if (!item || answered || submitted.current || saveError || picked[blankIndex] !== undefined) return
    const blank = item.blanks.find(candidate => candidate.index === blankIndex)
    if (!blank) return
    const choices = { ...picked, [blankIndex]: optionIndex }
    setPicked(choices)
    if (!item.blanks.every(candidate => choices[candidate.index] !== undefined)) return
    const correct = item.blanks.every(candidate => candidate.options[choices[candidate.index]] === candidate.answer)
    submitted.current = true
    setAnswered(true)
    void answer({ module: 'listening', correct, timeMs: elapsedSince(t0.current, performance.now()) })
    if (correct) {
      void passListening(item.id)
      advanceTimer.current = window.setTimeout(() => {
        if (!useProgress.getState().saveError) next()
      }, 1100)
    }
  }
  const allCorrect = !!item && item.blanks.every(blank => blank.options[picked[blank.index]] === blank.answer)
  if (done) return <div className="quiz-panel"><div className="card center"><h2>听写工坊本轮完成</h2><p className="muted mt8">完成 {selectedItems.length} 句练习。跟读匹配只是练习参考，不是发音能力评分。</p><button className="btn btn-primary mt14" onClick={() => { resetQuestion(); setQIndex(0); setDone(false) }}>再来一轮</button></div></div>
  if (!item) return <div className="quiz-panel"><div className="card" role="status"><h2>当前路线暂无听力内容</h2><p>请选择其他学习路线。</p></div></div>
  return <div className="quiz-panel"><GameHud module="listening" /><div className="card audio-panel">
    {speechError && <p role="alert" className="explain-box">{speechError}</p>}
    <div className="hero-actions">
      <button className="btn btn-primary" onClick={speak} disabled={speaking || !ttsSupport}>{speaking ? '正在播放…' : '播放原句'}</button>
      {recSupport && <button className="btn btn-ghost" onClick={startListen} disabled={listening || !!result || !!saveError}>{listening ? '正在听…' : '开始跟读'}</button>}
      {recSupport && <button className="btn btn-ghost" onClick={() => { resetQuestion(); setSelectionMode(true) }}>切换选词练习</button>}
    </div>
    {recSupport ? <>
      <p className="muted mt8">语音识别可能由浏览器的在线服务处理音频；不想使用麦克风可选择选词练习。</p>
      {!ttsSupport && <p className="muted mt8">浏览器不支持朗读。原句：{item.text}</p>}
      <div className="sentence-blanks" lang="en">{result ? targetWords.map((word, i) => <span key={i} className={`lm-word ${result.hits[i] ? 'lm-hit' : 'lm-miss'}`} aria-label={`${word}，${result.hits[i] ? '已匹配' : '未匹配'}`}>{word}</span>) : listening ? '请读出你听到的句子' : '播放原句后开始跟读'}</div>
      {result && <div className="score-report" role="status"><strong>命中 {Math.round(result.ratio * 100)}% {result.ratio >= .6 ? '✓ 点亮本句' : '未达标，可重试'}</strong><p>识别结果：{recognized || '未识别到内容'}</p><p lang="en">原句：{item.text}</p><p className="muted">按识别文字匹配，结果不代表发音评分。</p><button className="btn btn-ghost mt8" onClick={resetQuestion} disabled={!!saveError}>再试一次</button><button className="btn btn-primary mt8" onClick={next} disabled={!!saveError}>{qIndex + 1 >= selectedItems.length ? '完成本轮' : '下一句'}</button></div>}
    </> : <>
      <p className="muted mt8">选出原句中的单词。{!ttsSupport && '当前浏览器不支持朗读，可展开原句进行阅读练习。'}</p>
      {!ttsSupport && <details className="explain-box"><summary>查看原句</summary><p lang="en">{item.text}</p></details>}
      <div className="sentence-blanks" lang="en">{targetWords.map((word, index) => { const blank = item.blanks.find(candidate => candidate.index === index); return <span key={index}>{blank ? picked[index] !== undefined ? blank.options[picked[index]] : '_____' : word} </span> })}</div>
      {item.blanks.map(blank => <div key={blank.index} className="word-options" role="group" aria-label={`第 ${blank.index + 1} 个词`}>
        {blank.options.map((option, index) => <button key={option} className={`btn ${picked[blank.index] !== undefined && option === blank.answer ? 'btn-success' : 'btn-ghost'}`} disabled={picked[blank.index] !== undefined || !!saveError} onClick={() => pick(blank.index, index)}>{option}</button>)}
      </div>)}
      {answered && <div className="score-report" role="status"><strong>{allCorrect ? '回答正确' : '本题有错误，请继续练习。'}</strong>{!allCorrect && <button className="btn btn-primary mt8" onClick={resetQuestion} disabled={!!saveError}>再试一次</button>}<button className="btn btn-ghost mt8" onClick={next} disabled={!!saveError}>{allCorrect ? '下一句' : '跳过本题'}</button></div>}
    </>}
    <p className="muted mt14">第 {qIndex + 1} / {selectedItems.length} 句</p>
  </div></div>
}
