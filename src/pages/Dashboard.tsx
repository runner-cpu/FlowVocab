import { useCallback, useMemo, useState } from 'react'
import { useProgress } from '../store/progressStore'
import PlanetView from '../components/dashboard/PlanetView'
import Heatmap from '../components/dashboard/Heatmap'
import RadarChart from '../components/dashboard/RadarChart'
import DifficultyFlow from '../components/dashboard/DifficultyFlow'
import { useUI } from '../store/gameStore'
import { MODULE_META, type ModuleKey } from '../types'
import { Activity, ArrowUpRight, BarChart3, Flame, Sparkles, Target, TimerReset } from 'lucide-react'
import AnimatedNumber from '../components/ui/AnimatedNumber'
import SpotlightCard from '../components/ui/SpotlightCard'
import ProgressionPanel from '../components/dashboard/ProgressionPanel'
import { planetLevelFromEnergy } from '../engine/progression'
import WordForest from '../components/dashboard/WordForest'
import { findStoredWordLevel } from '../store/wordBank'
import { useNow } from '../hooks/useNow'
import { dayKey } from '../engine/forget'
import { isModuleAvailable } from '../data/curriculum'

export default function Dashboard() {
  const profile = useProgress((s) => s.profile)
  const planet = useProgress((s) => s.planet)
  const storedDaily = useProgress((s) => s.daily)
  const go = useUI((s) => s.go)
  const radar = useProgress((s) => s.progress?.radar)
  const userWords = useProgress((s) => s.userWords)
  const now = useNow()
  const daily = storedDaily?.date === dayKey(now) ? storedDaily : null
  const track = useUI(state => state.track)
  const todayKey = dayKey(now)
  const [range, setRange] = useState<7 | 30 | 90>(90)
  const [selected, setSelected] = useState<ModuleKey | null>(null)
  const radarEntries = (Object.entries(radar ?? {}) as [ModuleKey, number][]).sort((a, b) => b[1] - a[1])
  const strongest = radarEntries[0]
  const availableEntries = radarEntries.filter(([module]) => isModuleAvailable(track, module))
  const weakest = availableEntries[availableEntries.length - 1]
  const isFirstStudy = radarEntries.length === 0 || radarEntries.every(([, value]) => value === 0)
  const selectModule = useCallback((module: ModuleKey) => { setSelected(module); go(module) }, [go])
  const reviewWord = useCallback(async (wordId: string) => {
    const level = await findStoredWordLevel(wordId).catch(() => null)
    useUI.getState().reviewWord(wordId, level ?? undefined)
  }, [])
  const reviewLoad = useMemo(() => {
    const day = 86400000
    return [
      { label: '今日到期', value: userWords.filter((word) => word.nextReview <= now).length, tone: 'coral' },
      { label: '未来 3 天', value: userWords.filter((word) => word.nextReview > now && word.nextReview <= now + 3 * day).length, tone: 'blue' },
      { label: '已掌握', value: userWords.filter((word) => word.status === 'mastered').length, tone: 'mint' }
    ]
  }, [userWords, now])

  return (
    <div className="growth-page">
      <div className="growth-heading"><div><div className="growth-kicker"><Activity size={15} /> 学习数据</div><h1>成长图谱</h1><p>看见自己的进步，找到下一步的方向。</p></div><div className="range-switcher" role="group" aria-label="热力图时间范围">{([7, 30, 90] as const).map((item) => <button key={item} aria-pressed={range === item} className={range === item ? 'active' : ''} onClick={() => setRange(item)}>{item}天</button>)}</div></div>
      <div className="stat-row">
        <div className="stat"><div className="v"><AnimatedNumber value={profile?.totalXp ?? 0} /></div><div className="k">累计 XP</div></div>
        <div className="stat"><div className="v"><AnimatedNumber value={profile?.bestCombo ?? 0} /></div><div className="k">最佳连击</div></div>
        <div className="stat"><div className="v"><AnimatedNumber value={daily?.comboMax ?? 0} /></div><div className="k">今日最佳连击</div></div>
        <div className="stat"><div className="v"><AnimatedNumber value={Math.floor(planet?.energy ?? 0)} /></div><div className="k">星球能量</div></div>
        <div className="stat"><div className="v">{planetLevelFromEnergy(planet?.energy ?? 0)}/10</div><div className="k">星球等级</div></div>
      </div>

      <ProgressionPanel achievements />
      <div className="insight-banner">
        <div className="insight-mark"><Sparkles size={20} /></div>
        <div className="insight-copy"><strong>成长提示</strong>{isFirstStudy ? <p>完成第一轮练习后，这里会显示你的能力变化</p> : <p>{strongest ? MODULE_META[strongest[0]].name.split('·')[0] : '词汇'} 的练习进度为 {strongest?.[1] ?? 0}%。建议继续练习 {weakest ? MODULE_META[weakest[0]].name.split('·')[0] : '词汇'}。这些数值反映本站练习记录，不代表考试能力评分。</p>}</div>
        <button className="btn btn-ghost" onClick={() => go(isFirstStudy ? 'vocab' : weakest?.[0] ?? 'vocab')}>{isFirstStudy ? '开始第一轮练习' : '去补强 →'}</button>
      </div>

      <div className="grid mt20" style={{ alignItems: 'stretch' }}>
        <div className="card chart-interactive">
          <div className="card-title"><Target size={16} /> 六维能力雷达 <span className="chart-hint">点击维度进入训练</span></div>
          <RadarChart onModuleSelect={selectModule} />
          <div className="radar-links">{radarEntries.map(([module, value]) => <button key={module} className={selected === module ? 'active' : ''} onClick={() => { setSelected(module); go(module) }}><span style={{ background: MODULE_META[module].color }} />{MODULE_META[module].name.split('·')[0]}<strong>{value}%</strong></button>)}</div>
        </div>
        <div className="card">
          <div className="card-title"><span className="title-orb" />词汇星球</div>
          <PlanetView />
        </div>
      </div>

      <div className="card review-load-card">
        <div className="card-title"><TimerReset size={16} /> 复习负担 <span className="chart-hint">根据记忆节奏自动安排</span></div>
        <div className="review-load-grid">{reviewLoad.map((item) => {
          const due = item.label === '今日到期'
          return <SpotlightCard
            key={item.label}
            as={due ? 'button' : 'div'}
            disabled={due ? item.value === 0 : undefined}
            className={`review-load-item ${item.tone}`}
            onClick={due && item.value > 0 ? () => go('vocab') : undefined}
            aria-label={due ? `今日到期 ${item.value} 个词${item.value > 0 ? '，开始复习' : ''}` : undefined}
          >
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{due ? (item.value > 0 ? '点击开始复习' : '暂无到期') : item.label === '未来 3 天' ? '提前预览' : '稳固记忆'}</small>
          </SpotlightCard>
        })}</div>
      </div>

      <WordForest words={userWords} onReview={reviewWord} onStart={() => go('vocab')} />

      <div className="card">
        <div className="card-title"><Activity size={16} /> 难度流 · 心流质量</div>
        <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
          曲线反映你每轮答题时难度随表现的变化。理想心流：难度在挑战中温和爬升、偶有回落。
        </p>
        <DifficultyFlow />
      </div>

      <div className="card">
        <div className="card-title"><Flame size={16} /> 学习热力图（近 {range} 天）</div>
        <Heatmap days={range} today={todayKey} />
      </div>
    </div>
  )
}
