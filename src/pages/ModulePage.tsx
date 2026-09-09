import { useEffect } from 'react'
import { useProgress } from '../store/progressStore'
import { useUI } from '../store/gameStore'
import { MODULE_META, type ModuleKey } from '../types'
import VocabGame from '../components/modules/vocab/VocabGame'
import GrammarGame from '../components/modules/grammar/GrammarGame'
import SentenceGame from '../components/modules/sentence/SentenceGame'
import ListeningGame from '../components/modules/listening/ListeningGame'
import WritingGame from '../components/modules/writing/WritingGame'
import ReadingGame from '../components/modules/reading/ReadingGame'

export default function ModulePage({ module }: { module: ModuleKey }) {
  const startSession = useProgress((s) => s.startSession)
  const finishSession = useProgress((s) => s.finishSession)
  const session = useProgress((s) => s.session)
  const go = useUI((s) => s.go)
  const meta = MODULE_META[module]

  useEffect(() => {
    startSession(module)
    return () => {
      finishSession()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module])

  const render = () => {
    switch (module) {
      case 'vocab': return <VocabGame />
      case 'grammar': return <GrammarGame />
      case 'sentence': return <SentenceGame />
      case 'listening': return <ListeningGame />
      case 'writing': return <WritingGame />
      case 'reading': return <ReadingGame />
    }
  }

  return <div className="module-shell">
    <div className="module-context">
      <button className="back-link" onClick={() => go('home')}>← 返回学习舱</button>
      <div className="module-context-title"><span>{meta.icon}</span><div><strong>{meta.name}</strong><small>{meta.desc} · 专注练习中</small></div></div>
      <div className="module-context-stats"><span>本轮 {session.total} 题</span><span>正确率 {session.total ? Math.round(session.correct / session.total * 100) : 0}%</span></div>
    </div>
    {render()}
  </div>
}
