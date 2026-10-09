import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from './db'
import { pausePersistenceWrites, useProgress } from './progressStore'
import { computeRadar } from './progressStore'
import { dayKey } from '../engine/forget'
import type { UserWord } from '../types'
import { SENTENCE_QUESTS, LISTENING_ITEMS, CHAPTERS } from '../data'

const answer = { module: 'vocab' as const, wordId: 'atomic-word', correct: true, timeMs: 4000, medianMs: 4000 }
beforeEach(async () => {
  await db.delete()
  await db.open()
  useProgress.setState({ ready: false, profile: null, planet: null, daily: null, progress: null, userWords: [], saveError: null })
  await useProgress.getState().init()
  const profile = { ...useProgress.getState().profile!, settings: { zenMode: true, volume: 0, voiceRate: 1 } }
  await db.userProfile.put(profile)
  useProgress.setState({ profile })
  await useProgress.getState().startSession('vocab')
})
afterEach(async () => { vi.restoreAllMocks(); await db.delete() })

it('calculates vocabulary radar against the 600-word active target rather than a bank total', () => {
  const progress = useProgress.getState().progress ?? { id: 1, radar: { vocab: 0, grammar: 0, sentence: 0, listening: 0, writing: 0, reading: 0 }, skillTree: {}, cards: [], narrative: {}, writingLog: [], sentencePassed: 0, listeningPassed: 0, writingDone: 0, writingScoreSum: 0, readingDone: 0 }
  const words = Array.from({ length: 36 }, (_, index) => ({ id: String(index), wordId: String(index), status: index < 12 ? 'mastered' : 'learning', successfulReviews: 1, correct: 1, total: 1, lastReview: 1, nextReview: 1, interval: 1, quality: 1 } as UserWord))
  expect(computeRadar(progress, words).vocab).toBe(3)
})

it('persists bounded learning settings and applies the requested values', async () => {
  await useProgress.getState().updateSettings({ volume: .35, voiceRate: 1.2, zenMode: false })
  expect(useProgress.getState().profile?.settings).toEqual({ volume: .35, voiceRate: 1.2, zenMode: false })
  await useProgress.getState().updateSettings({ volume: 9, voiceRate: 0 })
  expect((await db.userProfile.get(1))?.settings).toMatchObject({ volume: 1, voiceRate: .6 })
  await useProgress.getState().updateSettings({ volume: Number.NaN, voiceRate: Number.POSITIVE_INFINITY })
  await useProgress.getState().updateSettings({ volume: Number.NEGATIVE_INFINITY, voiceRate: Number.NaN })
  expect((await db.userProfile.get(1))?.settings).toMatchObject({ volume: 1, voiceRate: .6 })
})

describe('atomic answer persistence', () => {
  it('blocks later answers behind a failed miss and retries in the original reward order', async () => {
    for (let i = 0; i < 4; i++) await useProgress.getState().answer(answer)
    const fail = () => { throw new Error('disk full') }
    db.progress.hook('updating', fail)
    try { await useProgress.getState().answer({ ...answer, correct: false }) } finally { db.progress.hook('updating').unsubscribe(fail) }
    await useProgress.getState().answer(answer)
    expect(useProgress.getState().profile?.totalXp).toBe(40)
    expect((await db.userWords.get('atomic-word'))?.total).toBe(4)
    await useProgress.getState().retrySave()
    expect(useProgress.getState().profile?.totalXp).toBe(52)
    expect(useProgress.getState().daily).toMatchObject({ xp: 52, comboMax: 4 })
    expect(useProgress.getState().combo.combo).toBe(1)
    expect((await db.userWords.get('atomic-word'))?.total).toBe(6)
    await useProgress.getState().retrySave()
    expect(useProgress.getState().profile?.totalXp).toBe(52)
  })
  it('keeps failed vocab in its original session before queued grammar begins', async () => {
    const fail = () => { throw new Error('disk full') }
    db.progress.hook('updating', fail)
    try { await useProgress.getState().answer(answer) } finally { db.progress.hook('updating').unsubscribe(fail) }
    await useProgress.getState().finishSession()
    await useProgress.getState().startSession('grammar')
    await useProgress.getState().answer({ ...answer, module: 'grammar', wordId: undefined })
    expect(await db.sessions.count()).toBe(0)
    await useProgress.getState().retrySave()
    expect((await db.sessions.toArray())[0]).toMatchObject({ module: 'vocab', total: 1, correct: 1 })
    expect(useProgress.getState().session).toMatchObject({ module: 'grammar', total: 1, correct: 1 })
    expect(useProgress.getState().daily?.modules).toMatchObject({ vocab: 1, grammar: 1 })
  })
  it('keeps the original answer date when retry happens after midnight', async () => {
    const yesterday = new Date(2026, 8, 24, 23, 59).getTime()
    const tomorrow = new Date(2026, 8, 25, 0, 1).getTime()
    const now = vi.spyOn(Date, 'now').mockReturnValue(yesterday)
    const fail = () => { throw new Error('disk full') }
    db.progress.hook('updating', fail)
    try { await useProgress.getState().answer(answer) } finally { db.progress.hook('updating').unsubscribe(fail) }
    now.mockReturnValue(tomorrow)
    await useProgress.getState().answer(answer)
    await useProgress.getState().retrySave()
    expect(await db.dailyStats.get('2026-09-24')).toMatchObject({ xp: 10, modules: { vocab: 1 } })
    expect(await db.dailyStats.get('2026-09-25')).toMatchObject({ xp: 10, modules: { vocab: 1 } })
  })
  it.each([false, true])('does not carry yesterday’s maximum or rage into today (correct=%s)', async (correct) => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(new Date(2026, 8, 24, 23, 59).getTime())
    for (let i = 0; i < 5; i++) await useProgress.getState().answer(answer)
    now.mockReturnValue(new Date(2026, 8, 25, 0, 1).getTime())
    await useProgress.getState().answer({ ...answer, correct })
    expect(useProgress.getState().daily).toMatchObject({ date: '2026-09-25', xp: correct ? 10 : 2, comboMax: correct ? 1 : 0 })
    expect(useProgress.getState().profile?.claimedQuestDates).not.toContain('2026-09-25:combo')
    await useProgress.getState().finishSession()
    expect(await db.dailyStats.get('2026-09-25')).toMatchObject({ xp: correct ? 10 : 2, comboMax: correct ? 1 : 0 })
    expect((await db.sessions.toArray())[0].comboMax).toBe(5)
  })
  it('finishes the old session before starting a new module while an answer is saving', async () => {
    const s = useProgress.getState()
    await Promise.all([s.answer(answer), s.finishSession(), s.startSession('grammar')])
    expect((await db.sessions.toArray())[0]).toMatchObject({ module: 'vocab', total: 1, correct: 1 })
    expect(useProgress.getState().session).toMatchObject({ module: 'grammar', total: 0 })
  })
  it('retains failed and later queued answers until retry succeeds', async () => {
    const fail = () => { throw new Error('temporary write failure') }
    db.progress.hook('updating', fail)
    try { await useProgress.getState().answer(answer) } finally { db.progress.hook('updating').unsubscribe(fail) }
    await useProgress.getState().answer({ ...answer, wordId: 'second-word' })
    expect(useProgress.getState().saveError).toBeTruthy()
    await useProgress.getState().retrySave()
    expect((await db.userWords.get('atomic-word'))?.total).toBe(1)
    expect((await db.userWords.get('second-word'))?.total).toBe(1)
    expect(useProgress.getState().daily?.modules.vocab).toBe(2)
    expect(useProgress.getState().saveError).toBeNull()
  })
  it('unlocks and persists the 20-combo achievement through real answers', async () => {
    for (let i = 0; i < 20; i++) await useProgress.getState().answer(answer)
    expect(useProgress.getState().combo.combo).toBe(20)
    expect((await db.userProfile.get(1))?.bestCombo).toBe(20)
    expect((await db.userProfile.get(1))?.unlockedAchievements).toContain('combo-20')
  })
  it('preserves every module completion when called alongside an answer', async () => {
    const s = useProgress.getState()
    await Promise.all([s.answer(answer), s.passSentence(), s.passListening(), s.completeGrammarNode('present'), s.submitWriting('task', 4), s.completeReading('chapter')])
    const progress = await db.progress.get(1)
    expect(progress).toMatchObject({ sentencePassed: 1, listeningPassed: 1, writingDone: 1, writingScoreSum: 4, readingDone: 1, skillTree: { present: true }, narrative: { chapter: 'done' } })
    expect(useProgress.getState().progress).toEqual(progress)
    expect(useProgress.getState().profile?.totalXp).toBe(10)
  })
  it('commits all five tables together before publishing the new state', async () => {
    const before = useProgress.getState()
    const transactions: unknown[] = []
    const tables = [db.userProfile, db.planet, db.dailyStats, db.userWords, db.progress]
    const capture = () => {
      transactions.push(Dexie.currentTransaction)
      expect(useProgress.getState().profile).toBe(before.profile)
      expect(useProgress.getState().daily?.modules.vocab).toBe(0)
    }
    for (const table of tables) { table.hook('creating', capture); table.hook('updating', capture) }
    try { await useProgress.getState().answer(answer) } finally {
      for (const table of tables) { table.hook('creating').unsubscribe(capture); table.hook('updating').unsubscribe(capture) }
    }
    expect(transactions).toHaveLength(5)
    expect(new Set(transactions).size).toBe(1)
    expect(transactions[0]).toBeTruthy()
    const state = useProgress.getState()
    expect(state.profile?.totalXp).toBe(10)
    expect(state.daily?.modules.vocab).toBe(1)
    expect(await db.userProfile.get(1)).toEqual(state.profile)
    expect(await db.planet.get(1)).toEqual(state.planet)
    expect(await db.dailyStats.get(dayKey(Date.now()))).toEqual(state.daily)
    expect(await db.userWords.get('atomic-word')).toEqual(state.userWords[0])
    expect(await db.progress.get(1)).toEqual(state.progress)
  })
  it('rolls back every write and leaves game state untouched, then supports retry', async () => {
    const before = useProgress.getState()
    const fail = () => { throw new Error('simulated disk full') }
    db.progress.hook('updating', fail)
    try { await useProgress.getState().answer(answer) } finally { db.progress.hook('updating').unsubscribe(fail) }
    const after = useProgress.getState()
    for (const key of ['profile', 'planet', 'daily', 'userWords', 'progress', 'combo', 'difficulty', 'session', 'feedback'] as const) expect(after[key]).toBe(before[key])
    expect(after.saveError).toBeTruthy()
    expect(await db.userProfile.get(1)).toEqual(before.profile)
    expect(await db.planet.get(1)).toEqual(before.planet)
    expect(await db.dailyStats.get(before.daily!.date)).toEqual(before.daily)
    expect(await db.userWords.count()).toBe(0)
    expect(await db.progress.get(1)).toEqual(before.progress)
    await after.retrySave()
    expect(useProgress.getState().profile?.totalXp).toBe(10)
    expect(useProgress.getState().saveError).toBeNull()
  })
  it('serializes rapid answers so neither answer is lost', async () => {
    await Promise.all([useProgress.getState().answer(answer), useProgress.getState().answer(answer)])
    expect(useProgress.getState().daily?.modules.vocab).toBe(2)
    expect((await db.userWords.get('atomic-word'))?.total).toBe(2)
  })
  it('resets a broken streak and rolls daily stats to the current local date', async () => {
    const profile = { ...useProgress.getState().profile!, streakDays: 8, lastStudyDate: '2020-01-01' }
    useProgress.setState({ profile, daily: { ...useProgress.getState().daily!, date: '2020-01-01', xp: 99 } })
    await useProgress.getState().answer(answer)
    expect(useProgress.getState().profile).toMatchObject({ streakDays: 1, lastStudyDate: dayKey(Date.now()) })
    expect(useProgress.getState().daily).toMatchObject({ date: dayKey(Date.now()), xp: 10 })
    await useProgress.getState().answer(answer)
    expect(useProgress.getState().profile?.streakDays).toBe(1)
  })
  it('awards quest XP once and the 50-energy chest once per local day', async () => {
    const daily = { ...useProgress.getState().daily!, xp: 80, comboMax: 5, modules: { ...useProgress.getState().daily!.modules, vocab: 9 } }
    useProgress.setState({ daily })
    await useProgress.getState().answer(answer)
    expect(useProgress.getState().profile?.totalXp).toBe(85)
    const beforeChest = useProgress.getState().planet!.energy
    await Promise.all([useProgress.getState().claimDailyChest(), useProgress.getState().claimDailyChest()])
    expect(useProgress.getState().planet?.energy).toBe(beforeChest + 50)
    await useProgress.getState().answer(answer)
    expect(useProgress.getState().profile?.totalXp).toBe(95)
    expect((await db.userProfile.get(1))?.claimedQuestDates).toContain(dayKey(Date.now()))
  })
  it('does not let yesterday’s completed quests unlock today’s chest', async () => {
    useProgress.setState({ daily: { ...useProgress.getState().daily!, date: '2020-01-01', xp: 80, comboMax: 5, modules: { ...useProgress.getState().daily!.modules, vocab: 10 } } })
    await useProgress.getState().claimDailyChest()
    expect(useProgress.getState().planet?.energy).toBe(0)
  })
})

describe('completion identity and session IDs', () => {
  it('counts a sentence, listening item and reading chapter only once across replays', async () => {
    const state = useProgress.getState()
    await state.passSentence('p1')
    await state.passSentence('p1')
    await state.passSentence('p2')
    await state.passListening('l1')
    await state.passListening('l1')
    await state.completeReading('ch1')
    await state.completeReading('ch1')
    expect(await db.progress.get(1)).toMatchObject({ sentencePassed: 2, listeningPassed: 1, readingDone: 1 })
  })

  it('persists two sessions finishing within the same millisecond', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1790000000000)
    const state = useProgress.getState()
    await state.answer(answer)
    await state.finishSession()
    await state.startSession('vocab')
    await state.answer(answer)
    await state.finishSession()
    expect(useProgress.getState().saveError).toBeNull()
    expect(await db.sessions.count()).toBe(2)
  })
})

describe('star dust and hint costs', () => {
  it('halves the XP for a hinted answer without touching combo or energy', async () => {
    const state = useProgress.getState()
    await state.answer({ ...answer, hintUsed: true })
    const hinted = useProgress.getState()
    expect(hinted.profile?.totalXp).toBe(5)
    expect(hinted.daily?.xp).toBe(5)
    expect(hinted.combo.combo).toBe(1)
    expect(hinted.planet?.energy).toBeGreaterThan(0)
  })

  it('converts stardust into planet energy in batches and persists both tables', async () => {
    const progress = { ...useProgress.getState().progress!, stardust: 45 }
    await db.progress.put(progress)
    useProgress.setState({ progress })
    await useProgress.getState().convertStardust()
    const after = useProgress.getState()
    // 45 星尘 → 花掉 2 批（40），换成 100 能量，余 5。
    expect(after.progress?.stardust).toBe(5)
    expect(after.planet?.energy).toBe(100)
    expect(await db.progress.get(1)).toMatchObject({ stardust: 5 })
    expect(await db.planet.get(1)).toMatchObject({ energy: 100 })
  })

  it('does nothing when there is not enough stardust for one batch', async () => {
    const progress = { ...useProgress.getState().progress!, stardust: 5 }
    useProgress.setState({ progress })
    await useProgress.getState().convertStardust()
    expect(useProgress.getState().progress?.stardust).toBe(5)
    expect(useProgress.getState().planet?.energy).toBe(0)
  })
})

describe('chapter settlement persistence', () => {
  it('keeps writes paused until every concurrent transition lease is released', async () => {
    const first = await pausePersistenceWrites()
    const second = pausePersistenceWrites()
    first()
    const answerPromise = useProgress.getState().answer(answer)
    await Promise.resolve()
    expect((await db.userProfile.get(1))?.totalXp).toBe(0)
    const releaseSecond = await second
    releaseSecond()
    await answerPromise
    expect((await db.userProfile.get(1))?.totalXp).toBe(10)
  })

  it('shares one in-flight initialization across concurrent callers', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    const originalGet = db.userProfile.get.bind(db.userProfile)
    let profileReads = 0
    const get = vi.spyOn(db.userProfile, 'get').mockImplementation((key) => {
      profileReads += 1
      return gate.then(() => originalGet(key)) as ReturnType<typeof db.userProfile.get>
    })

    const first = useProgress.getState().init()
    await Promise.resolve()
    const second = useProgress.getState().init()
    expect(profileReads).toBe(1)
    release()
    await Promise.all([first, second])
    expect(useProgress.getState().ready).toBe(true)
    expect(get).toHaveBeenCalledOnce()
  })

  it('defers new writes until a persistence transition releases the gate', async () => {
    const release = await pausePersistenceWrites()
    const answerPromise = useProgress.getState().answer(answer)
    await Promise.resolve()
    expect((await db.userProfile.get(1))?.totalXp).toBe(0)
    release()
    await answerPromise
    expect((await db.userProfile.get(1))?.totalXp).toBe(10)
  })
})

it('keeps legacy completion floors after first tracked replays and later initialization', async () => {
  const legacy = { ...useProgress.getState().progress!, sentencePassed: SENTENCE_QUESTS.length, listeningPassed: LISTENING_ITEMS.length, readingDone: CHAPTERS.length, narrative: {} }
  await db.progress.put(legacy)
  useProgress.setState({ progress: legacy })
  await useProgress.getState().passSentence(SENTENCE_QUESTS[0].id)
  await useProgress.getState().passListening(LISTENING_ITEMS[0].id)
  await useProgress.getState().completeReading(CHAPTERS[0].id)
  await useProgress.getState().init()
  expect(useProgress.getState().progress).toMatchObject({ sentencePassed: SENTENCE_QUESTS.length, listeningPassed: LISTENING_ITEMS.length, readingDone: CHAPTERS.length })
})

it('caps legacy replay counters at unique content totals during initialization', async () => {
  const progress = { ...useProgress.getState().progress!, sentencePassed: 999, listeningPassed: 999, readingDone: 999, narrative: {} }
  await db.progress.put(progress)
  await useProgress.getState().init()
  expect(useProgress.getState().progress).toMatchObject({ sentencePassed: 6, listeningPassed: 8, readingDone: 2 })
})

it('migrates v2 records without losing totals, reviews, settings, progress or sessions', async () => {
  const saved = useProgress.getState()
  await db.delete()
  const old = new Dexie('flowvocab-app')
  old.version(2).stores({ userProfile: 'id', userWords: 'id, wordId, status, nextReview', dailyStats: 'date', sessions: 'id, time, module', progress: 'id', planet: 'id', wordBank: 'id, word, level, source', wordBankMeta: 'id' })
  const { lastStudyDate: _date, claimedQuestDates: _claims, unlockedAchievements: _achievements, ...legacyProfile } = saved.profile!
  await old.table('userProfile').put({ ...legacyProfile, totalXp: 987, streakDays: 4 })
  await old.table('userWords').bulkPut([{ id: 'legacy', wordId: 'legacy', status: 'mastered', correct: 8, total: 10, lastReview: 123, nextReview: 999, interval: 10, quality: 5 }, { id: 'learning', wordId: 'learning', status: 'learning', successfulReviews: 2, correct: 2, total: 2 }])
  await old.table('progress').put({ ...saved.progress, sentencePassed: 9, skillTree: { present: true } })
  await old.table('planet').put({ ...saved.planet, energy: 480 })
  await old.table('dailyStats').put(saved.daily!)
  await old.table('sessions').put({ id: 77, time: 123, module: 'vocab', total: 10, correct: 8, comboMax: 4, energy: 12, difficultyFlow: [1, 2] })
  old.close()
  await db.open()
  expect(await db.userProfile.get(1)).toMatchObject({ totalXp: 987, streakDays: 4, lastStudyDate: null, claimedQuestDates: [], unlockedAchievements: [], settings: legacyProfile.settings })
  expect(await db.userWords.get('legacy')).toMatchObject({ correct: 8, total: 10, lastReview: 123, nextReview: 999, successfulReviews: 3 })
  expect((await db.userWords.get('learning'))?.successfulReviews).toBe(2)
  expect(await db.progress.get(1)).toMatchObject({ sentencePassed: 9, skillTree: { present: true } })
  expect((await db.planet.get(1))?.energy).toBe(480)
  expect(await db.dailyStats.get(saved.daily!.date)).toEqual(saved.daily)
  expect(await db.sessions.get(77)).toMatchObject({ total: 10, difficultyFlow: [1, 2] })
})
