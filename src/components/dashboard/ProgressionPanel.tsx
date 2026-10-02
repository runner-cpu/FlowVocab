import { useEffect, useState } from 'react'
import { Check, Gift, LockKeyhole, Trophy } from 'lucide-react'
import { useProgress, emptyDaily } from '../../store/progressStore'
import { ACHIEVEMENTS, deriveProfileProgress } from '../../store/progressModel'
import { dayKey } from '../../engine/forget'
import './ProgressionPanel.css'

const PLANET_STAGES = ['微光初现', '新芽萌发', '草甸苏醒', '溪流汇聚', '森林生长', '群山起伏', '云海环绕', '星环闪耀', '极光绽放', '生命繁盛']

export function SaveStatus() {
  const error = useProgress(s => s.saveError)
  const retry = useProgress(s => s.retrySave)
  const [saving, setSaving] = useState(false)
  if (!error) return null
  return <div className="save-status" role="alert"><span>{error}</span><button className="btn btn-ghost" aria-label="重试保存" disabled={saving} onClick={async () => { setSaving(true); try { await retry() } finally { setSaving(false) } }}>{saving ? '正在保存…' : '重试保存'}</button></div>
}

export default function ProgressionPanel({ achievements = false }: { achievements?: boolean }) {
  const profile = useProgress(s => s.profile)
  const planet = useProgress(s => s.planet)
  const storedDaily = useProgress(s => s.daily)
  const words = useProgress(s => s.userWords)
  const claim = useProgress(s => s.claimDailyChest)
  const [today, setToday] = useState(() => dayKey(Date.now()))
  const [claiming, setClaiming] = useState(false)
  const [claimError, setClaimError] = useState<string | null>(null)
  useEffect(() => {
    const refresh = () => setToday(dayKey(Date.now()))
    const timer = window.setInterval(refresh, 1000)
    window.addEventListener('focus', refresh)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [])
  if (!profile || !planet) return null
  const daily = storedDaily?.date === today ? storedDaily : emptyDaily(today)
  const model = deriveProfileProgress(profile, daily, planet, words)
  return <section className="progression-panel card" aria-label={achievements ? '成长成就' : '每日成长任务'}>
    <div className="profile-level"><div><span className="level-badge">LV {model.level + 1}</span><strong>探索者等级</strong></div><span>{model.nextXp ? `${model.currentXp} / ${model.nextXp} XP` : '已达最高等级'}</span></div>
    <div className="profile-xp-track" role="progressbar" aria-label="等级经验" aria-valuemin={0} aria-valuemax={model.nextXp || 1} aria-valuenow={model.nextXp ? model.currentXp : 1}><i style={{ width: `${model.progressPercent}%` }} /></div>
    {achievements ? <>
      <h2 className="progression-title"><Trophy size={18} aria-hidden="true" />成就墙</h2>
      <div className="achievement-wall">{ACHIEVEMENTS.map(achievement => {
        const unlocked = model.unlockedAchievementIds.includes(achievement.id)
        return <article className={`achievement-tile ${unlocked ? 'unlocked' : ''}`} key={achievement.id} aria-label={`${achievement.title}，${unlocked ? '已解锁' : '未解锁'}，${achievement.criterion}`}><span className="achievement-icon" aria-hidden="true">{unlocked ? <Trophy size={20} /> : <LockKeyhole size={20} />}</span><strong>{achievement.title}</strong><p>{achievement.criterion}</p><small>{unlocked ? '已解锁' : '等待解锁'}</small></article>
      })}</div>
      <h2 className="progression-title">星球成长 · {model.planetLevel}/10 阶段</h2>
      <p className="planet-stage-note">每积累 250 能量，星球进入一个新阶段。{model.planetLevel === 0 ? '下一站：微光初现。' : `当前：${PLANET_STAGES[model.planetLevel - 1]}。`}</p>
      <ol className="planet-stages" aria-label="星球十阶段">{PLANET_STAGES.map((stage, index) => <li key={stage} className={model.planetLevel >= index + 1 ? 'reached' : ''} aria-current={model.planetLevel === index + 1 ? 'step' : undefined}><span>{String(index + 1).padStart(2, '0')}</span>{stage}</li>)}</ol>
    </> : <div className="daily-quest-layout">
      <ul className="daily-quests">{model.quests.map(quest => <li key={quest.id}><span className={`quest-check ${quest.complete ? 'complete' : ''}`} aria-label={quest.complete ? '已完成' : '未完成'}>{quest.complete ? <Check size={15} aria-hidden="true" /> : null}</span><span>{quest.title}<small>{Math.min(quest.value, quest.target)}/{quest.target}</small></span><strong>+{quest.rewardXp} XP{quest.claimed ? ' · 已获得' : ''}</strong></li>)}</ul>
          <div className="daily-chest"><Gift size={26} aria-hidden="true" /><strong>每日补给 · 50 能量</strong><small>任务完成自动获得 XP，全部完成可领取宝箱。</small><button className="btn btn-ghost" disabled={model.chest !== 'available' || claiming} aria-label={`每日宝箱，${model.chest === 'claimed' ? '今日已领取' : model.chest === 'available' ? '领取 50 能量' : '完成三项任务后解锁'}`} onClick={async () => { setClaiming(true); setClaimError(null); try { await claim() } catch { setClaimError('宝箱领取失败，请检查本地存储后重试') } finally { setClaiming(false) } }}>{claiming ? '正在领取…' : model.chest === 'claimed' ? '今日已领取' : model.chest === 'available' ? '领取宝箱' : '完成任务解锁'}</button>{claimError && <p className="settings-message" role="alert">{claimError}</p>}</div>
    </div>}
  </section>
}
