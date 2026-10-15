import { useState } from 'react'
import { BarChart3, CircleHelp, Compass, Dumbbell, Flame, Home, Map, Moon, MoonStar, Settings, Sun, Volume2, Zap } from 'lucide-react'
import { useUI, type NavigablePageKey, type PageKey } from '../../store/gameStore'
import { useProgress } from '../../store/progressStore'
import FlowVocabMark from '../brand/FlowVocabMark'
import SettingsPanel from '../settings/SettingsPanel'

/**
 * 顶栏是「四个一级入口 + 一个训练场分组」。
 *
 * 句子 / 听力 / 写作 / 阅读 没有独立顶栏条目，但它们属于训练场这一组：
 * 进入这些模块时高亮「训练场」，用户始终能看出自己在哪一层，
 * 也不会再出现「进了模块但顶栏一条都不亮」的情况。
 */
const TRAINING_GROUP: PageKey[] = ['sentence', 'listening', 'writing', 'reading']
const NAV: {
  id: string
  label: string
  icon: typeof Home
  target: NavigablePageKey
  activeOn: PageKey[]
  section?: string
}[] = [
  { id: 'home', label: '首页', icon: Home, target: 'home', activeOn: ['home'] },
  { id: 'vocab', label: '词汇', icon: Map, target: 'vocab', activeOn: ['vocab'] },
  { id: 'grammar', label: '语法', icon: Compass, target: 'grammar', activeOn: ['grammar'] },
  { id: 'training', label: '训练场', icon: Dumbbell, target: 'home', activeOn: TRAINING_GROUP, section: 'training-ground' },
  { id: 'dashboard', label: '学习数据', icon: BarChart3, target: 'dashboard', activeOn: ['dashboard'] }
]

export default function TopBar() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsOpener, setSettingsOpener] = useState<HTMLElement | null>(null)
  const page = useUI((state) => state.page), go = useUI((state) => state.go), openGuide = useUI((state) => state.openGuide)
  const theme = useUI((state) => state.theme), toggleTheme = useUI((state) => state.toggleTheme)
  const planet = useProgress((state) => state.planet), profile = useProgress((state) => state.profile), toggleZen = useProgress((state) => state.toggleZen)
  const zen = profile?.settings.zenMode

  const open = (item: (typeof NAV)[number]) => {
    go(item.target)
    const section = item.section
    if (!section) return
    // 滚动只是增强：首页渲染完成后把训练模块网格滚进视口，取不到就停在首页顶部。
    window.setTimeout(() => {
      const target = document.getElementById(section)
      if (!target) return
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
      target.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' })
    }, 0)
  }

  return <>
    <header className="topbar"><div className="topbar-inner">
      <button className="logo" onClick={() => go('home')} aria-label="返回学习舱" title="微光港：英语星图"><FlowVocabMark size={40} /></button>
      <nav className="nav-links" aria-label="主导航">{NAV.map((item) => { const Icon = item.icon; const active = item.activeOn.includes(page); return <button key={item.id} aria-current={active ? 'page' : undefined} className={`nav-btn ${active ? 'active' : ''}`} onClick={() => open(item)}><Icon size={18} /><span>{item.label}</span></button> })}</nav>
      <div className="rail-status"><div><Flame size={17} /><span>连续学习</span><strong>{profile?.streakDays ?? 0} 天</strong></div><div><Zap size={17} /><span>星球能量</span><strong>{Math.floor(planet?.energy ?? 0)}</strong></div></div>
      <button className="theme-toggle" title={theme === 'light' ? '切换深色模式' : '切换浅色模式'} aria-label={theme === 'light' ? '切换深色模式' : '切换浅色模式'} onClick={toggleTheme}>{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}<span>{theme === 'light' ? '深色' : '浅色'}</span></button>
      <button className="theme-toggle guide-toggle" title="打开新手指南" aria-label="打开新手指南" onClick={openGuide}><CircleHelp size={18} /><span>指南</span></button>
      <button className="theme-toggle" title="设置" aria-label="设置" onClick={(event) => { setSettingsOpener(event.currentTarget); setSettingsOpen(true) }}><Settings size={18} /><span>设置</span></button>
      <button aria-label={zen ? '开启学习音效' : '关闭学习音效'} aria-pressed={!zen} className={`sound-toggle ${zen ? 'active' : ''}`} title={zen ? '开启声音' : '进入安静模式'} onClick={toggleZen}>{zen ? <MoonStar size={18} /> : <Volume2 size={18} />}<span>{zen ? '安静模式' : '学习音效'}</span></button>
    </div></header>
    <nav className="mobile-nav" aria-label="移动端主导航">{NAV.map((item) => { const Icon = item.icon; const active = item.activeOn.includes(page); return <button key={item.id} aria-current={active ? 'page' : undefined} className={active ? 'active' : ''} onClick={() => open(item)}><Icon size={19} /><small>{item.label}</small></button> })}</nav>
    {settingsOpen && <SettingsPanel opener={settingsOpener} onClose={() => setSettingsOpen(false)} />}
  </>
}
