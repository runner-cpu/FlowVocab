import { create } from 'zustand'
import { db } from './db'
import {
  evaluateAnswer,
  createComboState,
  type ComboState
} from '../engine/combo'
import {
  updateDifficulty,
  createDifficultyState,
  type DifficultyState
} from '../engine/difficulty'
import { qualityOf, nextInterval, nextStatus, dayKey } from '../engine/forget'
import { SoundBank } from '../engine/audio'
import {
  WORDS,
  GRAMMAR_NODES,
  SENTENCE_QUESTS,
  LISTENING_ITEMS,
  CHAPTERS
} from '../data'
import { wordBankTotal } from './wordBank'
import type {
  FeedbackEvent,
  ModuleKey,
  Planet,
  Progress,
  DailyStat,
  Session,
  UserProfile,
  UserWord,
  Radar
} from '../types'

// 会话内滚动用时（用于动态中位数）
let rollingTimes: number[] = []

function median(arr: number[]): number {
  if (arr.length === 0) return 4000
  const s = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

function defaultRadar(): Radar {
  return { vocab: 0, grammar: 0, sentence: 0, listening: 0, writing: 0, reading: 0 }
}

function computeRadar(progress: Progress, userWords: UserWord[]): Radar {
  const mastered = userWords.filter((w) => w.status === 'mastered').length
  const skillLit = Object.keys(progress.skillTree).filter((k) => progress.skillTree[k]).length
  // 词库总量：真实大纲词库优先（wordBank），未加载时用内置示例
  const vocabTotal = wordBankTotal() || WORDS.length
  const radar: Radar = {
    vocab: Math.min(100, Math.round((mastered / Math.max(vocabTotal, 1)) * 100)),
    grammar: Math.min(100, Math.round((skillLit / Math.max(GRAMMAR_NODES.length, 1)) * 100)),
    sentence: Math.min(100, Math.round((progress.sentencePassed / Math.max(SENTENCE_QUESTS.length, 1)) * 100)),
    listening: Math.min(100, Math.round((progress.listeningPassed / Math.max(LISTENING_ITEMS.length, 1)) * 100)),
    writing: progress.writingDone
      ? Math.min(100, Math.round((progress.writingScoreSum / (progress.writingDone * 5)) * 100))
      : 0,
    reading: Math.min(100, Math.round((progress.readingDone / Math.max(CHAPTERS.length, 1)) * 100))
  }
  return radar
}

interface SessionState {
  module: ModuleKey | null
  comboMax: number
  correct: number
  total: number
  difficultyFlow: number[]
  energy: number
}

interface ProgressStore {
  ready: boolean
  profile: UserProfile | null
  planet: Planet | null
  progress: Progress | null
  daily: DailyStat | null
  userWords: UserWord[]
  combo: ComboState
  difficulty: DifficultyState
  feedback: FeedbackEvent | null
  session: SessionState

  init: () => Promise<void>
  startSession: (module: ModuleKey) => void
  finishSession: () => Promise<void>
  answer: (opts: { module: ModuleKey; wordId?: string; correct: boolean; timeMs: number; medianMs?: number }) => void
  completeGrammarNode: (nodeId: string) => Promise<void>
  passSentence: () => Promise<void>
  passListening: () => Promise<void>
  submitWriting: (taskId: string, score: number) => Promise<void>
  completeReading: (chapterId: string) => Promise<void>
  toggleZen: () => void
  clearFeedback: () => void
}

const emptySession: SessionState = { module: null, comboMax: 0, correct: 0, total: 0, difficultyFlow: [], energy: 0 }

export const useProgress = create<ProgressStore>((set, get) => ({
  ready: false,
  profile: null,
  planet: null,
  progress: null,
  daily: null,
  userWords: [],
  combo: createComboState(),
  difficulty: createDifficultyState(),
  feedback: null,
  session: emptySession,

  init: async () => {
    const now = Date.now()
    const today = dayKey(now)

    let profile = (await db.userProfile.get(1)) as UserProfile | undefined
    if (!profile) {
      profile = { id: 1, totalXp: 0, bestCombo: 0, streakDays: 0, createdAt: now, settings: { zenMode: false, volume: 0.8, voiceRate: 0.9 } }
      await db.userProfile.put(profile)
    }
    let planet = (await db.planet.get(1)) as Planet | undefined
    if (!planet) {
      planet = { id: 1, energy: 0, level: 0, lastActive: now, dailyGoal: 100 }
      await db.planet.put(planet)
    }
    let progress = (await db.progress.get(1)) as Progress | undefined
    if (!progress) {
      progress = { id: 1, radar: defaultRadar(), skillTree: {}, cards: [], narrative: {}, writingLog: [], sentencePassed: 0, listeningPassed: 0, writingDone: 0, writingScoreSum: 0, readingDone: 0 }
      await db.progress.put(progress)
    }
    let daily = (await db.dailyStats.get(today)) as DailyStat | undefined
    if (!daily) {
      daily = { date: today, xp: 0, energy: 0, comboMax: 0, modules: { vocab: 0, grammar: 0, sentence: 0, listening: 0, writing: 0, reading: 0 } }
      await db.dailyStats.put(daily)
    }
    const userWords = await db.userWords.toArray()
    progress.radar = computeRadar(progress, userWords)
    await db.progress.put(progress)
    rollingTimes = []

    set({ ready: true, profile, planet, progress, daily, userWords })
  },

  startSession: (module) => {
    rollingTimes = []
    set({ session: { ...emptySession, module }, combo: createComboState(), difficulty: createDifficultyState() })
  },

  finishSession: async () => {
    const { session, profile, planet } = get()
    if (!session.module) return
    if (session.total > 0) {
      const rec: Session = {
        id: Date.now(),
        time: Date.now(),
        module: session.module,
        comboMax: session.comboMax,
        correct: session.correct,
        total: session.total,
        difficultyFlow: session.difficultyFlow,
        energy: session.energy
      }
      await db.sessions.add(rec)
    }
    const today = dayKey(Date.now())
    const daily = await db.dailyStats.get(today)
    if (daily) {
      daily.comboMax = Math.max(daily.comboMax, session.comboMax)
      await db.dailyStats.put(daily)
      set({ daily })
    }
    void planet
    void profile
    set({ session: { ...emptySession } })
  },

  answer: ({ module, wordId, correct, timeMs, medianMs }) => {
    const s = get()
    const med = medianMs ?? median(rollingTimes)
    rollingTimes = [...rollingTimes, timeMs].slice(-20)
    const st = get().session

    const comboRes = evaluateAnswer({ correct, timeMs, medianMs: med }, get().combo)
    const diffRes = updateDifficulty(get().difficulty, correct, timeMs, med)

    // 音效
    const zen = s.profile?.settings.zenMode
    if (!zen) {
      const t = comboRes.feedback.type
      if (t === 'critical') SoundBank.critical()
      else if (t === 'rage') SoundBank.rage()
      else if (t === 'combo') SoundBank.combo(comboRes.state.combo)
      else if (t === 'hit') SoundBank.hit()
      else if (t === 'miss') SoundBank.miss()
      if (diffRes.feedback) SoundBank.levelup()
    }

    // 会话更新
    const newSession: SessionState = {
      ...st,
      comboMax: Math.max(st.comboMax, comboRes.state.maxCombo),
      correct: st.correct + (correct ? 1 : 0),
      total: st.total + 1,
      difficultyFlow: [...st.difficultyFlow, diffRes.state.level],
      energy: Math.round((st.energy + comboRes.energy) * 10) / 10
    }

    // 用户资料 & 星球 & 每日
    const now = Date.now()
    const today = dayKey(now)
    const profile = s.profile ? { ...s.profile } : null
    const planet = s.planet ? { ...s.planet } : null
    const daily = s.daily ? { ...s.daily } : null
    if (profile) {
      profile.totalXp += comboRes.xp
      profile.bestCombo = Math.max(profile.bestCombo, comboRes.state.maxCombo)
    }
    if (planet) {
      planet.energy = Math.round((planet.energy + comboRes.energy) * 10) / 10
      planet.level = Math.min(5, Math.floor(planet.energy / 50))
      planet.lastActive = now
    }
    if (daily) {
      daily.xp += comboRes.xp
      daily.energy = Math.round((daily.energy + comboRes.energy) * 10) / 10
      daily.modules[module] += 1
      daily.comboMax = Math.max(daily.comboMax, comboRes.state.maxCombo)
    }

    // 词汇进度
    let userWords = s.userWords
    if (module === 'vocab' && wordId) {
      const q = qualityOf(correct, timeMs, med)
      let uw = userWords.find((w) => w.wordId === wordId)
      if (!uw) {
        uw = { id: wordId, wordId, status: 'new', correct: 0, total: 0, lastReview: null, nextReview: now, interval: 0, quality: 0 }
      }
      uw = {
        ...uw,
        status: nextStatus(uw.status, q) as UserWord['status'],
        correct: uw.correct + (correct ? 1 : 0),
        total: uw.total + 1,
        lastReview: now,
        interval: nextInterval(uw.interval, q),
        nextReview: now + nextInterval(uw.interval, q) * 86400000,
        quality: q
      }
      userWords = [...userWords.filter((w) => w.wordId !== wordId), uw]
    }

    // 雷达
    let progress = s.progress ? { ...s.progress } : null
    if (progress) {
      progress.radar = computeRadar(progress, userWords)
    }

    set({
      combo: comboRes.state,
      difficulty: diffRes.state,
      feedback: comboRes.feedback,
      session: newSession,
      profile,
      planet,
      daily,
      userWords,
      progress
    })

    // 持久化（异步）
    if (profile) db.userProfile.put(profile)
    if (planet) db.planet.put(planet)
    if (daily) db.dailyStats.put(daily)
    if (module === 'vocab' && wordId) {
      const uw = userWords.find((w) => w.wordId === wordId)
      if (uw) db.userWords.put(uw)
    }
    if (progress) db.progress.put(progress)
  },

  completeGrammarNode: async (nodeId) => {
    const s = get()
    if (!s.progress) return
    const progress: Progress = {
      ...s.progress,
      skillTree: { ...s.progress.skillTree, [nodeId]: true }
    }
    progress.radar = computeRadar(progress, s.userWords)
    await db.progress.put(progress)
    set({ progress })
  },

  passSentence: async () => {
    const s = get()
    if (!s.progress) return
    const progress: Progress = { ...s.progress, sentencePassed: s.progress.sentencePassed + 1 }
    progress.radar = computeRadar(progress, s.userWords)
    await db.progress.put(progress)
    set({ progress })
  },

  passListening: async () => {
    const s = get()
    if (!s.progress) return
    const progress: Progress = { ...s.progress, listeningPassed: s.progress.listeningPassed + 1 }
    progress.radar = computeRadar(progress, s.userWords)
    await db.progress.put(progress)
    set({ progress })
  },

  submitWriting: async (taskId, score) => {
    const s = get()
    if (!s.progress) return
    const progress: Progress = {
      ...s.progress,
      writingDone: s.progress.writingDone + 1,
      writingScoreSum: s.progress.writingScoreSum + score,
      writingLog: [...s.progress.writingLog, { taskId, score, time: Date.now() }]
    }
    progress.radar = computeRadar(progress, s.userWords)
    await db.progress.put(progress)
    set({ progress })
  },

  completeReading: async (chapterId) => {
    const s = get()
    if (!s.progress) return
    const progress: Progress = {
      ...s.progress,
      readingDone: s.progress.readingDone + 1,
      narrative: { ...s.progress.narrative, [chapterId]: 'done' }
    }
    progress.radar = computeRadar(progress, s.userWords)
    await db.progress.put(progress)
    set({ progress })
  },

  toggleZen: async () => {
    const s = get()
    if (!s.profile) return
    const profile = { ...s.profile, settings: { ...s.profile.settings, zenMode: !s.profile.settings.zenMode } }
    await db.userProfile.put(profile)
    set({ profile })
  },

  clearFeedback: () => set({ feedback: null })
}))
