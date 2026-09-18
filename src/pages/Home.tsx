import { ArrowRight, BookOpen, Check, Flame, Headphones, PenLine, Play, Sparkles, Star, Target, Trophy } from 'lucide-react'
import { useUI } from '../store/gameStore'
import { useProgress } from '../store/progressStore'
import { MODULE_META, type ModuleKey } from '../types'

const MODULES: ModuleKey[] = ['vocab', 'grammar', 'sentence', 'listening', 'writing', 'reading']
const JOURNEY: { module: ModuleKey; title: string; note: string; icon: typeof BookOpen }[] = [
  { module: 'vocab', title: '唤醒 5 个词', note: '词汇热身', icon: BookOpen },
  { module: 'listening', title: '完成听力挑战', note: '听见真实语境', icon: Headphones },
  { module: 'sentence', title: '拼好 3 个句子', note: '完成今日输出', icon: PenLine }
]
const MODULE_LABELS: Record<ModuleKey, string> = { vocab: '语境词卡', grammar: '技能树', sentence: '句子拼图', listening: '声音探险', writing: '表达工坊', reading: '剧情副本' }

export default function Home() {
  const go = useUI((s) => s.go)
  const profile = useProgress((s) => s.profile)
  const planet = useProgress((s) => s.planet)
  const daily = useProgress((s) => s.daily)
  const progress = useProgress((s) => s.progress)
  const userWords = useProgress((s) => s.userWords)
  const xpToday = daily?.xp ?? 0
  const goal = planet?.dailyGoal ?? 100
  const pct = Math.min(100, Math.round((xpToday / Math.max(goal, 1)) * 100))
  const completedModules = Object.values(daily?.modules ?? {}).filter((n) => n > 0).length
  const dueWords = userWords.filter((word) => word.status !== 'mastered' && word.nextReview <= Date.now()).length
  const radar = progress?.radar
  const weakest = MODULES.reduce((low, key) => (radar?.[key] ?? 0) < (radar?.[low] ?? 0) ? key : low, 'vocab')

  return <div className="adventure-home">
    <header className="mission-heading">
      <div><p><Target size={16} /> 今日任务</p><h1>探索、练习、<span>持续成长。</span></h1><small>不必学很久，只要完成下一站。</small></div>
      <button className="focus-link" onClick={() => go(weakest)}>今日补强：{MODULE_META[weakest].name.split('·')[0]} <ArrowRight size={16} /></button>
    </header>

    <section className="mission-layout" aria-label="今日核心任务">
      <article className="quest-card"><img src="./assets/neon-harbor-quest.png" alt="戴耳机的小狐狸站在夜色港湾，准备展开英语词汇探险" /><div className="quest-copy"><span className="quest-type">词汇探险</span><h2>微光港 · 记忆航线</h2><p>在真实语境里认出新词，让每一次选择都推动故事向前。</p><button className="btn quest-start" onClick={() => go('vocab')}><Play size={17} fill="currentColor" /> 开始任务</button></div></article>
      <aside className="mission-stats" aria-label="学习状态">
        <div className="progress-stat"><div className="progress-ring" style={{ '--progress': `${pct * 3.6}deg` } as React.CSSProperties}><strong>{pct}%</strong><span>今日进度</span></div><div><b>学习进度</b><p>{pct >= 100 ? '今日目标已完成' : `再获得 ${Math.max(0, goal - xpToday)} XP`}</p></div></div>
        <div className="compact-stat"><Flame size={21} /><div><span>连续学习</span><strong>{profile?.streakDays ?? 0}<small> 天</small></strong></div></div>
        <div className="compact-stat"><Star size={21} /><div><span>累计经验</span><strong>{profile?.totalXp ?? 0}<small> XP</small></strong></div></div>
      </aside>
    </section>

    <section className="journey-panel" aria-labelledby="journey-title"><div className="panel-heading"><div><Sparkles size={18} /><h2 id="journey-title">今日旅程</h2></div><p>完成三个短任务，留下比“三分钟热度”更可靠的轨迹。</p></div><div className="journey-track">{JOURNEY.map((item, index) => { const complete = (daily?.modules?.[item.module] ?? 0) > 0; const Icon = item.icon; return <button key={item.module} className={`journey-step ${complete ? 'complete' : ''}`} onClick={() => go(item.module)}><span className="step-icon">{complete ? <Check size={20} /> : <Icon size={20} />}</span><span><strong>{item.title}</strong><small>{complete ? '已完成' : item.note}</small></span>{index < JOURNEY.length - 1 ? <i aria-hidden="true" /> : null}</button> })}</div></section>

    <div className="learning-section-heading"><div><h2>选择你的学习场景</h2><p>六种玩法练习不同能力，难度会随表现自动调整。</p></div><span>{completedModules}/6 今日已探索</span></div>
    <section className="learning-scenes" aria-label="英语学习模块">{MODULES.map((key, index) => { const meta = MODULE_META[key]; const mastery = radar?.[key] ?? 0; return <button key={key} className={`scene-card scene-${index + 1}`} onClick={() => go(key)}><span className="scene-index">0{index + 1}</span><span className="scene-emoji" aria-hidden="true">{meta.icon}</span><span className="scene-copy"><small>{MODULE_LABELS[key]}</small><strong>{meta.name.split('·')[0]}</strong><em>{meta.desc}</em></span><span className="scene-progress"><i style={{ width: `${mastery}%` }} /><small>{mastery}%</small></span><ArrowRight className="scene-arrow" size={18} /></button> })}</section>

    <section className="return-strip"><div className="return-mark"><Trophy size={22} /></div><div><h2>{dueWords > 0 ? `${dueWords} 张记忆卡正在等你` : '今天的复习卡已经清空'}</h2><p>{dueWords > 0 ? '先复习即将遗忘的内容，新知识才会真正留下。' : '可以探索新场景，明天我们会按记忆节奏再次相遇。'}</p></div><button className="btn btn-ghost" onClick={() => go('vocab')}>{dueWords > 0 ? '开始复习' : '继续探索'} <ArrowRight size={16} /></button></section>
  </div>
}
