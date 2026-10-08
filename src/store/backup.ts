import { db } from './db'
import { normalizeSuccessfulReviews } from '../engine/forget'
import { pausePersistenceWrites, useProgress } from './progressStore'
import type { DailyStat, ModuleKey, Planet, Progress, Session, UserProfile, UserWord } from '../types'

export interface FlowVocabBackupV1 {
  format: 'flowvocab-backup'
  version: 1
  exportedAt: string
  profile: UserProfile
  userWords: UserWord[]
  dailyStats: DailyStat[]
  sessions: Session[]
  progress: Progress
  planet: Planet
}

const modules: ModuleKey[] = ['vocab', 'grammar', 'sentence', 'listening', 'writing', 'reading']
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const count = (value: unknown): value is number => finite(value) && Number.isInteger(value) && value >= 0
const nonNegative = (value: unknown): value is number => finite(value) && value >= 0
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const idOne = (value: unknown): value is Record<string, unknown> & { id: 1 } => object(value) && value.id === 1
const validDay = (value: unknown): value is string => {
  if (typeof value !== 'string') return false
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const year = Number(match[1]); const month = Number(match[2]); const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

function fail(message: string): never { throw new Error(`Invalid FlowVocab backup: ${message}`) }
function moduleCounts(value: unknown): value is Record<ModuleKey, number> {
  return object(value) && modules.every((key) => count(value[key]))
}
function normalizeProfile(value: unknown): UserProfile {
  if (!idOne(value) || !count(value.totalXp) || !count(value.bestCombo) || !count(value.streakDays) || !nonNegative(value.createdAt) || !object(value.settings)) fail('profile')
  const settings = value.settings
  if (typeof settings.zenMode !== 'boolean' || !finite(settings.volume) || settings.volume < 0 || settings.volume > 1 || !finite(settings.voiceRate) || settings.voiceRate < .6 || settings.voiceRate > 1.4) fail('settings')
  if (value.lastStudyDate !== null && !validDay(value.lastStudyDate)) fail('lastStudyDate')
  if (value.claimedQuestDates !== undefined && (!Array.isArray(value.claimedQuestDates) || !value.claimedQuestDates.every((x) => typeof x === 'string' && validDay(x.slice(0, 10))))) fail('claimedQuestDates')
  if (value.unlockedAchievements !== undefined && (!Array.isArray(value.unlockedAchievements) || !value.unlockedAchievements.every((x) => typeof x === 'string'))) fail('unlockedAchievements')
  return { id: 1, totalXp: value.totalXp, bestCombo: value.bestCombo, streakDays: value.streakDays, createdAt: value.createdAt, lastStudyDate: value.lastStudyDate ?? null, claimedQuestDates: value.claimedQuestDates ?? [], unlockedAchievements: value.unlockedAchievements ?? [], settings: { zenMode: settings.zenMode, volume: settings.volume, voiceRate: settings.voiceRate } }
}
function normalizeWord(value: unknown): UserWord {
  if (!object(value) || typeof value.id !== 'string' || value.id.length === 0 || typeof value.wordId !== 'string' || value.wordId.length === 0 || !['new', 'learning', 'mastered'].includes(String(value.status)) || !count(value.correct) || !count(value.total) || value.correct > value.total || !nonNegative(value.nextReview) || !nonNegative(value.interval) || !count(value.quality) || value.quality > 5 || (value.lastReview !== null && !nonNegative(value.lastReview)) || (value.successfulReviews !== undefined && !count(value.successfulReviews))) fail('userWords')
  return { id: value.id, wordId: value.wordId, status: value.status as UserWord['status'], correct: value.correct, total: value.total, lastReview: value.lastReview as number | null, nextReview: value.nextReview, interval: value.interval, quality: value.quality, successfulReviews: normalizeSuccessfulReviews(value.status as UserWord['status'], finite(value.successfulReviews) ? value.successfulReviews : undefined) }
}
function normalizeDaily(value: unknown): DailyStat {
  if (!object(value) || !validDay(value.date) || !count(value.xp) || !nonNegative(value.energy) || !count(value.comboMax) || !moduleCounts(value.modules)) fail('dailyStats')
  return value as unknown as DailyStat
}
function normalizeSession(value: unknown): Session {
  if (!object(value) || !count(value.id) || !nonNegative(value.time) || !modules.includes(value.module as ModuleKey) || !count(value.comboMax) || !count(value.correct) || !count(value.total) || value.correct > value.total || !nonNegative(value.energy) || !Array.isArray(value.difficultyFlow) || !value.difficultyFlow.every((level) => count(level) && level <= 4)) fail('sessions')
  return value as unknown as Session
}
function normalizeProgress(value: unknown): Progress {
  if (!idOne(value)) fail('progress')
  const radar = object(value.radar) ? value.radar : null
  if (!radar || !modules.every((key) => nonNegative(radar[key]) && radar[key] <= 100) || !object(value.skillTree) || !Array.isArray(value.cards) || !object(value.narrative) || !Array.isArray(value.writingLog) || !['sentencePassed', 'listeningPassed', 'writingDone', 'writingScoreSum', 'readingDone'].every((key) => count(value[key]))) fail('progress')
  if (!Object.values(value.skillTree).every((item) => typeof item === 'boolean') || !Object.values(value.narrative).every((item) => typeof item === 'string') || !value.cards.every((x) => typeof x === 'string') || !value.writingLog.every((x) => object(x) && typeof x.taskId === 'string' && nonNegative(x.score) && x.score <= 5 && nonNegative(x.time))) fail('progress fields')
  for (const key of ['legacySentenceFloor', 'legacyListeningFloor'] as const) if (value[key] !== undefined && !count(value[key])) fail(key)
  for (const key of ['completedSentenceIds', 'completedListeningIds'] as const) {
    const ids = value[key]
    if (ids !== undefined && (!Array.isArray(ids) || !ids.every(id => typeof id === 'string' && id.length > 0) || new Set(ids).size !== ids.length)) fail(key)
  }
  if (value.stardust !== undefined && !count(value.stardust)) fail('stardust')
  if (value.chapterStars !== undefined) {
    if (!object(value.chapterStars) || !Object.entries(value.chapterStars).every(([id, stars]) => id.length > 0 && count(stars) && stars <= 3)) fail('chapterStars')
  }
  return value as unknown as Progress
}
function normalizePlanet(value: unknown): Planet {
  if (!idOne(value) || !nonNegative(value.energy) || !count(value.level) || value.level > 10 || !nonNegative(value.lastActive) || !count(value.dailyGoal) || value.dailyGoal === 0) fail('planet')
  return value as unknown as Planet
}

function validate(value: unknown): FlowVocabBackupV1 {
  if (!object(value) || value.format !== 'flowvocab-backup' || value.version !== 1 || typeof value.exportedAt !== 'string' || !Number.isFinite(Date.parse(value.exportedAt)) || !Array.isArray(value.userWords) || !Array.isArray(value.dailyStats) || !Array.isArray(value.sessions)) fail('format')
  const userWords = value.userWords.map(normalizeWord)
  const dailyStats = value.dailyStats.map(normalizeDaily)
  const sessions = value.sessions.map(normalizeSession)
  if (new Set(userWords.map((word) => word.id)).size !== userWords.length || new Set(userWords.map((word) => word.wordId)).size !== userWords.length) fail('duplicate userWords')
  if (new Set(dailyStats.map((stat) => stat.date)).size !== dailyStats.length) fail('duplicate dailyStats')
  if (new Set(sessions.map((session) => session.id)).size !== sessions.length) fail('duplicate sessions')
  return { format: 'flowvocab-backup', version: 1, exportedAt: value.exportedAt, profile: normalizeProfile(value.profile), userWords, dailyStats, sessions, progress: normalizeProgress(value.progress), planet: normalizePlanet(value.planet) }
}

export async function exportProgressBackup(): Promise<FlowVocabBackupV1> {
  const release = await pausePersistenceWrites()
  try {
    return await db.transaction('r', [db.userProfile, db.userWords, db.dailyStats, db.sessions, db.progress, db.planet], async () => {
      const [profile, userWords, dailyStats, sessions, progress, planet] = await Promise.all([db.userProfile.get(1), db.userWords.toArray(), db.dailyStats.toArray(), db.sessions.toArray(), db.progress.get(1), db.planet.get(1)])
      return validate({ format: 'flowvocab-backup', version: 1, exportedAt: new Date().toISOString(), profile, userWords, dailyStats, sessions, progress, planet })
    })
  } finally { release() }
}

export async function importProgressBackup(value: unknown): Promise<void> {
  const backup = validate(value)
  const release = await pausePersistenceWrites()
  try {
    await db.transaction('rw', [db.userProfile, db.userWords, db.dailyStats, db.sessions, db.progress, db.planet], async () => {
      await Promise.all([db.userProfile.clear(), db.userWords.clear(), db.dailyStats.clear(), db.sessions.clear(), db.progress.clear(), db.planet.clear()])
      await db.userProfile.put(backup.profile); await db.userWords.bulkPut(backup.userWords); await db.dailyStats.bulkPut(backup.dailyStats); await db.sessions.bulkPut(backup.sessions); await db.progress.put(backup.progress); await db.planet.put(backup.planet)
    })
    await useProgress.getState().init(true)
  } finally {
    release()
  }
}

export async function resetProgress(): Promise<void> {
  const release = await pausePersistenceWrites()
  try {
    await db.transaction('rw', [db.userProfile, db.userWords, db.dailyStats, db.sessions, db.progress, db.planet], async () => {
      await Promise.all([db.userProfile.clear(), db.userWords.clear(), db.dailyStats.clear(), db.sessions.clear(), db.progress.clear(), db.planet.clear()])
    })
    await useProgress.getState().init()
  } finally {
    release()
  }
}
