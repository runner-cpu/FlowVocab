import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DialogueQuestion, DialogueScene } from '../../../data/dialogue'
import { dialogueStars, matchDialogueAnswer, referenceFlags, type DialogueMatchResult } from '../../../engine/dialogue'
import './DialogueMode.css'

/** 浏览器语音识别的最小接口（能力探测时可能为 undefined）。 */
interface Recognition {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((event: { results: { [index: number]: { 0: { transcript: string; confidence?: number } } } }) => void) | null
  onend: (() => void) | null
  onerror: ((event: { error?: string }) => void) | null
  start: () => void
  stop: () => void
  abort?: () => void
}

interface SpeechWindow {
  SpeechRecognition?: new () => Recognition
  webkitSpeechRecognition?: new () => Recognition
}

export interface DialogueModeProps {
  scene: DialogueScene
  /** 已通过的题目 id；由外层进度决定，组件本身不写存储。 */
  passedIds?: Set<string>
  /** 单题评分后的回调（外层可据此记录进度）。 */
  onScored?: (questionId: string, result: DialogueMatchResult) => void
  /** 场景整体完成后的回调。 */
  onSceneComplete?: (stars: number) => void
}

/** 顺序高亮：与引擎同源的顺序对齐，逐词给出命中/未命中。 */
function tokensFor(sentence: string, spokenText: string): { word: string; hit: boolean }[] {
  const words = (sentence ?? '').split(/\s+/).filter(Boolean)
  const flags = referenceFlags(spokenText, sentence)
  return words.map((word, index) => ({ word, hit: flags[index] ?? false }))
}

export default function DialogueMode({ scene, passedIds, onScored, onSceneComplete }: DialogueModeProps) {
  const [qIndex, setQIndex] = useState(0)
  const [speaking, setSpeaking] = useState(false)
  const [listening, setListening] = useState(false)
  const [typed, setTyped] = useState('')
  const [transcript, setTranscript] = useState('')
  const [result, setResult] = useState<DialogueMatchResult | null>(null)
  const [notice, setNotice] = useState('')
  const [fallback, setFallback] = useState(false)
  /** 组件本地记录的本轮已通过题目；与外部 passedIds 取并集展示进度。 */
  const [scoredIds, setScoredIds] = useState<string[]>([])

  const submitted = useRef(false)
  const generation = useRef(0)
  const recRef = useRef<Recognition | null>(null)
  const mounted = useRef(true)
  const completedNotified = useRef(false)

  const speechWindow = window as unknown as SpeechWindow
  const RecognitionCtor = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition
  const ttsSupport = 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'
  const recSupport = !!RecognitionCtor && !fallback
  const question: DialogueQuestion | undefined = scene?.questions?.[qIndex]
  const questionCount = scene?.questions?.length ?? 0
  const passed = useMemo(() => {
    const ids = new Set(passedIds ?? [])
    scoredIds.forEach((id) => ids.add(id))
    return ids
  }, [passedIds, scoredIds])
  const sceneStars = useMemo(() => (scene ? dialogueStars(passed, scene) : 0), [scene, passed])

  const stopMedia = useCallback(() => {
    generation.current += 1
    const recognition = recRef.current
    recRef.current = null
    if (recognition) {
      recognition.onresult = recognition.onend = recognition.onerror = null
      try {
        if (recognition.abort) recognition.abort()
        else recognition.stop()
      } catch {
        /* 识别可能已经停止。 */
      }
    }
    if (ttsSupport) window.speechSynthesis.cancel()
  }, [ttsSupport])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      stopMedia()
    }
  }, [stopMedia])

  // 切换题目或场景时清空本题状态，并阻止旧的回调再提交。
  useEffect(() => {
    stopMedia()
    submitted.current = false
    setSpeaking(false)
    setListening(false)
    setTyped('')
    setTranscript('')
    setResult(null)
  }, [qIndex, scene?.id, stopMedia])

  // 换场景时允许新的完成通知；同一场景一次挂载内只通知一次。
  useEffect(() => {
    completedNotified.current = false
  }, [scene?.id])

  function speak() {
    if (!scene || !ttsSupport) return
    try {
      const token = generation.current
      const utterance = new SpeechSynthesisUtterance(scene.heroLine)
      utterance.lang = 'en-US'
      utterance.rate = 0.92
      utterance.onend = () => {
        if (generation.current === token) setSpeaking(false)
      }
      utterance.onerror = () => {
        if (generation.current === token) setSpeaking(false)
      }
      window.speechSynthesis.cancel()
      setSpeaking(true)
      window.speechSynthesis.speak(utterance)
    } catch {
      setSpeaking(false)
    }
  }

  function submitAnswer(text: string, confidence = 1) {
    if (!question || submitted.current) return
    submitted.current = true
    const next = matchDialogueAnswer(text, question, confidence)
    setTranscript(text)
    setResult(next)
    onScored?.(question.id, next)
    if (next.stars > 0) {
      const ids = new Set(passed)
      ids.add(question.id)
      setScoredIds((current) => (current.includes(question.id) ? current : [...current, question.id]))
      const stars = dialogueStars(ids, scene)
      if (stars >= 3 && !completedNotified.current) {
        completedNotified.current = true
        onSceneComplete?.(stars)
      }
    }
  }

  function startListen() {
    if (!RecognitionCtor || !question || submitted.current || listening) return
    stopMedia()
    const token = generation.current
    const current = () => token === generation.current && mounted.current
    const fallbackToTyping = (message: string) => {
      if (!current()) return
      stopMedia()
      setListening(false)
      setFallback(true)
      setNotice(message)
    }
    try {
      const recognition = new RecognitionCtor()
      recognition.lang = 'en-US'
      recognition.interimResults = false
      recognition.continuous = false
      recognition.onresult = (event) => {
        if (!current()) return
        const match = event.results[0]?.[0]
        submitAnswer(match?.transcript ?? '', typeof match?.confidence === 'number' ? match.confidence : 1)
        setListening(false)
      }
      recognition.onend = () => {
        if (!current()) return
        setListening(false)
        recRef.current = null
      }
      recognition.onerror = () => fallbackToTyping('麦克风或语音识别暂不可用，已切换到打字输入。')
      recRef.current = recognition
      setNotice('')
      setListening(true)
      recognition.start()
    } catch {
      fallbackToTyping('麦克风或语音识别暂不可用，已切换到打字输入。')
    }
  }

  function submitTyped() {
    if (submitted.current) return
    submitAnswer(typed, 1)
  }

  function next() {
    stopMedia()
    submitted.current = false
    if (qIndex + 1 >= questionCount) {
      setTyped('')
      setTranscript('')
      setResult(null)
      setQIndex(0)
      setNotice('本轮题目已完成，可以重新练习这一场景。')
      return
    }
    setQIndex(qIndex + 1)
  }

  if (!scene || !question) {
    return <div className="dialogue-panel" role="status">当前场景暂无口语内容，请选择其他场景。</div>
  }

  const reference = tokensFor(question.spoken, result ? transcript : '')
  const stars = result?.stars ?? 0
  const advance = qIndex + 1 >= questionCount ? '回到第一题' : '下一题'

  return <div className="dialogue-panel">
    <header className="dialogue-head">
      <div>
        <p className="dialogue-eyebrow">{scene.place} · 离线语音对话</p>
        <h2 className="dialogue-title">{scene.title}</h2>
      </div>
      <div className="dialogue-stars" aria-label={`场景进度 ${sceneStars} 星`}>
        {[1, 2, 3].map((value) => <span key={value} className={`dialogue-star ${value <= sceneStars ? 'dialogue-star-on' : ''}`} aria-hidden="true">★</span>)}
      </div>
    </header>

    <div className="dialogue-hero">
      <p className="dialogue-hero-label">狐狸的示范</p>
      <p className="dialogue-hero-line" lang="en">{scene.heroLine}</p>
      {!ttsSupport && <p className="dialogue-note" role="note">当前浏览器不支持朗读，可以直接阅读示范句后跟读。</p>}
      <button type="button" className="btn btn-primary dialogue-action" onClick={speak} disabled={speaking || !ttsSupport}>
        {speaking ? '正在播放…' : '播放示范'}
      </button>
    </div>

    <div className="dialogue-progress" role="status" aria-live="polite">
      第 {qIndex + 1} / {questionCount} 题 · 场景进度 {sceneStars} 星
    </div>

    <section className="dialogue-question" aria-label="本题目">
      <p className="dialogue-prompt">{question.prompt}</p>
      <p className="dialogue-reference" lang="en">
        {reference.map((token, index) => (
          <span key={`${token.word}-${index}`} className={`dialogue-token ${result ? (token.hit ? 'dialogue-hit' : 'dialogue-miss') : ''}`}>
            {token.word}
          </span>
        ))}
      </p>
      <p className="dialogue-hint">规则提示：{question.rule}</p>
    </section>

    <div className="dialogue-actions">
      {recSupport && (
        <button type="button" className="btn btn-ghost dialogue-action" onClick={startListen} disabled={listening || !!result}>
          {listening ? '正在听…' : '开始跟读'}
        </button>
      )}
      {recSupport && (
        <button type="button" className="btn btn-ghost dialogue-action" onClick={() => { stopMedia(); setFallback(true); setNotice('已切换到打字输入，输入英文句子后提交。') }}>
          改用打字输入
        </button>
      )}
      {!recSupport && <p className="dialogue-note" role="note">当前环境不支持语音识别，请直接输入完整英文句子。</p>}
    </div>

    {(fallback || !RecognitionCtor) && (
      <form
        className="dialogue-typing"
        onSubmit={(event) => { event.preventDefault(); submitTyped() }}
      >
        <label className="dialogue-typing-label" htmlFor="dialogue-typed-input">输入你要说的英文句子</label>
        <input
          id="dialogue-typed-input"
          className="dialogue-input"
          type="text"
          lang="en"
          autoComplete="off"
          value={typed}
          disabled={!!result}
          onChange={(event) => setTyped(event.target.value)}
        />
        <button type="submit" className="btn btn-primary dialogue-action" disabled={!!result || typed.trim().length === 0}>提交答案</button>
      </form>
    )}

    {notice && <p className="dialogue-notice" role="alert">{notice}</p>}

    {result && (
      <section className="dialogue-score" aria-live="polite" aria-label="本题评分">
        <p className="dialogue-score-line">
          星级 {stars} / 3 · 命中 {Math.round(result.ratio * 100)}%
        </p>
        <p className="dialogue-transcript">识别结果：{transcript || '（没有识别到内容）'}</p>
        <ul className="dialogue-feedback">
          {result.feedbackZh.map((line, index) => <li key={index}>{line}</li>)}
        </ul>
        <button type="button" className="btn btn-primary dialogue-action" onClick={next}>
          {advance}
        </button>
      </section>
    )}
  </div>
}
