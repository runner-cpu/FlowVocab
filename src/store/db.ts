import Dexie, { type Table } from 'dexie'
import type { UserProfile, UserWord, DailyStat, Session, Progress, Planet, Word } from '../types'

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
  }
}

export const db = new FlowVocabDB()
