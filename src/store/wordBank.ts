import { db } from './db'
import type { DifficultyLevel, Word, WordBankProgress } from '../types'

const IMPORT_VERSION = 3, BATCH = 2000
const LEVELS: DifficultyLevel[] = [0, 1, 2, 3, 4]
const dataUrl = (path: string) => import.meta.env.BASE_URL + 'data/words/' + path
type ProgressListener = (progress: WordBankProgress) => void
type Manifest = { version: number; total: number; counts: number[]; urls: string[] }
// Optional metadata remains compatible with previously imported version-3 banks.
type BankMeta = {
  id: number; version: number; total: number; updatedAt: number; loadedLevels?: number[]
  levelCounts?: Partial<Record<DifficultyLevel, number>>
}
let cache: Record<DifficultyLevel, Word[]> | null = null, total = 0, fallbackMessage = ''
let manifestRequest: Promise<Manifest> | null = null
const inFlight = new Map<DifficultyLevel, Promise<void>>()
const listeners = new Set<ProgressListener>()
function notify(listener: ProgressListener | undefined, progress: WordBankProgress) {
  try { listener?.(progress) } catch { /* UI observers must not abort an import. */ }
}
const publish: ProgressListener = progress => listeners.forEach(listener => notify(listener, progress))
const normalize = (word: Word): Word => ({ ...word, phonetic: word.phonetic || '', example: word.example || '', exampleCn: word.exampleCn || '', phrases: word.phrases || [], source: 'ecdict', tags: word.tags || [] })
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0
const count = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
const isLevel = (value: unknown): value is DifficultyLevel => count(value) && value <= 4
const stringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every(text)

function validWord(value: unknown): value is Word {
  if (!object(value) || !text(value.id) || !text(value.word) || !text(value.meaning) || !isLevel(value.level) || typeof value.pos !== 'string') return false
  if (value.source !== undefined && value.source !== 'ecdict') return false
  if (['phonetic', 'example', 'exampleCn'].some(key => value[key] !== undefined && typeof value[key] !== 'string')) return false
  if (value.tags !== undefined && !stringArray(value.tags)) return false
  if (value.legacyIds !== undefined && (!stringArray(value.legacyIds) || value.legacyIds.includes(value.id))) return false
  return value.phrases === undefined || (Array.isArray(value.phrases) && value.phrases.every(phrase => object(phrase) && text(phrase.phrase) && typeof phrase.translation === 'string'))
}

function validateShard(raw: unknown, level?: DifficultyLevel, expectedCount?: number): Word[] {
  if (!Array.isArray(raw) || (!raw.length && expectedCount !== 0) || (expectedCount !== undefined && raw.length !== expectedCount)) throw new Error('invalid word shard')
  const ids = new Set<string>()
  return raw.map(value => {
    if (!validWord(value) || (level !== undefined && value.level !== level) || ids.has(value.id)) throw new Error('invalid word record')
    ids.add(value.id)
    return normalize(value)
  })
}

function validateManifest(value: unknown): Manifest {
  if (!object(value) || value.version !== IMPORT_VERSION || !count(value.total)
    || !Array.isArray(value.counts) || value.counts.length !== LEVELS.length || !value.counts.every(count)
    || value.counts.reduce((sum, size) => sum + size, 0) !== value.total
    || !Array.isArray(value.urls) || value.urls.length !== LEVELS.length
    // Shards are local JSON filenames, never absolute, encoded, or traversing paths.
    || !value.urls.every(url => typeof url === 'string' && /^[a-zA-Z0-9_-][a-zA-Z0-9_.-]*\.json$/.test(url))) throw new Error('invalid word manifest')
  return value as Manifest
}

function buildCache(words: Word[]) {
  const result: Record<DifficultyLevel, Word[]> = { 0: [], 1: [], 2: [], 3: [], 4: [] }
  for (const word of words) if (word.source === 'ecdict' && validWord(word)) result[word.level].push(normalize(word))
  return result
}
function setCache(words: Word[]) {
  cache = buildCache(words)
  total = LEVELS.reduce<number>((sum, level) => sum + cache![level].length, 0)
  return cache
}
function levelIsLoaded(meta: BankMeta | undefined, level: DifficultyLevel, size: number) {
  if (meta?.version !== IMPORT_VERSION || !meta.loadedLevels?.includes(level)) return false
  const expected = meta.levelCounts?.[level]
  return expected === undefined ? size > 0 : count(expected) && size === expected
}

export function wordBankFallbackMessage() { return fallbackMessage }
export function wordBankTotal() { return total }
export function getWordPool(level: DifficultyLevel) { return cache?.[level] || [] }
export async function findStoredWordLevel(wordId: string): Promise<DifficultyLevel | null> { return (await db.wordBank.get(wordId))?.level ?? null }

async function migrateUserWords(word: Word) {
  for (const legacyId of word.legacyIds || []) {
    const legacy = await db.userWords.where('wordId').equals(legacyId).toArray()
    for (const row of legacy) {
      const current = await db.userWords.where('wordId').equals(word.id).first()
      const targetId = current?.id ?? (row.id === word.id ? row.id : `user-${word.id}`)
      if (current) await db.userWords.put({ ...current, correct: current.correct + row.correct, total: current.total + row.total, status: current.status === 'mastered' || row.status === 'mastered' ? 'mastered' : current.status === 'learning' || row.status === 'learning' ? 'learning' : 'new', lastReview: Math.max(current.lastReview || 0, row.lastReview || 0) || null, nextReview: Math.max(current.nextReview, row.nextReview), interval: Math.max(current.interval, row.interval), quality: Math.max(current.quality, row.quality), successfulReviews: Math.max(current.successfulReviews, row.successfulReviews) })
      else await db.userWords.put({ ...row, id: targetId, wordId: word.id })
      if (row.id !== targetId) await db.userWords.delete(row.id)
    }
  }
}

// Run inside the same transaction as the validated shard, or for an offline cache hit.
async function cleanLegacyInventory() {
  const legacy = await db.wordBank.filter(word => /^(cet4|cet6)-/.test(word.id)).toArray()
  if (!legacy.length) return
  const stored = await db.wordBank.where('source').equals('ecdict').toArray()
  for (const word of stored) if (validWord(word) && word.legacyIds?.length) await migrateUserWords(word)
  await db.wordBank.bulkDelete(legacy.map(word => word.id))
}

async function readResponse(response: Response, onProgress: ProgressListener): Promise<unknown> {
  if (!response.ok) throw new Error(`word download failed: HTTP ${response.status}`)
  const header = Number(response.headers.get('content-length'))
  const length = count(header) ? header : 0
  onProgress({ phase: 'download', loaded: 0, total: length })
  if (!response.body) return response.json()
  const reader = response.body.getReader(), decoder = new TextDecoder()
  let text = '', loaded = 0
  try {
    for (;;) {
      const chunk = await reader.read()
      if (chunk.done) break
      text += decoder.decode(chunk.value, { stream: true })
      loaded += chunk.value.byteLength
      onProgress({ phase: 'download', loaded, total: length })
    }
    return JSON.parse(text + decoder.decode())
  } finally { reader.releaseLock() }
}

async function storeWords(words: Word[], onProgress: ProgressListener, shard?: { level: DifficultyLevel; manifest: Manifest }) {
  onProgress({ phase: 'import', loaded: 0, total: words.length })
  await db.transaction('rw', db.wordBank, db.userWords, db.wordBankMeta, async () => {
    // Read metadata under the write lock so concurrent shard commits cannot lose levels.
    const meta: BankMeta | undefined = await db.wordBankMeta.get(1)
    await cleanLegacyInventory()
    // Manifest shards replace only their own inventory; direct imports stay additive.
    if (shard) await db.wordBank.where('level').equals(shard.level).delete()
    for (let index = 0; index < words.length; index += BATCH) {
      const batch = words.slice(index, index + BATCH)
      await db.wordBank.bulkPut(batch)
      for (const word of batch) if (word.legacyIds?.length) await migrateUserWords(word)
      onProgress({ phase: 'import', loaded: Math.min(index + BATCH, words.length), total: words.length })
    }
    const pools = buildCache(await db.wordBank.toArray())
    const loaded = new Set(LEVELS.filter(level => levelIsLoaded(meta, level, pools[level].length)))
    const levelCounts = { ...(meta?.version === IMPORT_VERSION ? meta.levelCounts : {}) }
    for (const level of shard ? [shard.level] : new Set(words.map(word => word.level))) {
      loaded.add(level)
      levelCounts[level] = shard ? shard.manifest.counts[level] : pools[level].length
    }
    const nextMeta: BankMeta = {
      id: 1, version: IMPORT_VERSION,
      total: shard?.manifest.total ?? LEVELS.reduce<number>((sum, level) => sum + pools[level].length, 0),
      updatedAt: Date.now(), loadedLevels: [...loaded].sort(), levelCounts,
    }
    await db.wordBankMeta.put(nextMeta)
  })
}

export async function importWordBankResponse(response: Response, onProgress: ProgressListener = () => {}) {
  const progress: ProgressListener = value => notify(onProgress, value)
  const words = validateShard(await readResponse(response, progress))
  await storeWords(words, progress)
  setCache(await db.wordBank.toArray())
  fallbackMessage = ''
}

function getManifest() {
  if (!manifestRequest) manifestRequest = (async () => {
    const response = await fetch(dataUrl('manifest.json'))
    if (!response.ok) throw new Error('manifest unavailable')
    return validateManifest(await response.json())
  })()
  return manifestRequest
}

function ensureLevel(level: DifficultyLevel): Promise<void> {
  const pending = inFlight.get(level)
  if (pending) return pending
  const request = (async () => {
    const loaded = await db.transaction('r', db.wordBank, db.wordBankMeta, async () => {
      const meta: BankMeta | undefined = await db.wordBankMeta.get(1)
      const stored = await db.wordBank.where('level').equals(level).toArray()
      return levelIsLoaded(meta, level, buildCache(stored)[level].length)
    })
    if (loaded) return
    const manifest = await getManifest()
    const raw = await readResponse(await fetch(dataUrl(manifest.urls[level])), publish)
    const words = validateShard(raw, level, manifest.counts[level])
    await storeWords(words, publish, { level, manifest })
  })().finally(() => {
    inFlight.delete(level)
    if (!inFlight.size) manifestRequest = null
  })
  inFlight.set(level, request)
  return request
}

export async function ensureWordLevels(levels: DifficultyLevel[], onProgress?: ProgressListener) {
  // A per-call wrapper also handles two callers sharing the same callback function.
  const listener: ProgressListener | undefined = onProgress && (progress => onProgress(progress))
  if (listener) listeners.add(listener)
  try {
    if (!levels.every(isLevel)) throw new Error('invalid word level')
    const results = await Promise.allSettled([...new Set(levels)].map(ensureLevel))
    // Do not return while a sibling shard can still be writing after another fails.
    if (results.some(result => result.status === 'rejected')) throw new Error('word shard unavailable')
    await db.transaction('rw', db.wordBank, db.userWords, async () => { await cleanLegacyInventory() })
    setCache(await db.wordBank.toArray())
    fallbackMessage = ''
  } catch {
    setCache(await db.wordBank.toArray().catch(() => []))
    fallbackMessage = 'ECDICT 词库分片暂不可用，暂时没有可加载的新词。'
  } finally {
    if (listener) listeners.delete(listener)
  }
  notify(onProgress, { phase: 'ready', loaded: total, total })
  return cache!
}
export async function ensureWordBank(onProgress?: ProgressListener) { return ensureWordLevels(LEVELS, onProgress) }
export function buildVocabOptions(correct: Word, pool: Word[]) { const used = new Set([correct.meaning]), values = [correct.meaning]; for (const word of pool) if (values.length < 4 && word.id !== correct.id && word.meaning && !used.has(word.meaning)) { used.add(word.meaning); values.push(word.meaning) } return values.map(text => ({ text, correct: text === correct.meaning })) }
