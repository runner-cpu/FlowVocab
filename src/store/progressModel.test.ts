import { describe, expect, it } from 'vitest'
import { deriveProfileProgress } from './progressModel'
import type { DailyStat, Planet, UserProfile, UserWord } from '../types'

const profile: UserProfile = { id: 1, totalXp: 0, bestCombo: 0, streakDays: 0, createdAt: 0, lastStudyDate: null, claimedQuestDates: [], unlockedAchievements: [], settings: { zenMode: true, volume: 0, voiceRate: 1 } }
const daily: DailyStat = { date: '2026-09-24', xp: 0, energy: 0, comboMax: 0, modules: { vocab: 0, grammar: 0, sentence: 0, listening: 0, writing: 0, reading: 0 } }
const planet: Planet = { id: 1, energy: 0, level: 0, lastActive: 0, dailyGoal: 100 }
const derive = (p = profile, d = daily, words: UserWord[] = []) => deriveProfileProgress(p, d, planet, words)

describe('profile progression', () => {
  it.each([[0, 0, 0, 500], [499, 0, 499, 500], [500, 1, 0, 1000], [1499, 1, 999, 1000]])('derives XP %i without skipping a level', (xp, level, currentXp, nextXp) => {
    expect(derive({ ...profile, totalXp: xp })).toMatchObject({ level, currentXp, nextXp })
  })
  it('caps the final level with a filled progress indicator', () => {
    expect(derive({ ...profile, totalXp: 30000 })).toMatchObject({ level: 9, nextXp: 0, progressPercent: 100 })
  })
  it('keeps quests incomplete below 10 answers, 80 XP and 5 combo', () => {
    const result = derive(profile, { ...daily, xp: 79, comboMax: 4, modules: { ...daily.modules, vocab: 9 } })
    expect(result.quests.map(q => q.complete)).toEqual([false, false, false])
    expect(result.chest).toBe('locked')
  })
  it('unlocks the chest only when all three quests complete, with exact rewards', () => {
    const d = { ...daily, xp: 80, comboMax: 5, modules: { ...daily.modules, vocab: 7, grammar: 3 } }
    const result = derive(profile, d)
    expect(result.quests.map(q => [q.complete, q.rewardXp])).toEqual([[true, 20], [true, 25], [true, 30]])
    expect(result.chest).toBe('available')
    expect(derive({ ...profile, claimedQuestDates: [d.date] }, d).chest).toBe('claimed')
    expect(derive(profile, { ...d, comboMax: 4 }).chest).toBe('locked')
  })
  it('unlocks first answer even when no XP was earned', () => {
    expect(derive().unlockedAchievementIds).toEqual([])
    expect(derive(profile, { ...daily, modules: { ...daily.modules, reading: 1 } }).unlockedAchievementIds).toContain('first-answer')
  })
  it('unlocks streak, mastery and combo at their boundaries and retains past achievements', () => {
    const words = Array.from({ length: 100 }, (_, i) => ({ id: String(i), wordId: String(i), status: 'mastered', successfulReviews: 3, correct: 3, total: 3, lastReview: 1, nextReview: 2, interval: 1, quality: 5 } as UserWord))
    expect(derive({ ...profile, streakDays: 6, bestCombo: 19 }, daily, words.slice(1)).unlockedAchievementIds).toEqual([])
    expect(derive({ ...profile, streakDays: 7, bestCombo: 20 }, daily, words).unlockedAchievementIds).toEqual(expect.arrayContaining(['streak-7', 'mastered-100', 'combo-20']))
    expect(derive({ ...profile, unlockedAchievements: ['streak-7'] }).unlockedAchievementIds).toContain('streak-7')
  })
})
