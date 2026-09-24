import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { useProgress } from './progressStore'
import { dayKey } from '../engine/forget'

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
afterEach(async () => { await db.delete() })

describe('atomic answer persistence', () => {
  it('finishes the old session before starting a new module while an answer is saving', async () => {
    const s = useProgress.getState()
    await Promise.all([s.answer(answer), s.finishSession(), s.startSession('grammar')])
    expect((await db.sessions.toArray())[0]).toMatchObject({ module: 'vocab', total: 1, correct: 1 })
    expect(useProgress.getState().session).toMatchObject({ module: 'grammar', total: 0 })
  })
  it('retains a failed answer for retry even after a later answer succeeds', async () => {
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
