import { useEffect } from 'react'
import { useProgress } from '../store/progressStore'
import type { ModuleKey } from '../types'
import VocabGame from '../components/modules/vocab/VocabGame'
import GrammarGame from '../components/modules/grammar/GrammarGame'
import SentenceGame from '../components/modules/sentence/SentenceGame'
import ListeningGame from '../components/modules/listening/ListeningGame'
import WritingGame from '../components/modules/writing/WritingGame'
import ReadingGame from '../components/modules/reading/ReadingGame'

export default function ModulePage({ module }: { module: ModuleKey }) {
  const startSession = useProgress((s) => s.startSession)
  const finishSession = useProgress((s) => s.finishSession)

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

  return <div>{render()}</div>
}
