import { db } from './db'
import type { DifficultyLevel, Word, WordBankProgress } from '../types'

const IMPORT_VERSION = 3, BATCH = 2000
let cache: Record<DifficultyLevel, Word[]> | null = null, total = 0, fallbackMessage = ''
let latestProgress: WordBankProgress = { phase: 'download', loaded: 0, total: 0 }
const listeners = new Set<(progress: WordBankProgress) => void>()
const publish = (progress: WordBankProgress) => { latestProgress = progress; listeners.forEach(listener => listener(progress)) }
const buildCache = (words: Word[]) => { const result: Record<DifficultyLevel, Word[]> = { 0: [], 1: [], 2: [], 3: [], 4: [] }; words.forEach(word => result[word.level].push(word)); return result }
const normalize = (word: Word): Word => ({ ...word, phonetic: word.phonetic || '', example: word.example || '', exampleCn: word.exampleCn || '', phrases: word.phrases || [], source: 'ecdict', tags: word.tags || [] })
export function wordBankFallbackMessage() { return fallbackMessage }
export function wordBankTotal() { return total }
export function getWordPool(level: DifficultyLevel) { return cache?.[level] || [] }
export async function findStoredWordLevel(wordId: string): Promise<DifficultyLevel | null> { return (await db.wordBank.get(wordId))?.level ?? null }

async function mergeWords(words: Word[]) {
  await db.transaction('rw', db.wordBank, db.userWords, db.wordBankMeta, async () => {
    const legacyInventory = await db.wordBank.filter(word => /^(cet4|cet6)-/.test(word.id)).toArray()
    await db.wordBank.bulkDelete(legacyInventory.map(word => word.id))
    for (const word of words) {
      await db.wordBank.put(word)
      for (const legacyId of word.legacyIds || []) {
        const legacy = await db.userWords.where('wordId').equals(legacyId).toArray()
        for (const row of legacy) {
          const current = await db.userWords.where('wordId').equals(word.id).first()
          if (current) await db.userWords.put({ ...current, correct: current.correct + row.correct, total: current.total + row.total, status: current.status === 'mastered' || row.status === 'mastered' ? 'mastered' : current.status === 'learning' || row.status === 'learning' ? 'learning' : 'new', lastReview: Math.max(current.lastReview || 0, row.lastReview || 0) || null, nextReview: Math.max(current.nextReview, row.nextReview), interval: Math.max(current.interval, row.interval), quality: Math.max(current.quality, row.quality), successfulReviews: Math.max(current.successfulReviews, row.successfulReviews) })
          else await db.userWords.put({ ...row, id: row.id === word.id ? row.id : `user-${word.id}`, wordId: word.id })
          await db.userWords.delete(row.id)
        }
      }
    }
  })
}

export async function importWordBankResponse(response: Response, onProgress: (progress: WordBankProgress) => void = () => {}) {
  if (!response.ok) throw new Error(`word download failed: HTTP ${response.status}`)
  const length = Number(response.headers.get('content-length')) || 0; onProgress({ phase: 'download', loaded: 0, total: length })
  let raw: Word[]
  if (length && response.body) { const reader = response.body.getReader(), decoder = new TextDecoder(); let text = '', loaded = 0; try { for (;;) { const chunk = await reader.read(); if (chunk.done) break; text += decoder.decode(chunk.value, { stream: true }); loaded += chunk.value.byteLength; onProgress({ phase: 'download', loaded, total: length }) } text += decoder.decode(); raw = JSON.parse(text) } finally { reader.releaseLock() } } else raw = await response.json()
  if (!Array.isArray(raw) || !raw.length) throw new Error('invalid word shard')
  const words = raw.map(normalize); onProgress({ phase: 'import', loaded: 0, total: words.length })
  for (let index = 0; index < words.length; index += BATCH) { await mergeWords(words.slice(index, index + BATCH)); onProgress({ phase: 'import', loaded: Math.min(index + BATCH, words.length), total: words.length }) }
  const all = await db.wordBank.toArray(); await db.wordBankMeta.put({ id: 1, version: IMPORT_VERSION, total: all.length, updatedAt: Date.now(), loadedLevels: [0, 1, 2, 3, 4] }); cache = buildCache(all); total = all.length
}

type Manifest = { version: number; total: number; counts: number[]; urls: string[] }
export async function ensureWordLevels(levels: DifficultyLevel[], onProgress?: (progress: WordBankProgress) => void) {
  if (onProgress) listeners.add(onProgress)
  try {
    const meta = await db.wordBankMeta.get(1)
    const legacyInventory = await db.wordBank.filter(word => /^(cet4|cet6)-/.test(word.id)).toArray()
    if (legacyInventory.length) {
      await mergeWords(await db.wordBank.filter(word => word.source === 'ecdict').toArray())
      cache = null
    }
    if (cache && await db.wordBank.count() === total && levels.every(level => cache![level].length > 0)) { onProgress?.({ phase: 'ready', loaded: total, total }); return cache }
    const loaded = new Set(meta?.version === IMPORT_VERSION ? meta.loadedLevels || [] : [])
    const needed = levels.filter(level => !loaded.has(level))
    if (needed.length) {
      const manifestResponse = await fetch('/data/words/manifest.json'); if (!manifestResponse.ok) throw new Error('manifest unavailable')
      const manifest: Manifest = await manifestResponse.json()
      await Promise.all(needed.map(async level => { const response = await fetch(`/data/words/${manifest.urls[level]}`); if (!response.ok) throw new Error(`level ${level} unavailable`); const words = (await response.json() as Word[]).map(normalize); await mergeWords(words); loaded.add(level) }))
      const all = await db.wordBank.toArray(); await db.wordBankMeta.put({ id: 1, version: IMPORT_VERSION, total: manifest.total, updatedAt: Date.now(), loadedLevels: [...loaded].sort() }); cache = buildCache(all); total = all.length
    } else if (!cache) { const all = await db.wordBank.toArray(); cache = buildCache(all); total = all.length }
  } catch { const saved = await db.wordBank.toArray().catch(() => []); cache = buildCache(saved.filter(word => word.source === 'ecdict')); total = Object.values(cache).flat().length; fallbackMessage = 'ECDICT 词库分片暂不可用，暂时没有可加载的新词。' }
  publish({ phase: 'ready', loaded: total, total }); if (onProgress) listeners.delete(onProgress); return cache!
}
export async function ensureWordBank(onProgress?: (progress: WordBankProgress) => void) { return ensureWordLevels([0, 1, 2, 3, 4], onProgress) }
export function buildVocabOptions(correct: Word, pool: Word[]) { const used = new Set([correct.meaning]), values = [correct.meaning]; for (const word of pool) if (values.length < 4 && word.id !== correct.id && word.meaning && !used.has(word.meaning)) { used.add(word.meaning); values.push(word.meaning) } return values.map(text => ({ text, correct: text === correct.meaning })) }
