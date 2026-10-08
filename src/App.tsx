import { lazy, Suspense, useEffect } from 'react'
import { useProgress } from './store/progressStore'
import { useUI, type PageKey } from './store/gameStore'
import TopBar from './components/layout/TopBar'
import FeedbackFx from './components/game/FeedbackFx'
import HarborBackdrop from './components/game/HarborBackdrop'
import Home from './pages/Home'
const Dashboard = lazy(() => import('./pages/Dashboard'))
const ModulePage = lazy(() => import('./pages/ModulePage'))
import { SaveStatus } from './components/dashboard/ProgressionPanel'
import FirstRunGuide from './components/onboarding/FirstRunGuide'
import type { ModuleKey } from './types'

const MODULE_KEYS: readonly ModuleKey[] = ['vocab', 'grammar', 'sentence', 'listening', 'writing', 'reading']
const isModulePage = (page: PageKey): page is ModuleKey => MODULE_KEYS.includes(page as ModuleKey)

export default function App() {
  const ready = useProgress((s) => s.ready)
  const init = useProgress((s) => s.init)
  const initError = useProgress((s) => s.initError)
  const retryInit = useProgress((s) => s.retryInit)
  const page = useUI((s) => s.page)
  useEffect(() => {
    const focusMain = () => document.getElementById('main-content')?.focus()
    focusMain()
    const retry = window.setTimeout(focusMain, 0)
    return () => window.clearTimeout(retry)
  }, [page])

  useEffect(() => {
    init()
  }, [init])

  if (!ready && initError) {
    return <div className="loading" role="alert"><p>{initError}</p><button className="btn btn-primary" onClick={() => void retryInit()}>重试</button></div>
  }

  if (!ready) {
    return <div className="loading">🌱 正在唤醒心流词境……</div>
  }

  const isModule = isModulePage(page)

  return (
    <div className="app">
      <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); document.getElementById('main-content')?.focus() }}>跳到主要内容</a>
      <HarborBackdrop />
      <TopBar />
      <main className="main" id="main-content" tabIndex={-1}>
        <SaveStatus />
        <Suspense fallback={<div className="loading route-loading" role="status">正在加载航线…</div>}>
          {page === 'home' && <Home />}
          {page === 'dashboard' && <Dashboard />}
          {isModule && <ModulePage module={page} />}
        </Suspense>
        {page === 'not-found' && <section className="not-found card"><span className="guide-kicker">FLOWVOCAB LOST SIGNAL</span><h1>这条航线不存在</h1><p className="muted">链接可能已经改变，返回学习舱可以继续你的离线进度。</p><button className="btn btn-primary" onClick={() => useUI.getState().go('home')}>返回学习舱</button></section>}
      </main>
      <FeedbackFx />
      <FirstRunGuide />
    </div>
  )
}
