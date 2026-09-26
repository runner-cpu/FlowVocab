import { useState } from 'react'
import type { VocabQuestion } from '../../types'

export default function AnswerHint({ question, disabled }: { question: VocabQuestion; disabled: boolean }) {
  const [used, setUsed] = useState(false)
  const phrase = question.word.phrases?.[0]
  // Hints for listening/spelling must not reveal the target spelling.
  const clue = question.mode === 'meaning' && phrase ? phrase.phrase : phrase?.translation || ('词性：' + (question.word.pos || '单词') + ' · ' + question.word.word.replace(/[^a-z]/gi, '').length + ' 个字母')
  return <div className="answer-hint">
    <button className="btn btn-ghost" disabled={used || disabled} onClick={() => setUsed(true)}>{used ? '提示已使用' : '使用提示 · 1 次'}</button>
    {used && <p role="status"><span>{clue}</span>{question.mode === 'meaning' && phrase ? ' · ' + phrase.translation : ''}</p>}
  </div>
}
