import { useState } from 'react'
import type { VocabQuestion } from '../../types'

export default function AnswerHint({ question, disabled, onUse }: { question: VocabQuestion; disabled: boolean; onUse?: () => void }) {
  const [used, setUsed] = useState(false)
  const phrase = question.word.phrases?.[0]
  // Hints for listening/spelling must not reveal the target spelling.
  const clue = question.mode === 'meaning' && phrase ? phrase.phrase : phrase?.translation || ('词性：' + (question.word.pos || '单词') + ' · ' + question.word.word.replace(/[^a-z]/gi, '').length + ' 个字母')
  return <div className="answer-hint">
    <button
      className="btn btn-ghost"
      disabled={used || disabled}
      onClick={() => { setUsed(true); onUse?.() }}
    >{used ? '提示已使用 · 本题经验减半' : '使用提示 · 经验减半'}</button>
    {used && <p role="status"><span>{clue}</span>{question.mode === 'meaning' && phrase ? ' · ' + phrase.translation : ''}</p>}
  </div>
}
