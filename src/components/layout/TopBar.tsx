import { BarChart3, BookMarked, Compass, Flame, Home, Map, MoonStar, Volume2, Zap } from 'lucide-react'
import { useUI, type PageKey } from '../../store/gameStore'
import { useProgress } from '../../store/progressStore'

const NAV: { key: PageKey; label: string; icon: typeof Home }[] = [
  { key: 'home', label: '学习舱', icon: Home }, { key: 'vocab', label: '任务地图', icon: Map },
  { key: 'grammar', label: '技能训练', icon: Compass }, { key: 'dashboard', label: '成长记录', icon: BarChart3 }
]

export default function TopBar() {
  const page = useUI((s) => s.page); const go = useUI((s) => s.go); const planet = useProgress((s) => s.planet)
  const profile = useProgress((s) => s.profile); const toggleZen = useProgress((s) => s.toggleZen); const zen = profile?.settings.zenMode
  return <>
    <header className="topbar"><div className="topbar-inner"><button className="logo" onClick={() => go('home')} aria-label="返回学习舱"><BookMarked size={24} fill="currentColor" /><span>心流词境<small>FlowVocab</small></span></button>
      <nav className="nav-links" aria-label="主导航">{NAV.map((item) => { const Icon = item.icon; return <button key={item.key} className={`nav-btn ${page === item.key ? 'active' : ''}`} onClick={() => go(item.key)}><Icon size={18} /><span>{item.label}</span></button> })}</nav>
      <div className="rail-status"><div><Flame size={17} /><span>连续学习</span><strong>{profile?.streakDays ?? 0} 天</strong></div><div><Zap size={17} /><span>星球能量</span><strong>{Math.floor(planet?.energy ?? 0)}</strong></div></div>
      <button className={`sound-toggle ${zen ? 'active' : ''}`} title={zen ? '开启声音' : '进入安静模式'} onClick={toggleZen}>{zen ? <MoonStar size={18} /> : <Volume2 size={18} />}<span>{zen ? '安静模式' : '学习音效'}</span></button>
    </div></header>
    <nav className="mobile-nav" aria-label="移动端主导航">{NAV.map((item) => { const Icon = item.icon; return <button key={item.key} className={page === item.key ? 'active' : ''} onClick={() => go(item.key)}><Icon size={19} /><small>{item.label}</small></button> })}</nav>
  </>
}
