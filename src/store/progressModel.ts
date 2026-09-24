import { levelFromXp, planetLevelFromEnergy, XP_LEVEL_THRESHOLDS } from '../engine/progression'
import type { DailyStat, Planet, UserProfile, UserWord } from '../types'

export const ACHIEVEMENTS = [
  { id: 'first-answer', title: '初次启航', criterion: '完成第一次作答' },
  { id: 'streak-7', title: '七日航迹', criterion: '连续学习 7 天' },
  { id: 'mastered-100', title: '记忆领航员', criterion: '掌握 100 个单词' },
  { id: 'combo-20', title: '连击之星', criterion: '达成 20 连击' }
] as const

export interface DailyQuest {
  id: string
  title: string
  value: number
  target: number
  rewardXp: number
  complete: boolean
  claimed: boolean
}
export interface ProfileProgress {
  level: number
  currentXp: number
  nextXp: number
  progressPercent: number
  quests: DailyQuest[]
  unlockedAchievementIds: string[]
  chest: 'locked' | 'available' | 'claimed'
  planetLevel: number
}

export function deriveProfileProgress(profile: UserProfile, daily: DailyStat, planet: Planet, userWords: UserWord[]): ProfileProgress {
  const level = levelFromXp(profile.totalXp)
  const currentXp = Math.max(0, profile.totalXp - XP_LEVEL_THRESHOLDS[level])
  const nextXp = level === XP_LEVEL_THRESHOLDS.length - 1 ? 0 : XP_LEVEL_THRESHOLDS[level + 1] - XP_LEVEL_THRESHOLDS[level]
  const answers = Object.values(daily.modules).reduce((sum, count) => sum + count, 0)
  const claims = profile.claimedQuestDates ?? []
  const quests = [
    { id: 'answers', title: '完成 10 次作答', value: answers, target: 10, rewardXp: 20 },
    { id: 'xp', title: '获得 80 XP', value: daily.xp, target: 80, rewardXp: 25 },
    { id: 'combo', title: '达成 5 连击', value: daily.comboMax, target: 5, rewardXp: 30 }
  ].map(q => ({ ...q, complete: q.value >= q.target, claimed: claims.includes(`${daily.date}:${q.id}`) }))
  const unlocked = new Set(profile.unlockedAchievements ?? [])
  if (answers > 0 || profile.lastStudyDate || profile.totalXp > 0) unlocked.add('first-answer')
  if (profile.streakDays >= 7) unlocked.add('streak-7')
  if (userWords.filter(w => w.status === 'mastered').length >= 100) unlocked.add('mastered-100')
  if (Math.max(profile.bestCombo, daily.comboMax) >= 20) unlocked.add('combo-20')
  return { level, currentXp, nextXp, progressPercent: nextXp ? Math.min(100, currentXp / nextXp * 100) : 100, quests, unlockedAchievementIds: [...unlocked], chest: claims.includes(daily.date) ? 'claimed' : quests.every(q => q.complete) ? 'available' : 'locked', planetLevel: planetLevelFromEnergy(planet.energy) }
}
