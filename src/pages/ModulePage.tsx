import { useEffect } from 'react'
import { useProgress } from '../store/progressStore'
import { useUI } from '../store/gameStore'
import { LEARNING_TRACKS, MODULE_META, TRACK_MODULE_FOCUS, type ModuleKey } from '../types'
import { isModuleAvailable } from '../data/curriculum'
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
  const track = useUI((s) => s.track)
  const meta = MODULE_META[module]
  const available = isModuleAvailable(track, module)

  useEffect(() => {
    if (available) startSession(module)
    return () => {
      finishSession()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module, available])

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

  if (!available) return <div className="module-shell"><div className="module-context"><button className="back-link" onClick={() => go('home')}>← 返回学习舱</button></div><div className="card" role="status"><h2>此模块尚未对当前路线开放</h2><p>切换学习路线后可进入相应训练。</p><button className="btn btn-primary" onClick={() => go('home')}>切换路线</button></div></div>
  return <div className="module-shell">
    <div className="module-context">
      <button className="back-link" onClick={() => go('home')}>← 返回学习舱</button>
      <div className="module-context-title"><span>{meta.icon}</span><div><strong>{meta.name}</strong><small>{LEARNING_TRACKS[track].shortLabel} · {TRACK_MODULE_FOCUS[track][module]} · 专注练习中</small></div></div>
      <div className="module-context-stats"><span>本轮 {session.total} 题</span><span>正确率 {session.total ? Math.round(session.correct / session.total * 100) : 0}%</span></div>
    </div>
    {render()}
  </div>
}
