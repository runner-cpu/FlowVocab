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
import { qualityOf, nextInterval, normalizeSuccessfulReviews, updateReviewProgress, dayKey } from '../engine/forget'
import { SoundBank } from '../engine/audio'
import { updateStreak } from '../engine/streak'
import { applyChapterResult, starsForResult, CHAPTERS as ROUTE_CHAPTERS } from '../engine/chapters'
import { ACTIVE_VOCAB_TARGET, planetLevelFromEnergy, vocabMasteryScore } from '../engine/progression'
import { deriveProfileProgress } from './progressModel'
import {
  WORDS,
  GRAMMAR_NODES,
  SENTENCE_QUESTS,
  LISTENING_ITEMS,
  CHAPTERS
} from '../data'
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
let pendingWrites: Promise<void> = Promise.resolve()
let writeQueue: (() => Promise<void>)[] = []
let writesBlocked = false
let retryInFlight: Promise<void> | null = null
let initInFlight: Promise<void> | null = null
let transitionRequested = false
let writesPaused = false
let transitionInFlight: Promise<void> | null = null
type DeferredWrite = { operation: () => Promise<void>; resolve: () => void; reject: (error: unknown) => void }
let deferredWrites: DeferredWrite[] = []
let transitionConsumers = 0
let durableStorageRequest: Promise<boolean> | null = null

function requestDurableStorage(): Promise<boolean> | null {
  if (durableStorageRequest) return durableStorageRequest
  const persist = navigator.storage?.persist
  if (!persist) return null
  durableStorageRequest = persist.call(navigator.storage).then(Boolean).catch(() => false)
  return durableStorageRequest
}

async function drainWrites(): Promise<void> {
  while (!writesBlocked && writeQueue.length) {
    try {
      await writeQueue[0]()
      writeQueue.shift()
    } catch {
      // Keep the failed operation at the head. Session transitions and subsequent
      // answers must not advance state until explicit retry has committed it.
      writesBlocked = true
      useProgress.setState({ saveError: '保存失败，后续操作已暂停。请重试保存。' })
    }
  }
  if (!writesBlocked) useProgress.setState({ saveError: null })
}

function serializeWrite(operation: (submittedAt: number) => Promise<void>): Promise<void> {
  const submittedAt = Date.now()
  const queued = () => operation(submittedAt)
  if (writesPaused || transitionRequested) {
    return new Promise<void>((resolve, reject) => {
      deferredWrites.push({ operation: queued, resolve, reject })
    })
  }
  writeQueue.push(queued)
  pendingWrites = pendingWrites.then(drainWrites)
  // While blocked this acknowledges enqueueing, not persistence; saveError stays visible.
  return pendingWrites
}

function resumeDeferredWrites(): void {
  // Keep writes paused until every concurrent transition holder releases its lease.
  if (transitionConsumers > 0) return
  const queued = deferredWrites.splice(0)
  writesPaused = false
  transitionRequested = false
  transitionInFlight = null
  for (const item of queued) {
    const persisted = serializeWrite(() => item.operation())
    persisted.then(item.resolve, item.reject)
  }
}

/** Wait until every queued answer write has settled before reading IndexedDB directly. */
export async function whenWritesSettled(): Promise<void> {
  await pendingWrites
  await pendingWrites
}

/** Pause user writes while a backup/reset replaces the IndexedDB snapshot. */
export function pausePersistenceWrites(): Promise<() => void> {
  transitionRequested = true
  transitionConsumers += 1
  if (!transitionInFlight) {
    transitionInFlight = (async () => {
      await pendingWrites
      if (writesBlocked || writeQueue.length > 0) {
        await useProgress.getState().retrySave()
        await pendingWrites
      }
      if (writesBlocked || writeQueue.length > 0) throw new Error('Unable to drain pending FlowVocab writes')
      writesPaused = true
    })().catch((error) => {
      // A failed transition must not leave writes deferred forever.
      transitionConsumers = 0
      transitionInFlight = null
      resumeDeferredWrites()
      throw error
    })
  }
  const draining = transitionInFlight
  return draining.then(() => () => {
    if (--transitionConsumers <= 0) {
      transitionConsumers = 0
      resumeDeferredWrites()
    }
  })
}

export function emptyDaily(date: string): DailyStat {
  return { date, xp: 0, energy: 0, comboMax: 0, modules: { vocab: 0, grammar: 0, sentence: 0, listening: 0, writing: 0, reading: 0 } }
}

function median(arr: number[]): number {
  if (arr.length === 0) return 4000
  const s = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

function normalizedProgress(progress: Progress): Progress {
  const sentenceFloor = progress.completedSentenceIds === undefined
    ? Math.max(progress.legacySentenceFloor ?? 0, Math.min(progress.sentencePassed, SENTENCE_QUESTS.length))
    : progress.legacySentenceFloor ?? 0
  const listeningFloor = progress.completedListeningIds === undefined
    ? Math.max(progress.legacyListeningFloor ?? 0, Math.min(progress.listeningPassed, LISTENING_ITEMS.length))
    : progress.legacyListeningFloor ?? 0
  const readingFloor = Math.min(progress.readingDone, CHAPTERS.length)
  const chapterStars = Object.fromEntries(Object.entries(progress.chapterStars ?? {})
    .filter((entry): entry is [string, number] => typeof entry[1] === 'number' && Number.isFinite(entry[1]))
    .map(([id, value]) => [id, Math.max(0, Math.min(3, Math.floor(value)))]))
  return {
    ...progress,
    chapterStars,
    stardust: Math.max(0, Math.floor(progress.stardust ?? 0)),
    legacySentenceFloor: sentenceFloor,
    legacyListeningFloor: listeningFloor,
    sentencePassed: Math.min(SENTENCE_QUESTS.length, Math.max(sentenceFloor, progress.completedSentenceIds?.length ?? 0)),
    listeningPassed: Math.min(LISTENING_ITEMS.length, Math.max(listeningFloor, progress.completedListeningIds?.length ?? 0)),
    readingDone: Math.min(CHAPTERS.length, Math.max(readingFloor, new Set(Object.keys(progress.narrative ?? {})).size)),
  }
}

function isKnownChapter(chapterId: string): boolean {
  return ROUTE_CHAPTERS.some((chapter) => chapter.id === chapterId)
}

function defaultRadar(): Radar {
  return { vocab: 0, grammar: 0, sentence: 0, listening: 0, writing: 0, reading: 0 }
}

export function computeRadar(progress: Progress, userWords: UserWord[]): Radar {
  const mastered = userWords.filter((w) => w.status === 'mastered').length
  const skillLit = Object.keys(progress.skillTree).filter((k) => progress.skillTree[k]).length
  // 词库总量：真实大纲词库优先（wordBank），未加载时用内置示例
  const radar: Radar = {
    vocab: vocabMasteryScore(mastered, userWords.filter(w => w.status !== 'mastered' && w.total > 0).length, ACTIVE_VOCAB_TARGET),
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
  initError: string | null
  profile: UserProfile | null
  planet: Planet | null
  progress: Progress | null
  daily: DailyStat | null
  userWords: UserWord[]
  combo: ComboState
  difficulty: DifficultyState
  feedback: FeedbackEvent | null
  session: SessionState
  saveError: string | null
  durableStorage: boolean | null
  retrySave: () => Promise<void>
  claimDailyChest: () => Promise<void>

  init: (preserveEmptyTables?: boolean) => Promise<void>
  retryInit: () => Promise<void>
  startSession: (module: ModuleKey) => Promise<void>
  finishSession: () => Promise<void>
  answer: (opts: { module: ModuleKey; wordId?: string; correct: boolean; timeMs: number; medianMs?: number }) => Promise<void>
  completeGrammarNode: (nodeId: string) => Promise<void>
  passSentence: (questId?: string) => Promise<void>
  passListening: (itemId?: string) => Promise<void>
  submitWriting: (taskId: string, score: number) => Promise<void>
  completeReading: (chapterId: string) => Promise<void>
  recordChapterResult: (chapterId: string, total: number, correct: number) => Promise<void>
  toggleZen: () => void
  updateSettings: (patch: Partial<UserProfile['settings']>) => Promise<void>
  clearFeedback: () => void
}

const emptySession: SessionState = { module: null, comboMax: 0, correct: 0, total: 0, difficultyFlow: [], energy: 0 }

export const useProgress = create<ProgressStore>((set, get) => ({
  ready: false,
  initError: null,
  profile: null,
  planet: null,
  progress: null,
  daily: null,
  userWords: [],
  combo: createComboState(),
  difficulty: createDifficultyState(),
  feedback: null,
  session: emptySession,
  saveError: null,
  durableStorage: null,
  retrySave: () => {
    if (retryInFlight) return retryInFlight
    if (!writesBlocked) return pendingWrites
    pendingWrites = pendingWrites.then(async () => {
      writesBlocked = false
      await drainWrites()
    })
    retryInFlight = pendingWrites.finally(() => { retryInFlight = null })
    return retryInFlight
  },

  init: async (preserveEmptyTables = false) => {
    if (initInFlight) return initInFlight
    const operation = (async () => {
    set({ ready: false, initError: null })
    try {
    const now = Date.now()
    const today = dayKey(now)

    let profile = (await db.userProfile.get(1)) as UserProfile | undefined
    if (!profile) {
      profile = { id: 1, totalXp: 0, bestCombo: 0, streakDays: 0, lastStudyDate: null, claimedQuestDates: [], unlockedAchievements: [], createdAt: now, settings: { zenMode: false, volume: 0.8, voiceRate: 0.9 } }
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
    } else {
      const normalized = normalizedProgress(progress)
      if (normalized.sentencePassed !== progress.sentencePassed || normalized.listeningPassed !== progress.listeningPassed || normalized.readingDone !== progress.readingDone || normalized.legacySentenceFloor !== progress.legacySentenceFloor || normalized.legacyListeningFloor !== progress.legacyListeningFloor) {
        progress = normalized
        await db.progress.put(progress)
      }
    }
    let daily = (await db.dailyStats.get(today)) as DailyStat | undefined
    if (!daily && !preserveEmptyTables) {
      daily = { date: today, xp: 0, energy: 0, comboMax: 0, modules: { vocab: 0, grammar: 0, sentence: 0, listening: 0, writing: 0, reading: 0 } }
      await db.dailyStats.put(daily)
    }
    const userWords = await db.userWords.toArray()
    if (!preserveEmptyTables) {
      progress.radar = computeRadar(progress, userWords)
      await db.progress.put(progress)
    }
    rollingTimes = []
    if (!writesPaused && !transitionRequested) {
      writeQueue = []
      writesBlocked = false
    }

    const durableStorage = await requestDurableStorage()
    set({ ready: true, profile, planet, progress, daily: daily ?? null, userWords, saveError: null, initError: null, durableStorage: durableStorage ?? get().durableStorage })
    SoundBank.setVolume(profile.settings.volume)
    SoundBank.setMuted(profile.settings.zenMode)
    } catch {
      set({ ready: false, initError: '无法读取本地学习数据' })
    }
    })()
    initInFlight = operation
    try {
      await operation
    } finally {
      if (initInFlight === operation) initInFlight = null
    }
  },
  retryInit: async () => get().init(),

  startSession: (module) => serializeWrite(async () => {
    rollingTimes = []
    set({ session: { ...emptySession, module }, combo: createComboState(), difficulty: createDifficultyState() })
  }),

  finishSession: () => serializeWrite(async (submittedAt) => {
    const { session } = get()
    if (!session.module) return
    if (session.total > 0) {
      const rec: Session = {
        id: submittedAt,
        time: submittedAt,
        module: session.module,
        comboMax: session.comboMax,
        correct: session.correct,
        total: session.total,
        difficultyFlow: session.difficultyFlow,
        energy: session.energy
      }
      await db.transaction('rw', db.sessions, async () => {
        const last = await db.sessions.orderBy('id').last()
        rec.id = Math.max(submittedAt, (last?.id ?? 0) + 1)
        await db.sessions.add(rec)
      })
    }
    // Answers already persist date-scoped combo maxima. A session can span days.
    set({ session: { ...emptySession } })
  }),

  answer: ({ module, wordId, correct, timeMs, medianMs }) => serializeWrite(async (now) => {
    const s = get()
    if (!s.profile || !s.planet || !s.progress) return
    const med = medianMs ?? median(rollingTimes)
    const nextRollingTimes = [...rollingTimes, timeMs].slice(-20)
    const st = get().session

    const today = dayKey(now)
    const combo = s.daily?.date === today ? s.combo : createComboState()
    const comboRes = evaluateAnswer({ correct, timeMs, medianMs: med }, combo)
    const diffRes = updateDifficulty(get().difficulty, correct, timeMs, med)

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
    const profile = { ...s.profile, claimedQuestDates: [...s.profile.claimedQuestDates] }
    const planet = { ...s.planet }
    const daily = s.daily?.date === today ? { ...s.daily, modules: { ...s.daily.modules } } : emptyDaily(today)
    if (profile) {
      profile.totalXp += comboRes.xp
      profile.bestCombo = Math.max(profile.bestCombo, comboRes.state.maxCombo)
      Object.assign(profile, updateStreak(profile.lastStudyDate, profile.streakDays, today))
    }
    if (planet) {
      planet.energy = Math.round((planet.energy + comboRes.energy) * 10) / 10
      planet.level = planetLevelFromEnergy(planet.energy)
      planet.lastActive = now
    }
    if (daily) {
      daily.xp += comboRes.xp
      daily.energy = Math.round((daily.energy + comboRes.energy) * 10) / 10
      daily.modules[module] += 1
      daily.comboMax = Math.max(daily.comboMax, comboRes.state.combo)
    }

    // 词汇进度
    let userWords = s.userWords
    if (module === 'vocab' && wordId) {
      const q = qualityOf(correct, timeMs, med)
      let uw = userWords.find((w) => w.wordId === wordId)
      if (!uw) {
        uw = { id: wordId, wordId, status: 'new', correct: 0, total: 0, lastReview: null, nextReview: now, interval: 0, quality: 0, successfulReviews: 0 }
      }
      const successfulReviews = normalizeSuccessfulReviews(uw.status, uw.successfulReviews)
      const reviewProgress = updateReviewProgress(uw.status, q, successfulReviews)
      uw = {
        ...uw,
        status: reviewProgress.status,
        successfulReviews: reviewProgress.successfulReviews,
        correct: uw.correct + (correct ? 1 : 0),
        total: uw.total + 1,
        lastReview: now,
        interval: nextInterval(uw.interval, q, successfulReviews),
        nextReview: now + nextInterval(uw.interval, q, successfulReviews) * 86400000,
        quality: q
      }
      userWords = [...userWords.filter((w) => w.wordId !== wordId), uw]
    }

    // 雷达
    const progress = { ...s.progress }
    if (progress) {
      progress.radar = computeRadar(progress, userWords)
    }

    // Grant each completed quest once; XP rewards may complete the XP quest.
    for (let pass = 0; pass < 2; pass += 1) {
      for (const quest of deriveProfileProgress(profile, daily, planet, userWords).quests) {
        if (!quest.complete || quest.claimed) continue
        profile.claimedQuestDates.push(`${today}:${quest.id}`)
        profile.totalXp += quest.rewardXp
        daily.xp += quest.rewardXp
      }
    }
    profile.unlockedAchievements = deriveProfileProgress(profile, daily, planet, userWords).unlockedAchievementIds
    await db.transaction('rw', [db.userProfile, db.planet, db.dailyStats, db.userWords, db.progress], async () => {
      await db.userProfile.put(profile)
      await db.planet.put(planet)
      await db.dailyStats.put(daily)
      const word = userWords.find(w => w.wordId === wordId)
      if (module === 'vocab' && word) await db.userWords.put(word)
      await db.progress.put(progress)
    })
    rollingTimes = nextRollingTimes
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
    try {
      if (!profile.settings.zenMode) {
        const t = comboRes.feedback.type
        if (t === 'critical') SoundBank.critical()
        else if (t === 'rage') SoundBank.rage()
        else if (t === 'combo') SoundBank.combo(comboRes.state.combo)
        else if (t === 'hit') SoundBank.hit()
        else if (t === 'miss') SoundBank.miss()
        if (diffRes.feedback) SoundBank.levelup()
      }
    } catch {
      // Audio availability must never cause an already committed answer to replay.
    }
  }),

  claimDailyChest: () => serializeWrite(async (submittedAt) => {
    const s = get()
    const today = dayKey(submittedAt)
    if (!s.profile || !s.planet || !s.daily || s.daily.date !== today) return
    if (deriveProfileProgress(s.profile, s.daily, s.planet, s.userWords).chest !== 'available') return
    const profile = { ...s.profile, claimedQuestDates: [...s.profile.claimedQuestDates, today] }
    const planet = { ...s.planet, energy: s.planet.energy + 50, level: planetLevelFromEnergy(s.planet.energy + 50) }
    const daily = { ...s.daily, energy: s.daily.energy + 50 }
    await db.transaction('rw', [db.userProfile, db.planet, db.dailyStats], async () => {
      await db.userProfile.put(profile)
      await db.planet.put(planet)
      await db.dailyStats.put(daily)
    })
    set({ profile, planet, daily })
  }),

  completeGrammarNode: (nodeId) => serializeWrite(async () => {
    const s = get()
    if (!s.progress) return
    const progress: Progress = {
      ...s.progress,
      skillTree: { ...s.progress.skillTree, [nodeId]: true }
    }
    progress.radar = computeRadar(progress, s.userWords)
    await db.progress.put(progress)
    set({ progress })
  }),

  passSentence: (questId) => serializeWrite(async () => {
    const s = get()
    if (!s.progress || (questId && s.progress.completedSentenceIds?.includes(questId))) return
    const current = normalizedProgress(s.progress)
    const ids = questId ? [...(current.completedSentenceIds ?? []), questId] : current.completedSentenceIds
    const progress: Progress = { ...current,
      sentencePassed: questId ? Math.min(SENTENCE_QUESTS.length, Math.max(s.progress.legacySentenceFloor ?? 0, ids?.length ?? 0)) : s.progress.sentencePassed + 1,
      ...(ids ? { completedSentenceIds: ids } : {}) }
    progress.radar = computeRadar(progress, s.userWords)
    await db.progress.put(progress)
    set({ progress })
  }),

  passListening: (itemId) => serializeWrite(async () => {
    const s = get()
    if (!s.progress || (itemId && s.progress.completedListeningIds?.includes(itemId))) return
    const current = normalizedProgress(s.progress)
    const ids = itemId ? [...(current.completedListeningIds ?? []), itemId] : current.completedListeningIds
    const progress: Progress = { ...current,
      listeningPassed: itemId ? Math.min(LISTENING_ITEMS.length, Math.max(s.progress.legacyListeningFloor ?? 0, ids?.length ?? 0)) : s.progress.listeningPassed + 1,
      ...(ids ? { completedListeningIds: ids } : {}) }
    progress.radar = computeRadar(progress, s.userWords)
    await db.progress.put(progress)
    set({ progress })
  }),

  submitWriting: (taskId, score) => serializeWrite(async () => {
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
  }),

  completeReading: (chapterId) => serializeWrite(async () => {
    const s = get()
    if (!s.progress || Object.prototype.hasOwnProperty.call(s.progress.narrative, chapterId)) return
    const progress: Progress = {
      ...s.progress,
      readingDone: s.progress.readingDone + 1,
      narrative: { ...s.progress.narrative, [chapterId]: 'done' }
    }
    progress.radar = computeRadar(progress, s.userWords)
    await db.progress.put(progress)
    set({ progress })
  }),

  /** 关卡结算：记录本章最好星级，返回本次获得的星尘。 */
  recordChapterResult: (chapterId, total, correct) => serializeWrite(async () => {
    const s = get()
    // 只接受航线地图里真实存在的章节，避免错误调用者写入幽灵星尘。
    if (!s.progress || !isKnownChapter(chapterId)) return
    const stars = starsForResult(total, correct)
    const result = applyChapterResult(s.progress.chapterStars ?? {}, chapterId, stars)
    if (!result.improved) return
    const progress: Progress = {
      ...s.progress,
      chapterStars: result.stars,
      stardust: (s.progress.stardust ?? 0) + result.stardustGained
    }
    await db.progress.put(progress)
    set({ progress })
  }),

  toggleZen: () => serializeWrite(async () => {
    const s = get()
    if (!s.profile) return
    const profile = { ...s.profile, settings: { ...s.profile.settings, zenMode: !s.profile.settings.zenMode } }
    await db.userProfile.put(profile)
    SoundBank.setMuted(profile.settings.zenMode)
    set({ profile })
  }),

  updateSettings: (patch) => serializeWrite(async () => {
    const profile = get().profile
    if (!profile) return
    const next = {
      ...profile,
      settings: {
        zenMode: typeof patch.zenMode === 'boolean' ? patch.zenMode : profile.settings.zenMode,
        volume: typeof patch.volume === 'number' && Number.isFinite(patch.volume) ? Math.max(0, Math.min(1, patch.volume)) : profile.settings.volume,
        voiceRate: typeof patch.voiceRate === 'number' && Number.isFinite(patch.voiceRate) ? Math.max(.6, Math.min(1.4, patch.voiceRate)) : profile.settings.voiceRate
      }
    }
    await db.userProfile.put(next)
    SoundBank.setVolume(next.settings.volume)
    SoundBank.setMuted(next.settings.zenMode)
    set({ profile: next })
  }),

  clearFeedback: () => set({ feedback: null })
}))
