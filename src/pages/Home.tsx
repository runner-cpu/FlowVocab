import { useUI } from '../store/gameStore'
import { useProgress } from '../store/progressStore'
import { MODULE_META, type ModuleKey } from '../types'
import PlanetView from '../components/dashboard/PlanetView'
import Heatmap from '../components/dashboard/Heatmap'

const MODULES: ModuleKey[] = ['vocab', 'grammar', 'sentence', 'listening', 'writing', 'reading']

export default function Home() {
  const go = useUI((s) => s.go)
  const profile = useProgress((s) => s.profile)
  const planet = useProgress((s) => s.planet)
  const daily = useProgress((s) => s.daily)
  const radar = useProgress((s) => s.progress?.radar)

  const xpToday = daily?.xp ?? 0
  const goal = planet?.dailyGoal ?? 100
  const pct = Math.min(100, Math.round((xpToday / goal) * 100))

  return (
    <div>
      <div className="card" style={{ background: 'linear-gradient(135deg, rgba(91,127,212,0.10), rgba(155,187,244,0.22))' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <PlanetView compact />
        </div>
        <div className="mt14">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ fontWeight: 700 }}>🎯 今日任务</span>
            <span className="muted">{xpToday} / {goal} XP</span>
          </div>
          <div style={{ height: 8, borderRadius: 6, background: 'rgba(0,0,0,0.06)', marginTop: 6, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,#9BBBF4,#5B7FD4)', borderRadius: 6, transition: 'width 0.5s' }} />
          </div>
          <p className="muted mt8" style={{ fontSize: 12 }}>
            {pct >= 100 ? '🎉 今日目标达成，星球焕发生机！' : `再学 ${goal - xpToday} XP 点亮今日格子（累计已学 ${profile?.totalXp ?? 0} XP）`}
          </p>
        </div>
      </div>

      <div className="section-title">⚔️ 选择战场</div>
      <div className="grid">
        {MODULES.map((k) => {
          const meta = MODULE_META[k]
          const val = radar?.[k] ?? 0
          return (
            <div key={k} className="module-card" onClick={() => go(k)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="m-icon">{meta.icon}</span>
                <div>
                  <div className="m-name">{meta.name.split('·')[0]}</div>
                  <div className="m-desc">{meta.desc}</div>
                </div>
              </div>
              <div className="m-bar"><i style={{ width: `${val}%`, background: meta.color }} /></div>
              <div className="m-desc muted mt8" style={{ fontSize: 11 }}>掌握度 {val}%</div>
            </div>
          )
        })}
      </div>

      <div className="section-title">📊 近期热度</div>
      <div className="card">
        <div className="card-title">🔥 学习热力图（近 90 天）</div>
        <Heatmap />
      </div>
    </div>
  )
}
