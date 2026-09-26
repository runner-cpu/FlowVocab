import 'fake-indexeddb/auto'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { db } from './db'
import { ensureWordBank, importWordBankResponse } from './wordBank'
import type { Word, WordBankProgress } from '../types'

beforeEach(async () => { await db.delete(); await db.open() })
afterEach(async () => { await db.delete() })
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
