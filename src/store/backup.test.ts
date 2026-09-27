import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { exportProgressBackup, importProgressBackup } from './backup'

const profile = { id: 1, totalXp: 12, bestCombo: 3, streakDays: 2, lastStudyDate: null, claimedQuestDates: [], unlockedAchievements: [], createdAt: 1, settings: { zenMode: false, volume: .8, voiceRate: .9 } }
const progress = { id: 1, radar: { vocab: 0, grammar: 0, sentence: 0, listening: 0, writing: 0, reading: 0 }, skillTree: {}, cards: [], narrative: {}, writingLog: [], sentencePassed: 0, listeningPassed: 0, writingDone: 0, writingScoreSum: 0, readingDone: 0 }
const planet = { id: 1, energy: 4, level: 0, lastActive: 1, dailyGoal: 100 }

beforeEach(async () => {
  await db.delete(); await db.open()
  await db.userProfile.put(profile)
  await db.userWords.put({ id: 'u1', wordId: 'bank-1', status: 'learning', correct: 1, total: 2, lastReview: 1, nextReview: 2, interval: 1, quality: 3, successfulReviews: 1 })
  await db.dailyStats.put({ date: '2026-09-27', xp: 12, energy: 4, comboMax: 3, modules: { vocab: 1, grammar: 0, sentence: 0, listening: 0, writing: 0, reading: 0 } })
  await db.sessions.put({ id: 1, time: 1, module: 'vocab', comboMax: 3, correct: 1, total: 2, difficultyFlow: [1], energy: 4 })
  await db.progress.put(progress); await db.planet.put(planet)
  await db.wordBank.put({ id: 'bank-1', word: 'retain', phonetic: '', meaning: 'keep', example: '', exampleCn: '', level: 0, pos: 'v' })
  await db.wordBankMeta.put({ id: 1, version: 1, total: 1, updatedAt: 1 })
})
afterEach(async () => { await db.delete() })

describe('local progress backup', () => {
  it('exports only user-owned tables in the versioned format', async () => {
    const backup = await exportProgressBackup()
    expect(backup).toMatchObject({ format: 'flowvocab-backup', version: 1, profile, progress, planet })
    expect(Date.parse(backup.exportedAt)).toBeTruthy()
    expect(backup).not.toHaveProperty('wordBank')
    expect(backup).not.toHaveProperty('wordBankMeta')
  })

  it('replaces every user table while retaining the lexical bank', async () => {
    const next = await exportProgressBackup()
    next.profile.totalXp = 99; next.userWords = []; next.dailyStats = []; next.sessions = []
    next.progress.sentencePassed = 8; next.planet.energy = 88
    await importProgressBackup(next)
    expect(await db.userProfile.get(1)).toMatchObject({ totalXp: 99 })
    expect(await db.userWords.count()).toBe(0)
    expect(await db.dailyStats.count()).toBe(0)
    expect(await db.sessions.count()).toBe(0)
    expect(await db.progress.get(1)).toMatchObject({ sentencePassed: 8 })
    expect(await db.planet.get(1)).toMatchObject({ energy: 88 })
    expect(await db.wordBank.get('bank-1')).toMatchObject({ word: 'retain' })
  })

  it('rejects malformed data without changing stored progress', async () => {
    const invalid = { ...(await exportProgressBackup()), version: 2 }
    await expect(importProgressBackup(invalid)).rejects.toThrow()
    expect(await db.userProfile.get(1)).toEqual(profile)
    expect(await db.userWords.count()).toBe(1)
  })

  it('rolls back all user tables when an import write fails', async () => {
    const next = await exportProgressBackup(); next.profile.totalXp = 99
    const fail = () => { throw new Error('disk full') }
    db.progress.hook('creating', fail)
    try { await expect(importProgressBackup(next)).rejects.toThrow('disk full') } finally { db.progress.hook('creating').unsubscribe(fail) }
    expect(await db.userProfile.get(1)).toEqual(profile)
    expect(await db.progress.get(1)).toEqual(progress)
  })
})
