import { ArrowRight, BookOpen, BookOpenText, Check, Flame, GitBranch, Headphones, PenLine, Play, Puzzle, Sparkles, Star, Target, Trophy } from 'lucide-react'
import type { CSSProperties } from 'react'
import { useUI } from '../store/gameStore'
import { useProgress } from '../store/progressStore'
import { LEARNING_TRACKS, MODULE_META, type LearningTrack, type ModuleKey } from '../types'
import { LEARNING_SCENES } from '../data/learningScenes'
import { isModuleAvailable } from '../data/curriculum'
import SpotlightCard from '../components/ui/SpotlightCard'
import RevealOnScroll from '../components/ui/RevealOnScroll'
import AnimatedNumber from '../components/ui/AnimatedNumber'
import ProgressionPanel from '../components/dashboard/ProgressionPanel'
import ResponsiveSceneImage from '../components/ui/ResponsiveSceneImage'
import WorldMap from '../components/game/WorldMap'
import { CHAPTERS, chapterView } from '../engine/chapters'
import { useNow } from '../hooks/useNow'
import { dayKey } from '../engine/forget'

const MODULES: ModuleKey[] = ['vocab', 'grammar', 'sentence', 'listening', 'writing', 'reading']
const JOURNEY: { module: ModuleKey; title: string; target: number; icon: typeof BookOpen }[] = [
  { module: 'vocab', title: '完成 5 次词汇作答', target: 5, icon: BookOpen },
  { module: 'listening', title: '完成 1 次听力作答', target: 1, icon: Headphones },
  { module: 'sentence', title: '完成 3 次句子练习', target: 3, icon: PenLine }
]
const SCENE_ICONS: Record<ModuleKey, typeof BookOpen> = { vocab: BookOpen, grammar: GitBranch, sentence: Puzzle, listening: Headphones, writing: PenLine, reading: BookOpenText }
const TRACK_ORDER: LearningTrack[] = ['primary', 'middle-high', 'advanced', 'cet']

export default function Home() {
  const go = useUI((s) => s.go)
  const profile = useProgress((s) => s.profile)
  const planet = useProgress((s) => s.planet)
  const storedDaily = useProgress((s) => s.daily)
  const progress = useProgress((s) => s.progress)
  const userWords = useProgress((s) => s.userWords)
  const now = useNow()
  const daily = storedDaily?.date === dayKey(now) ? storedDaily : null
  const xpToday = daily?.xp ?? 0
  const goal = planet?.dailyGoal ?? 100
  const pct = Math.min(100, Math.round((xpToday / Math.max(goal, 1)) * 100))
  const completedModules = Object.values(daily?.modules ?? {}).filter((n) => n > 0).length
  const dueWords = userWords.filter((word) => word.nextReview <= now).length
  const radar = progress?.radar
  const track = useUI((s) => s.track)
  const setTrack = useUI((s) => s.setTrack)
  const trackMeta = LEARNING_TRACKS[track]
  const weakest = MODULES.filter(key => isModuleAvailable(track, key)).reduce((low, key) => (radar?.[key] ?? 0) < (radar?.[low] ?? 0) ? key : low, 'vocab')
  const journey = JOURNEY.map(item => isModuleAvailable(track, item.module) ? item : { module: 'grammar' as const, title: '完成 3 次语法作答', target: 3, icon: GitBranch })
  const mapChapters = chapterView(CHAPTERS, progress?.chapterStars ?? {}, (module) => isModuleAvailable(track, module), track)
  const stardust = progress?.stardust ?? 0

  return <div className="adventure-home">
    <header className="mission-heading">
      <div><p><Target size={16} /> 今日任务 · {trackMeta.shortLabel}</p><h1>探索、练习、<span>持续成长。</span></h1><small>{trackMeta.goal}。不必学很久，只要完成下一站。</small></div>
      <button className="focus-link" onClick={() => go(weakest)}>今日补强：{MODULE_META[weakest].name.split('·')[0]} <ArrowRight size={16} /></button>
    </header>

    <section className="track-switcher" aria-label="选择学习阶段">
      <div className="track-switcher-copy"><span>学习路线</span><strong>{trackMeta.label}</strong><small>{trackMeta.description}</small></div>
      <div className="track-options">{TRACK_ORDER.map((key) => <button key={key} aria-pressed={track === key} className={`track-option ${track === key ? 'active' : ''}`} style={{ '--track-accent': LEARNING_TRACKS[key].accent } as CSSProperties} onClick={() => setTrack(key)}>{LEARNING_TRACKS[key].shortLabel}<small>{key === 'primary' ? '图像启蒙' : key === 'cet' ? '目标冲刺' : '能力进阶'}</small></button>)}</div>
    </section>

    <section className="mission-layout" aria-label="今日核心任务">
      <article className="quest-card"><ResponsiveSceneImage assetStem="neon-harbor-quest" eager sizes="(max-width: 640px) 100vw, 65vw" alt="戴耳机的小狐狸站在夜色港湾，准备展开英语词汇探险" /><div className="quest-copy"><span className="quest-type">词汇探险</span><h2>微光港 · 记忆航线</h2><p>在真实语境里认出新词，让每一次选择都推动故事向前。</p><button className="btn quest-start" onClick={() => go('vocab')}><Play size={17} fill="currentColor" /> 开始任务</button></div></article>
      <aside className="mission-stats" aria-label="学习状态">
        <div className="progress-stat"><div className="progress-ring" style={{ '--progress': `${pct * 3.6}deg` } as React.CSSProperties}><strong>{pct}%</strong><span>今日进度</span></div><div><b>学习进度</b><p>{pct >= 100 ? '今日目标已完成' : `再获得 ${Math.max(0, goal - xpToday)} XP`}</p></div></div>
        <div className="compact-stat"><Flame size={21} /><div><span>连续学习</span><strong>{profile?.streakDays ?? 0}<small> 天</small></strong></div></div>
        <div className="compact-stat"><Star size={21} /><div><span>累计经验</span><strong>{profile?.totalXp ?? 0}<small> XP</small></strong></div></div>
      </aside>
    </section>

    <ProgressionPanel />
    <div className="learning-section-heading"><div><h2>航线地图</h2><p>沿暮色海港依次点亮六座灯塔，每一站都会留下星级与星尘。</p></div><span>{mapChapters.filter(chapter => chapter.stars > 0).length}/6 已点亮 · 星尘 {stardust}</span></div>
    <WorldMap chapters={mapChapters} onEnter={(chapter) => go(chapter.module)} />

    <RevealOnScroll><section className="journey-panel" aria-labelledby="journey-title"><div className="panel-heading"><div><Sparkles size={18} /><h2 id="journey-title">今日旅程</h2></div><p>完成三个短任务，留下比“三分钟热度”更可靠的轨迹。</p></div><div className="journey-track">{journey.map((item, index) => { const count = daily?.modules?.[item.module] ?? 0; const complete = count >= item.target; const Icon = item.icon; return <button key={item.module} className={`journey-step ${complete ? 'complete' : ''}`} onClick={() => go(item.module)}><span className="step-icon">{complete ? <Check size={20} /> : <Icon size={20} />}</span><span><strong>{item.title}</strong><small>{complete ? '已完成' : `${count}/${item.target} 次作答`}</small></span>{index < JOURNEY.length - 1 ? <i aria-hidden="true" /> : null}</button> })}</div></section></RevealOnScroll>

    <div className="learning-section-heading"><div><h2>快速进入训练模块</h2><p>不受章节解锁限制，直接进入任意模块练习；进度同样计入航线。</p></div><span><AnimatedNumber value={completedModules} />/6 今日已探索</span></div>
    <section className="learning-scenes" aria-label="英语学习模块">{MODULES.map((key, index) => { const meta = MODULE_META[key]; const mastery = radar?.[key] ?? 0; const scene = LEARNING_SCENES[index]; const Icon = SCENE_ICONS[key]; const available = isModuleAvailable(track, key); return <SpotlightCard key={key} as={available ? 'button' : 'div'} aria-disabled={available ? undefined : 'true'} className={`scene-card scene-${index + 1} ${available ? '' : 'scene-muted'}`} onClick={available ? () => go(key) : undefined}><ResponsiveSceneImage className="scene-visual" assetStem={scene.visual} sizes="(max-width: 640px) 100vw, (max-width: 900px) 50vw, 33vw" alt={`${scene.title}学习场景插画`} /><span className="scene-shade" /><span className="scene-index">0{index + 1}</span><span className="scene-icon" aria-hidden="true"><Icon size={19} /></span><span className="scene-copy"><small>{scene.eyebrow}</small><strong>{scene.title}</strong><em>{available ? scene.prompt : '此路线暂未开放'}</em></span><span className="scene-progress"><i style={{ width: `${mastery}%` }} /><small>{mastery}%</small></span><ArrowRight className="scene-arrow" size={18} /></SpotlightCard> })}</section>

    <section className="return-strip"><div className="return-mark"><Trophy size={22} /></div><div><h2>{dueWords > 0 ? `${dueWords} 张记忆卡正在等你` : '今天的复习卡已经清空'}</h2><p>{dueWords > 0 ? '先复习即将遗忘的内容，新知识才会真正留下。' : '可以探索新场景，明天我们会按记忆节奏再次相遇。'}</p></div><button className="btn btn-ghost" onClick={() => go('vocab')}>{dueWords > 0 ? '开始复习' : '继续探索'} <ArrowRight size={16} /></button></section>
  </div>
}
