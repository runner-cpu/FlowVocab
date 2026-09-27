import { useState } from 'react'
import { BarChart3, CircleHelp, Compass, Flame, Home, Map, Moon, MoonStar, Settings, Sun, Volume2, Zap } from 'lucide-react'
import { useUI, type NavigablePageKey } from '../../store/gameStore'
import { useProgress } from '../../store/progressStore'
import FlowVocabMark from '../brand/FlowVocabMark'
import SettingsPanel from '../settings/SettingsPanel'

const NAV: { key: NavigablePageKey; label: string; icon: typeof Home }[] = [
  { key: 'home', label: '首页', icon: Home }, { key: 'vocab', label: '词汇', icon: Map },
  { key: 'grammar', label: '语法', icon: Compass }, { key: 'dashboard', label: '学习数据', icon: BarChart3 }
]
export default function TopBar() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsOpener, setSettingsOpener] = useState<HTMLElement | null>(null)
  const page = useUI((state) => state.page), go = useUI((state) => state.go), openGuide = useUI((state) => state.openGuide)
  const theme = useUI((state) => state.theme), toggleTheme = useUI((state) => state.toggleTheme)
  const planet = useProgress((state) => state.planet), profile = useProgress((state) => state.profile), toggleZen = useProgress((state) => state.toggleZen)
  const zen = profile?.settings.zenMode
  return <>
    <header className="topbar"><div className="topbar-inner">
      <button className="logo" onClick={() => go('home')} aria-label="返回学习舱" title="FlowVocab"><FlowVocabMark size={40} /></button>
      <nav className="nav-links" aria-label="主导航">{NAV.map((item) => { const Icon = item.icon; return <button key={item.key} className={`nav-btn ${page === item.key ? 'active' : ''}`} onClick={() => go(item.key)}><Icon size={18} /><span>{item.label}</span></button> })}</nav>
      <div className="rail-status"><div><Flame size={17} /><span>连续学习</span><strong>{profile?.streakDays ?? 0} 天</strong></div><div><Zap size={17} /><span>星球能量</span><strong>{Math.floor(planet?.energy ?? 0)}</strong></div></div>
      <button className="theme-toggle" title={theme === 'light' ? '切换深色模式' : '切换浅色模式'} aria-label={theme === 'light' ? '切换深色模式' : '切换浅色模式'} onClick={toggleTheme}>{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}<span>{theme === 'light' ? '深色' : '浅色'}</span></button>
      <button className="theme-toggle guide-toggle" title="打开新手指南" aria-label="打开新手指南" onClick={openGuide}><CircleHelp size={18} /><span>指南</span></button>
      <button className="theme-toggle" title="设置" aria-label="设置" onClick={(event) => { setSettingsOpener(event.currentTarget); setSettingsOpen(true) }}><Settings size={18} /><span>设置</span></button>
      <button className={`sound-toggle ${zen ? 'active' : ''}`} title={zen ? '开启声音' : '进入安静模式'} onClick={toggleZen}>{zen ? <MoonStar size={18} /> : <Volume2 size={18} />}<span>{zen ? '安静模式' : '学习音效'}</span></button>
    </div></header>
    <nav className="mobile-nav" aria-label="移动端主导航">{NAV.map((item) => { const Icon = item.icon; return <button key={item.key} className={page === item.key ? 'active' : ''} onClick={() => go(item.key)}><Icon size={19} /><small>{item.label}</small></button> })}</nav>
    {settingsOpen && <SettingsPanel opener={settingsOpener} onClose={() => setSettingsOpen(false)} />}
  </>
}
