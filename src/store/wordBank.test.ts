import 'fake-indexeddb/auto'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { db } from './db'
import { ensureWordBank, ensureWordLevels, importWordBankResponse } from './wordBank'
import type { Word, WordBankProgress } from '../types'

beforeEach(async () => { await db.delete(); await db.open() })
afterEach(async () => { await db.delete() })
it('fetches only requested word shards and caches only their levels', async () => {
  const requested: string[] = []; const original = globalThis.fetch
  globalThis.fetch = async (input) => {
    const path = String(input); requested.push(path)
    if (path.endsWith('manifest.json')) return new Response(JSON.stringify({ version: 3, total: 10, counts: [2, 2, 2, 2, 2], urls: ['level-0.json', 'level-1.json', 'level-2.json', 'level-3.json', 'level-4.json'] }))
    const level = Number(path.match(/level-(\d)/)?.[1])
    return new Response(JSON.stringify([{ id: `ecdict-${level}`, word: `word${level}`, meaning: 'meaning', phonetic: '', example: '', exampleCn: '', level, pos: 'noun', source: 'ecdict', tags: ['cet4'] }]))
  }
  try { await ensureWordLevels([0, 2]) } finally { globalThis.fetch = original }
  expect(requested).toContain('/data/words/manifest.json')
  expect(requested).toContain('/data/words/level-0.json')
  expect(requested).toContain('/data/words/level-2.json')
  expect(requested.some(path => /level-[134]\.json$/.test(path))).toBe(false)
})
it('removes legacy bank inventory while retaining its migrated user progress', async () => {
  await db.wordBank.put({ id: 'cet4-old', word: 'old', meaning: 'old', phonetic: '', example: '', exampleCn: '', level: 0, pos: 'noun' })
  await db.userWords.put({ id: 'progress', wordId: 'cet4-old', status: 'learning', correct: 2, total: 3, lastReview: 1, nextReview: 2, interval: 1, quality: 2, successfulReviews: 1 })
  const original = globalThis.fetch
  globalThis.fetch = async (input) => String(input).endsWith('manifest.json') ? new Response(JSON.stringify({ version: 3, total: 1, counts: [1, 0, 0, 0, 0], urls: ['level-0.json', 'level-1.json', 'level-2.json', 'level-3.json', 'level-4.json'] })) : new Response(JSON.stringify([{ id: 'ecdict-new', word: 'new', meaning: 'new', phonetic: '', example: '', exampleCn: '', level: 0, pos: 'noun', source: 'ecdict', tags: [], legacyIds: ['cet4-old'] }]))
  try { await ensureWordLevels([0]) } finally { globalThis.fetch = original }
  expect(await db.wordBank.get('cet4-old')).toBeUndefined()
  expect((await db.userWords.where('wordId').equals('ecdict-new').first())?.total).toBe(3)
})
const words: Word[] = Array.from({ length: 2001 }, (_, i) => ({ id: `word-${i}`, word: 'island', meaning: '岛屿', phonetic: '', example: '', exampleCn: '', level: 0, pos: 'n.' }))
it('reports byte download and incremental import progress without removing existing words', async () => {
  await db.wordBank.put({ ...words[0], id: 'existing' })
  const bytes = new TextEncoder().encode(JSON.stringify(words))
  const response = new Response(new ReadableStream({ start(controller) { controller.enqueue(bytes.slice(0, 100)); controller.enqueue(bytes.slice(100)); controller.close() } }), { headers: { 'content-length': String(bytes.length) } })
  const progress: WordBankProgress[] = []
  await importWordBankResponse(response, value => progress.push(value))
  expect(progress.filter(p => p.phase === 'download').map(p => p.loaded)).toEqual([0, 100, bytes.length])
  expect(progress.filter(p => p.phase === 'import').map(p => p.loaded)).toEqual([0, 2000, 2001])
  expect(await db.wordBank.count()).toBe(2002)
  expect(await db.wordBank.get('existing')).toBeDefined()
})
it('reports batch progress without a content length and ready counts for cached callers', async () => {
  const progress: WordBankProgress[] = []
  await importWordBankResponse(new Response(JSON.stringify(words)), value => progress.push(value))
  expect(progress).toContainEqual({ phase: 'import', loaded: 2001, total: 2001 })
  await ensureWordBank(value => progress.push(value))
  expect(progress[progress.length - 1]).toEqual({ phase: 'ready', loaded: 2001, total: 2001 })
  const cached: WordBankProgress[] = []
  await ensureWordBank(value => cached.push(value))
  expect(cached).toEqual([{ phase: 'ready', loaded: 2001, total: 2001 }])
})
