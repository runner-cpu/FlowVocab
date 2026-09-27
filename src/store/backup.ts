import { db } from './db'
import { normalizeSuccessfulReviews } from '../engine/forget'
import { useProgress } from './progressStore'
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
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const idOne = (value: unknown): value is Record<string, unknown> & { id: 1 } => object(value) && value.id === 1

function fail(message: string): never { throw new Error(`Invalid FlowVocab backup: ${message}`) }
function moduleCounts(value: unknown): value is Record<ModuleKey, number> {
  return object(value) && modules.every((key) => count(value[key]))
}
function normalizeProfile(value: unknown): UserProfile {
  if (!idOne(value) || !count(value.totalXp) || !count(value.bestCombo) || !count(value.streakDays) || !finite(value.createdAt) || !object(value.settings)) fail('profile')
  const settings = value.settings
  if (typeof settings.zenMode !== 'boolean' || !finite(settings.volume) || settings.volume < 0 || settings.volume > 1 || !finite(settings.voiceRate) || settings.voiceRate < .6 || settings.voiceRate > 1.4) fail('settings')
  if (value.lastStudyDate !== null && typeof value.lastStudyDate !== 'string') fail('lastStudyDate')
  if (value.claimedQuestDates !== undefined && (!Array.isArray(value.claimedQuestDates) || !value.claimedQuestDates.every((x) => typeof x === 'string'))) fail('claimedQuestDates')
  if (value.unlockedAchievements !== undefined && (!Array.isArray(value.unlockedAchievements) || !value.unlockedAchievements.every((x) => typeof x === 'string'))) fail('unlockedAchievements')
  return { id: 1, totalXp: value.totalXp, bestCombo: value.bestCombo, streakDays: value.streakDays, createdAt: value.createdAt, lastStudyDate: value.lastStudyDate ?? null, claimedQuestDates: value.claimedQuestDates ?? [], unlockedAchievements: value.unlockedAchievements ?? [], settings: { zenMode: settings.zenMode, volume: settings.volume, voiceRate: settings.voiceRate } }
}
function normalizeWord(value: unknown): UserWord {
  if (!object(value) || typeof value.id !== 'string' || typeof value.wordId !== 'string' || !['new', 'learning', 'mastered'].includes(String(value.status)) || !count(value.correct) || !count(value.total) || !finite(value.nextReview) || !finite(value.interval) || !finite(value.quality) || (value.lastReview !== null && !finite(value.lastReview))) fail('userWords')
  return { id: value.id, wordId: value.wordId, status: value.status as UserWord['status'], correct: value.correct, total: value.total, lastReview: value.lastReview as number | null, nextReview: value.nextReview, interval: value.interval, quality: value.quality, successfulReviews: normalizeSuccessfulReviews(value.status as UserWord['status'], finite(value.successfulReviews) ? value.successfulReviews : undefined) }
}
function normalizeDaily(value: unknown): DailyStat {
  if (!object(value) || typeof value.date !== 'string' || !count(value.xp) || !finite(value.energy) || !count(value.comboMax) || !moduleCounts(value.modules)) fail('dailyStats')
  return value as unknown as DailyStat
}
function normalizeSession(value: unknown): Session {
  if (!object(value) || !count(value.id) || !finite(value.time) || !modules.includes(value.module as ModuleKey) || !count(value.comboMax) || !count(value.correct) || !count(value.total) || !finite(value.energy) || !Array.isArray(value.difficultyFlow) || !value.difficultyFlow.every(finite)) fail('sessions')
  return value as unknown as Session
}
function normalizeProgress(value: unknown): Progress {
  if (!idOne(value)) fail('progress')
  const radar = object(value.radar) ? value.radar : null
  if (!radar || !modules.every((key) => finite(radar[key])) || !object(value.skillTree) || !Array.isArray(value.cards) || !object(value.narrative) || !Array.isArray(value.writingLog) || !['sentencePassed', 'listeningPassed', 'writingDone', 'writingScoreSum', 'readingDone'].every((key) => count(value[key]))) fail('progress')
  if (!value.cards.every((x) => typeof x === 'string') || !value.writingLog.every((x) => object(x) && typeof x.taskId === 'string' && finite(x.score) && finite(x.time))) fail('progress fields')
  return value as unknown as Progress
}
function normalizePlanet(value: unknown): Planet {
  if (!idOne(value) || !finite(value.energy) || !count(value.level) || !finite(value.lastActive) || !count(value.dailyGoal)) fail('planet')
  return value as unknown as Planet
}

function validate(value: unknown): FlowVocabBackupV1 {
  if (!object(value) || value.format !== 'flowvocab-backup' || value.version !== 1 || typeof value.exportedAt !== 'string' || !Number.isFinite(Date.parse(value.exportedAt)) || !Array.isArray(value.userWords) || !Array.isArray(value.dailyStats) || !Array.isArray(value.sessions)) fail('format')
  return { format: 'flowvocab-backup', version: 1, exportedAt: value.exportedAt, profile: normalizeProfile(value.profile), userWords: value.userWords.map(normalizeWord), dailyStats: value.dailyStats.map(normalizeDaily), sessions: value.sessions.map(normalizeSession), progress: normalizeProgress(value.progress), planet: normalizePlanet(value.planet) }
}

export async function exportProgressBackup(): Promise<FlowVocabBackupV1> {
  const [profile, userWords, dailyStats, sessions, progress, planet] = await Promise.all([db.userProfile.get(1), db.userWords.toArray(), db.dailyStats.toArray(), db.sessions.toArray(), db.progress.get(1), db.planet.get(1)])
  return validate({ format: 'flowvocab-backup', version: 1, exportedAt: new Date().toISOString(), profile, userWords, dailyStats, sessions, progress, planet })
}

export async function importProgressBackup(value: unknown): Promise<void> {
  const backup = validate(value)
  await db.transaction('rw', [db.userProfile, db.userWords, db.dailyStats, db.sessions, db.progress, db.planet], async () => {
    await Promise.all([db.userProfile.clear(), db.userWords.clear(), db.dailyStats.clear(), db.sessions.clear(), db.progress.clear(), db.planet.clear()])
    await db.userProfile.put(backup.profile); await db.userWords.bulkPut(backup.userWords); await db.dailyStats.bulkPut(backup.dailyStats); await db.sessions.bulkPut(backup.sessions); await db.progress.put(backup.progress); await db.planet.put(backup.planet)
  })
}

export async function resetProgress(): Promise<void> {
  await db.transaction('rw', [db.userProfile, db.userWords, db.dailyStats, db.sessions, db.progress, db.planet], async () => {
    await Promise.all([db.userProfile.clear(), db.userWords.clear(), db.dailyStats.clear(), db.sessions.clear(), db.progress.clear(), db.planet.clear()])
  })
  await useProgress.getState().init()
}
