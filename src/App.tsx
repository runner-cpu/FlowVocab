import { useEffect } from 'react'
import { useProgress } from './store/progressStore'
import { useUI } from './store/gameStore'
import TopBar from './components/layout/TopBar'
import FeedbackFx from './components/game/FeedbackFx'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import ModulePage from './pages/ModulePage'

const MODULE_KEYS = ['vocab', 'grammar', 'sentence', 'listening', 'writing', 'reading'] as const

export default function App() {
  const ready = useProgress((s) => s.ready)
  const init = useProgress((s) => s.init)
  const page = useUI((s) => s.page)

  useEffect(() => {
    init()
  }, [init])

  if (!ready) {
    return <div className="loading">🌱 正在唤醒心流词境……</div>
  }

  const isModule = MODULE_KEYS.includes(page as any)

  return (
    <div className="app">
      <TopBar />
      <main className="main">
        {page === 'home' && <Home />}
        {page === 'dashboard' && <Dashboard />}
        {isModule && <ModulePage module={page as any} />}
      </main>
      <FeedbackFx />
    </div>
  )
}
