import { useUI, type PageKey } from '../../store/gameStore'
import { useProgress } from '../../store/progressStore'

const NAV: { key: PageKey; label: string }[] = [
  { key: 'home', label: '🏠 首页' },
  { key: 'vocab', label: '⚔️ 词汇' },
  { key: 'grammar', label: '🌳 语法' },
  { key: 'sentence', label: '🧩 句子' },
  { key: 'listening', label: '🎧 听力' },
  { key: 'writing', label: '🃏 写作' },
  { key: 'reading', label: '📖 阅读' },
  { key: 'dashboard', label: '📊 仪表盘' }
]

export default function TopBar() {
  const page = useUI((s) => s.page)
  const go = useUI((s) => s.go)
  const planet = useProgress((s) => s.planet)
  const profile = useProgress((s) => s.profile)
  const toggleZen = useProgress((s) => s.toggleZen)
  const zen = profile?.settings.zenMode

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="logo" onClick={() => go('home')}>
          🚀 心流词境 <small>FlowVocab</small>
        </div>
        <nav className="nav-links">
          {NAV.map((n) => (
            <button
              key={n.key}
              className={`nav-btn ${page === n.key ? 'active' : ''}`}
              onClick={() => go(n.key)}
            >
              {n.label}
            </button>
          ))}
        </nav>
        <div className="topbar-right">
          <div className="energy-pill">⚡ {Math.floor(planet?.energy ?? 0)}</div>
          <div className="energy-pill" style={{ background: 'rgba(91,127,212,0.14)', color: 'var(--accent)' }}>
            {planet?.level ?? 0}/5 级星球
          </div>
          <button
            className={`icon-btn ${zen ? 'active' : ''}`}
            title={zen ? '禅模式开（静音）' : '禅模式关'}
            onClick={toggleZen}
          >
            {zen ? '🔕' : '🔔'}
          </button>
          <button
            className="icon-btn"
            title="仪表盘"
            onClick={() => go('dashboard')}
          >
            📊
          </button>
        </div>
      </div>
    </header>
  )
}
