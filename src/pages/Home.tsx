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
  const completedModules = Object.values(daily?.modules ?? {}).filter((n) => n > 0).length
  const totalMinutes = Math.max(8, Math.round((daily?.xp ?? 0) * 0.7))
  const todayFocus = pct < 35 ? '先完成一组词汇热身，再挑战一个语法节点' : pct < 80 ? '节奏不错，继续用听力或句子模块巩固' : '最后冲刺：完成一项输出任务，锁定今日记忆'

  return (
    <div>
      <section className="home-hero">
        <div className="hero-copy">
          <h1>今天也让英语<br /><em>自然发生</em></h1>
          <p>用一小段专注时间，换一次真实的能力升级。你的星球正在等你点亮。</p>
          <div className="hero-actions">
            <button className="btn btn-primary" onClick={() => go('vocab')}>开始今日训练 <span>→</span></button>
            <button className="btn btn-ghost" onClick={() => go('dashboard')}>查看成长轨迹</button>
          </div>
        </div>
        <div className="hero-orbit"><PlanetView compact /></div>
      </section>

      <section className="card daily-card">
        <div className="mt14">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ fontWeight: 800 }}>🎯 今日任务 <span className="muted" style={{ fontWeight: 500 }}>· {todayFocus}</span></span>
            <span className="muted">{xpToday} / {goal} XP</span>
          </div>
          <div style={{ height: 8, borderRadius: 6, background: 'rgba(0,0,0,0.06)', marginTop: 6, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,#9BBBF4,#5B7FD4)', borderRadius: 6, transition: 'width 0.5s' }} />
          </div>
          <p className="muted mt8" style={{ fontSize: 12 }}>
            {pct >= 100 ? '🎉 今日目标达成，星球焕发生机！' : `再学 ${goal - xpToday} XP 点亮今日格子（累计已学 ${profile?.totalXp ?? 0} XP）`}
          </p>
        </div>
        <div className="daily-meta">
          <span>⏱ 预计 {totalMinutes} 分钟</span><span>✦ 已完成 {completedModules}/6 模块</span><span>🔥 连续 {profile?.streakDays ?? 0} 天</span>
        </div>
      </section>

      <div className="section-heading-row"><div className="section-title">⚔️ 选择战场</div><span className="muted">六维能力，按需补强</span></div>

      <div className="grid">
        {MODULES.map((k) => {
          const meta = MODULE_META[k]
          const val = radar?.[k] ?? 0
          return (
            <div key={k} className="module-card" role="button" tabIndex={0} onClick={() => go(k)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') go(k) }}>
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

      <section className="home-lower grid">
        <div className="card next-card">
          <div className="card-title">✨ 为你推荐</div>
          <div className="recommend-item"><span className="recommend-icon">🧠</span><div><b>间隔复习 · 高频词</b><p className="muted">根据遗忘曲线，今天有 12 个词值得再见。</p></div><button className="mini-arrow" onClick={() => go('vocab')}>→</button></div>
          <div className="recommend-item"><span className="recommend-icon">🎧</span><div><b>一分钟听力热身</b><p className="muted">听见、跟读、点亮每一个词。</p></div><button className="mini-arrow" onClick={() => go('listening')}>→</button></div>
        </div>
        <div className="card streak-card">
          <div className="card-title">🔥 连续学习</div>
          <div className="streak-number">{profile?.streakDays ?? 0}<small> 天</small></div>
          <p className="muted">保持今天的节奏，明天解锁新的星球光环。</p>
          <div className="streak-dots">{['一','二','三','四','五','六','日'].map((d, i) => <span key={d} className={i < Math.min(7, profile?.streakDays ?? 0) ? 'on' : ''}><i>•</i>{d}</span>)}</div>
        </div>
      </section>

      <div className="section-heading-row"><div className="section-title">📊 近期热度</div><span className="muted">近 90 天</span></div>
      <div className="card heatmap-card"><Heatmap /></div>
    </div>
  )
}
