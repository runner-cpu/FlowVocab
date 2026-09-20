import { BarChart3, Compass, Flame, Home, Map, Moon, MoonStar, Sun, Volume2, Zap } from 'lucide-react'
import { useUI, type PageKey } from '../../store/gameStore'
import { useProgress } from '../../store/progressStore'
import FlowVocabMark from '../brand/FlowVocabMark'

const NAV: { key: PageKey; label: string; icon: typeof Home }[] = [
  { key: 'home', label: '学习舱', icon: Home }, { key: 'vocab', label: '任务地图', icon: Map },
  { key: 'grammar', label: '训练场', icon: Compass }, { key: 'dashboard', label: '成长图谱', icon: BarChart3 }
]

export default function TopBar() {
  const page = useUI((s) => s.page); const go = useUI((s) => s.go); const planet = useProgress((s) => s.planet)
  const profile = useProgress((s) => s.profile); const toggleZen = useProgress((s) => s.toggleZen); const zen = profile?.settings.zenMode
  const theme = useUI((s) => s.theme); const toggleTheme = useUI((s) => s.toggleTheme)
  return <>
    <header className="topbar"><div className="topbar-inner"><button className="logo" onClick={() => go('home')} aria-label="返回学习舱" title="FlowVocab"><FlowVocabMark size={40} /></button>
      <nav className="nav-links" aria-label="主导航">{NAV.map((item) => { const Icon = item.icon; return <button key={item.key} className={`nav-btn ${page === item.key ? 'active' : ''}`} onClick={() => go(item.key)}><Icon size={18} /><span>{item.label}</span></button> })}</nav>
      <div className="rail-status"><div><Flame size={17} /><span>连续学习</span><strong>{profile?.streakDays ?? 0} 天</strong></div><div><Zap size={17} /><span>星球能量</span><strong>{Math.floor(planet?.energy ?? 0)}</strong></div></div>
      <button className="theme-toggle" title={theme === 'light' ? '切换深色模式' : '切换浅色模式'} aria-label={theme === 'light' ? '切换深色模式' : '切换浅色模式'} onClick={toggleTheme}>{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}<span>{theme === 'light' ? '深色' : '浅色'}</span></button>
      <button className={`sound-toggle ${zen ? 'active' : ''}`} title={zen ? '开启声音' : '进入安静模式'} onClick={toggleZen}>{zen ? <MoonStar size={18} /> : <Volume2 size={18} />}<span>{zen ? '安静模式' : '学习音效'}</span></button>
    </div></header>
    <nav className="mobile-nav" aria-label="移动端主导航">{NAV.map((item) => { const Icon = item.icon; return <button key={item.key} className={page === item.key ? 'active' : ''} onClick={() => go(item.key)}><Icon size={19} /><small>{item.label}</small></button> })}</nav>
  </>
}
