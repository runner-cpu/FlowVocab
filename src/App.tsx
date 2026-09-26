import { useEffect } from 'react'
import { useProgress } from './store/progressStore'
import { useUI } from './store/gameStore'
import TopBar from './components/layout/TopBar'
import FeedbackFx from './components/game/FeedbackFx'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import ModulePage from './pages/ModulePage'
import { SaveStatus } from './components/dashboard/ProgressionPanel'
import FirstRunGuide from './components/onboarding/FirstRunGuide'

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
        <SaveStatus />
        {page === 'home' && <Home />}
        {page === 'dashboard' && <Dashboard />}
        {isModule && <ModulePage module={page as any} />}
        {page === 'not-found' && <section className="not-found card"><span className="guide-kicker">FLOWVOCAB LOST SIGNAL</span><h1>这条航线不存在</h1><p className="muted">链接可能已经改变，返回学习舱可以继续你的离线进度。</p><button className="btn btn-primary" onClick={() => useUI.getState().go('home')}>返回学习舱</button></section>}
      </main>
      <FeedbackFx />
      <FirstRunGuide />
    </div>
  )
}
