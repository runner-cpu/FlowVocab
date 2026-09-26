import { useEffect, useRef, useState } from 'react'
import { Volume2 } from 'lucide-react'
import { useProgress } from '../../../store/progressStore'
import { ensureWordBank, getWordPool, wordBankFallbackMessage } from '../../../store/wordBank'
import { createVocabQuestion, hasPronunciation, isVocabAnswerCorrect, speakWord, vocabModeAt } from '../../../engine/vocabRound'
import { levelFromXp } from '../../../engine/progression'
import { ACHIEVEMENTS } from '../../../store/progressModel'
import { useUI } from '../../../store/gameStore'
import type { VocabQuestion, Word, WordBankProgress } from '../../../types'
import GameHud from '../../game/GameHud'
import FlowGuide, { type GuideState } from '../../game/FlowGuide'
import AnswerHint from '../../game/AnswerHint'
import RoundSummary, { type RoundResult } from '../../game/RoundSummary'
import '../../game/VocabMission.css'

interface VocabGameProps { words?: Word[]; roundSize?: number; random?: () => number }
const MODE_NAMES = { meaning: '释义导航', listening: '听音寻踪', spelling: '拼写补给' }

export default function VocabGame({ words, roundSize = 30, random = Math.random }: VocabGameProps = {}) {
  const userWords = useProgress(s => s.userWords)
  const combo = useProgress(s => s.combo)
  const profile = useProgress(s => s.profile)
  const saveError = useProgress(s => s.saveError)
  const target = Math.max(1, Math.floor(roundSize))
  const [question, setQuestion] = useState<VocabQuestion | null>(null)
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [spelling, setSpelling] = useState('')
  const [persisted, setPersisted] = useState(false)
  const [guide, setGuide] = useState<GuideState>('idle')
  const [stats, setStats] = useState({ total: 0, correct: 0, maxCombo: 0 })
  const [result, setResult] = useState<RoundResult | null>(null)
  const [restarting, setRestarting] = useState(false)
  const [bank, setBank] = useState<WordBankProgress>({ phase: 'download', loaded: 0, total: 0 })
  const [fallback, setFallback] = useState('')
  const [speechMessage, setSpeechMessage] = useState('')
  const [empty, setEmpty] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const continueButton = useRef<HTMLButtonElement>(null)
  const spellingInput = useRef<HTMLInputElement>(null)
  const used = useRef(new Set<string>())
  const locked = useRef(false)
  const advancing = useRef(false)
  const pending = useRef<{ wordId: string; total: number; correct: boolean; level: number } | null>(null)
  const timer = useRef(performance.now())
  const randomSource = useRef(random)
  const baseline = useRef({ xp: profile?.totalXp ?? 0, achievements: profile?.unlockedAchievements ?? [], claims: profile?.claimedQuestDates ?? [] })

  function loadQuestion(nextIndex: number) {
    const state = useProgress.getState()
    const levelPool = words ?? getWordPool(state.difficulty.level)
    const pool = levelPool.length ? levelPool : ([0, 1, 2, 3, 4] as const).flatMap(getWordPool)
    if (!pool.length) { setEmpty(true); return }
    const fresh = pool.filter(word => !used.current.has(word.id))
    const due = fresh.filter(word => {
      const review = state.userWords.find(entry => entry.wordId === word.id)
      return !review || review.status !== 'mastered' || review.nextReview <= Date.now()
    })
    // A small offline pool can still complete the whole route.
    const candidates = due.length ? due : fresh.length ? fresh : pool
    const requestedWordId = nextIndex === 0 ? useUI.getState().reviewWordId : null
    const reviewPool = words ?? ([0, 1, 2, 3, 4] as const).flatMap(getWordPool)
    const requestedWord = requestedWordId ? reviewPool.find(word => word.id === requestedWordId || word.word === requestedWordId) : undefined
    const word = requestedWord ?? candidates[Math.min(candidates.length - 1, Math.max(0, Math.floor(randomSource.current() * candidates.length)))]
    if (requestedWord) useUI.getState().consumeReviewWord()
    used.current.add(word.id)
    setQuestion(createVocabQuestion(word, pool, vocabModeAt(nextIndex, word, hasPronunciation()), { random: randomSource.current, number: nextIndex + 1 }))
    setIndex(nextIndex)
    setPicked(null)
    setSpelling('')
    setPersisted(false)
    setGuide('idle')
    setSpeechMessage('')
    pending.current = null
    timer.current = performance.now()
  }

  useEffect(() => {
    let active = true
    const ready = words ? Promise.resolve() : ensureWordBank(progress => { if (active) setBank(progress) })
    ready.then(() => {
      if (!active) return
      setFallback(words ? '' : wordBankFallbackMessage())
      loadQuestion(0)
    })
    return () => { active = false; if (hasPronunciation()) window.speechSynthesis.cancel() }
    // The mission owns its initial pool; later questions read the latest difficulty.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words])

  useEffect(() => {
    locked.current = false
    advancing.current = false
    if (question?.mode === 'spelling') spellingInput.current?.focus()
    else heading.current?.focus()
  }, [question])

  useEffect(() => {
    const submitted = pending.current
    if (!submitted || !userWords.some(word => word.wordId === submitted.wordId && word.total >= submitted.total)) return
    pending.current = null
    setPersisted(true)
    setStats(previous => ({ total: previous.total + 1, correct: previous.correct + (submitted.correct ? 1 : 0), maxCombo: Math.max(previous.maxCombo, combo.combo) }))
    setGuide(levelFromXp(profile?.totalXp ?? 0) > submitted.level ? 'level-up' : submitted.correct ? 'hit' : 'miss')
  }, [userWords, combo.combo, profile?.totalXp])

  useEffect(() => { if (persisted) continueButton.current?.focus() }, [persisted])

  function submit(value: string) {
    if (!question || locked.current || saveError || !value.trim()) return
    locked.current = true
    const state = useProgress.getState()
    const correct = isVocabAnswerCorrect(question, value)
    pending.current = { wordId: question.word.id, total: (state.userWords.find(word => word.wordId === question.word.id)?.total ?? 0) + 1, correct, level: levelFromXp(state.profile?.totalXp ?? 0) }
    setPicked(value)
    void state.answer({ module: 'vocab', wordId: question.word.id, correct, timeMs: performance.now() - timer.current, medianMs: 4500 })
  }

  function advance() {
    if (!persisted || saveError || advancing.current) return
    advancing.current = true
    if (index + 1 >= target) {
      const current = useProgress.getState().profile
      const rewards = ACHIEVEMENTS.filter(item => current?.unlockedAchievements.includes(item.id) && !baseline.current.achievements.includes(item.id)).map(item => item.title as string)
      if ((current?.claimedQuestDates ?? []).some(claim => claim.includes(':') && !baseline.current.claims.includes(claim))) rewards.push('每日任务 XP 奖励')
      if (levelFromXp(current?.totalXp ?? 0) > levelFromXp(baseline.current.xp)) rewards.push('探索者等级提升')
      setResult({ ...stats, xp: (current?.totalXp ?? 0) - baseline.current.xp, rewards })
    } else loadQuestion(index + 1)
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.repeat || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || result || !question) return
      const element = event.target instanceof HTMLElement ? event.target : null
      if (element?.matches('input, textarea, select, [contenteditable="true"]')) return
      if (event.key === 'Enter' && persisted) {
        // Leave native activation intact for the pronunciation/hint/navigation buttons.
        if (element?.closest('button') && element !== continueButton.current) return
        event.preventDefault()
        advance()
      } else if (/^[1-4]$/.test(event.key) && picked === null && question.mode !== 'spelling') {
        event.preventDefault()
        const option = question.options[Number(event.key) - 1]
        if (option) submit(option.text)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  async function restart() {
    if (restarting || useProgress.getState().saveError) return
    setRestarting(true)
    const state = useProgress.getState()
    await state.finishSession()
    await state.startSession('vocab')
    if (useProgress.getState().saveError) { setRestarting(false); return }
    const current = useProgress.getState().profile
    baseline.current = { xp: current?.totalXp ?? 0, achievements: current?.unlockedAchievements ?? [], claims: current?.claimedQuestDates ?? [] }
    used.current.clear()
    setStats({ total: 0, correct: 0, maxCombo: 0 })
    setResult(null)
    loadQuestion(0)
    setRestarting(false)
  }

  function pronounce() {
    if (!question || speakWord(question.word.word, profile?.settings.voiceRate)) return
    setSpeechMessage('浏览器暂不支持发音，听音题已自动改为释义题。')
    if (question.mode === 'listening') {
      const levelPool = words ?? getWordPool(useProgress.getState().difficulty.level)
      const pool = levelPool.length ? levelPool : ([0, 1, 2, 3, 4] as const).flatMap(getWordPool)
      setQuestion(createVocabQuestion(question.word, pool, 'meaning', { random: randomSource.current, number: index + 1 }))
    }
  }

  const percent = bank.total ? Math.min(100, Math.floor(bank.loaded / bank.total * 100)) : 0
  const answered = picked !== null
  return <div className="quiz-panel vocab-mission">
    <GameHud module="vocab" />
    {saveError && <div className="bank-fallback" role="alert"><p>{saveError}</p><button className="btn btn-ghost" onClick={() => void useProgress.getState().retrySave()}>重试保存</button></div>}
    {result ? <RoundSummary result={result} onRestart={() => void restart()} busy={restarting || !!saveError} /> : !question ? <div className="card bank-progress" role="status">
      <h2>{empty ? '暂时没有可用词汇' : '正在准备词汇航程'}</h2>
      {!empty && <><p>{bank.phase === 'import' ? '正在保存离线词库' : '正在下载词库'} · {bank.total ? percent + '%' : '等待文件信息'}</p><progress aria-label="词库准备进度" max={100} value={percent} /><p>已导入 {bank.phase === 'import' || bank.phase === 'ready' ? bank.loaded.toLocaleString() : 0} 个词</p><p className="muted">{bank.total ? '首次导入完成后即可离线学习。' : '下载大小未知，完成后将显示分批导入进度。网络不可用时会自动启用内置词库。'}</p></>}
    </div> : <>
      {fallback && <p className="bank-fallback" role="status">{fallback}</p>}
      <ol className="mission-route" aria-label={target + ' 站航线'}>{Array.from({ length: target }, (_, stop) => <li key={stop} className={(stop < index || (stop === index && persisted) ? 'reached ' : '') + ((stop + 1) % 10 === 0 ? 'boss-stop' : '')} aria-label={'第 ' + (stop + 1) + ' 站' + ((stop + 1) % 10 === 0 ? '，首领关' : '')} aria-current={stop === index ? 'step' : undefined}>{(stop + 1) % 10 === 0 && <span>{stop + 1}</span>}</li>)}</ol>
      <div className="mission-route-caption"><span>第 {index + 1} / {target} 站</span><span>每 10 站 · 首领挑战</span></div>
      <section className={'card mission-card' + (question.boss ? ' is-boss' : '')}>
        <FlowGuide state={guide} />
        <div className="mission-topline"><span className="mission-eyebrow">{MODE_NAMES[question.mode]}</span>{question.boss && <span className="mission-boss">BOSS · 第 {index + 1} 站首领挑战</span>}</div>
        <div className="word-display">
          <h2 ref={heading} tabIndex={-1}>{question.prompt}</h2>
          {question.mode === 'meaning' && <><div className="w-phonetic">{question.word.phonetic}</div><div className="w-pos">{question.word.pos}</div></>}
          <button className="btn btn-ghost mission-pronounce" aria-label="播放单词发音" onClick={pronounce}><Volume2 size={17} aria-hidden="true" />{question.mode === 'listening' ? '听发音' : '单词发音'}</button>
          {speechMessage && <p className="muted" role="status">{speechMessage}</p>}
        </div>
        {question.mode === 'spelling' ? <form className="spelling-form" onSubmit={event => { event.preventDefault(); submit(spelling) }}>
          <label htmlFor="vocab-spelling">输入对应的英文单词</label><input ref={spellingInput} id="vocab-spelling" value={spelling} onChange={event => setSpelling(event.target.value)} disabled={answered || !!saveError} autoComplete="off" autoCapitalize="none" spellCheck={false} /><button className="btn btn-primary" disabled={answered || !!saveError || !spelling.trim()}>提交拼写</button>
        </form> : <div className="options" role="group" aria-label="答案选项">{question.options.map((option, i) => <button key={option.text} className={'option' + (answered && option.correct ? ' correct' : answered && picked === option.text ? ' wrong' : '')} disabled={answered || !!saveError} onClick={() => submit(option.text)}><kbd aria-hidden="true">{i + 1}</kbd><span>{option.text}</span>{answered && option.correct && <span aria-label="正确答案">✓</span>}{answered && !option.correct && picked === option.text && <span aria-label="本次答错">×</span>}</button>)}</div>}
        <AnswerHint key={index + ':' + question.word.id} question={question} disabled={answered} />
        {answered && <div className="mission-feedback" role="status"><strong>{isVocabAnswerCorrect(question, picked!) ? '回答正确' : '记住这条新线索'} · {question.word.word}</strong><p>{question.word.meaning}</p><p>{question.word.example}</p><p className="muted">{question.word.exampleCn}</p></div>}
        <div className="mission-actions"><small>{question.mode === 'spelling' ? 'Enter 提交拼写' : '数字键 1–4 选择答案'} · 答题后 Enter 继续</small>{answered && <button ref={continueButton} className="btn btn-primary" disabled={!persisted || !!saveError} onClick={advance}>{index + 1 >= target ? '查看战报' : '下一站'}{!persisted ? ' · 等待保存' : ' →'}</button>}</div>
      </section>
    </>}
  </div>
}
