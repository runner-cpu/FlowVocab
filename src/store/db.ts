import Dexie, { type Table } from 'dexie'
import type { UserProfile, UserWord, DailyStat, Session, Progress, Planet, Word } from '../types'
import { normalizeSuccessfulReviews } from '../engine/forget'

class FlowVocabDB extends Dexie {
  userProfile!: Table<UserProfile, number>
  userWords!: Table<UserWord, string>
  dailyStats!: Table<DailyStat, string>
  sessions!: Table<Session, number>
  progress!: Table<Progress, number>
  planet!: Table<Planet, number>
  wordBank!: Table<Word, string>
  wordBankMeta!: Table<{ id: number; version: number; total: number; updatedAt: number }, number>

  constructor() {
    super('flowvocab-app')
    this.version(1).stores({
      userProfile: 'id',
      userWords: 'id, wordId, status, nextReview',
      dailyStats: 'date',
      sessions: 'id, time, module',
      progress: 'id',
      planet: 'id'
    })
    this.version(2).stores({
      userProfile: 'id',
      userWords: 'id, wordId, status, nextReview',
      dailyStats: 'date',
      sessions: 'id, time, module',
      progress: 'id',
      planet: 'id',
      wordBank: 'id, word, level, source',
      wordBankMeta: 'id'
    })
    this.version(3).stores({}).upgrade(async (tx) => {
      await tx.table('userProfile').toCollection().modify((profile) => {
        if (profile.lastStudyDate === undefined) profile.lastStudyDate = null
        if (profile.claimedQuestDates === undefined) profile.claimedQuestDates = []
        if (profile.unlockedAchievements === undefined) profile.unlockedAchievements = []
      })
      await tx.table('userWords').toCollection().modify((word) => {
        if (word.successfulReviews === undefined) {
          word.successfulReviews = normalizeSuccessfulReviews(word.status, undefined)
        }
      })
    })
  }
}

export const db = new FlowVocabDB()
