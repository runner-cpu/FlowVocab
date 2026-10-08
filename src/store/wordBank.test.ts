import 'fake-indexeddb/auto'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { DifficultyLevel, UserWord, Word, WordBankProgress } from '../types'

let db: typeof import('./db').db
let bank: typeof import('./wordBank')

beforeEach(async () => {
  vi.resetModules()
  db = (await import('./db')).db
  bank = await import('./wordBank')
  await db.delete()
  await db.open()
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
})
afterEach(async () => {
  await db.delete()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const word = (level: DifficultyLevel, overrides: Partial<Word> = {}): Word => ({
  id: `ecdict-${level}`, word: `word${level}`, meaning: 'meaning', phonetic: '',
  example: '', exampleCn: '', level, pos: 'noun', source: 'ecdict', tags: ['cet4'], ...overrides,
})
const manifest = (counts = [1, 1, 1, 1, 1]) => ({
  version: 3, total: counts.reduce((sum, count) => sum + count, 0), counts,
  urls: ['level-0.json', 'level-1.json', 'level-2.json', 'level-3.json', 'level-4.json'],
})
const json = (value: unknown) => new Response(JSON.stringify(value))
function serveShards(value: unknown = manifest(), response = async (level: DifficultyLevel) => json([word(level)])) {
  const requests: string[] = []
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const path = String(input)
    requests.push(path)
    if (path.endsWith('/manifest.json')) return json(value)
    const match = /\/level-([0-4])\.json$/.exec(path)
    if (!match) throw new Error(`Unexpected shard URL: ${path}`)
    return response(Number(match[1]) as DifficultyLevel)
  }))
  return requests
}
function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>(done => { resolve = done })
  return { promise, resolve }
}
const legacyWord = word(0, { id: 'cet4-old', source: undefined })
const legacyProgress: UserWord = { id: 'progress', wordId: 'cet4-old', status: 'learning', correct: 2, total: 3, lastReview: 1, nextReview: 2, interval: 1, quality: 2, successfulReviews: 1 }
const storedMeta = { id: 1, version: 3, total: 5, updatedAt: 123, loadedLevels: [4] }
async function seedLegacy() {
  await db.wordBank.bulkPut([legacyWord, word(4)])
  await db.userWords.put(legacyProgress)
  await db.wordBankMeta.put(storedMeta)
}
async function expectLegacyUnchanged() {
  expect(await db.wordBank.count()).toBe(2)
  expect(await db.wordBank.toArray()).toEqual([legacyWord, word(4)])
  expect(await db.userWords.toArray()).toEqual([legacyProgress])
  expect(await db.wordBankMeta.get(1)).toEqual(storedMeta)
}

it('fetches only requested word shards and caches only their levels', async () => {
  const requests = serveShards()
  const pools = await bank.ensureWordLevels([0, 2])
  expect(requests).toEqual(['/data/words/manifest.json', '/data/words/level-0.json', '/data/words/level-2.json'])
  expect(pools[0].map(item => item.id)).toEqual(['ecdict-0'])
  expect(pools[2].map(item => item.id)).toEqual(['ecdict-2'])
  expect(pools[1]).toEqual([])
  expect((await db.wordBankMeta.get(1))?.loadedLevels).toEqual([0, 2])
})

it('loads all levels through ensureWordBank and then serves them offline without refetching', async () => {
  const requests = serveShards()
  await bank.ensureWordBank()
  expect(requests.filter(path => /level-\d\.json$/.test(path))).toHaveLength(5)
  expect((await db.wordBankMeta.get(1))?.loadedLevels).toEqual([0, 1, 2, 3, 4])
  const cachedRequests = serveShards(undefined, async () => { throw new Error('offline') })
  const progress: WordBankProgress[] = []
  const pools = await bank.ensureWordBank(value => progress.push(value))
  expect(Object.values(pools).flat()).toHaveLength(5)
  expect(bank.wordBankTotal()).toBe(5)
  expect(cachedRequests).toEqual([])
  expect(progress).toEqual([{ phase: 'ready', loaded: 5, total: 5 }])
})

it('normalizes omitted optional word fields without requiring an ECDICT id format', async () => {
  await bank.importWordBankResponse(json([{ id: 'custom-id', word: 'island', meaning: '岛屿', level: 0, pos: 'n.' }]))
  expect(await db.wordBank.get('custom-id')).toEqual({
    id: 'custom-id', word: 'island', meaning: '岛屿', level: 0, pos: 'n.', source: 'ecdict',
    phonetic: '', example: '', exampleCn: '', phrases: [], tags: [],
  })
})

it('removes legacy inventory while merging existing and legacy user progress exactly once', async () => {
  await seedLegacy()
  await db.userWords.put({ ...legacyProgress, id: 'current', wordId: 'ecdict-0', status: 'mastered', correct: 5, total: 6, lastReview: 4, nextReview: 5, interval: 3, quality: 4, successfulReviews: 2 })
  serveShards(manifest(), async level => json([word(level, { legacyIds: ['cet4-old'] })]))
  await bank.ensureWordLevels([0])
  await bank.ensureWordLevels([0])
  expect(await db.wordBank.get('cet4-old')).toBeUndefined()
  expect(await db.userWords.toArray()).toEqual([{ id: 'current', wordId: 'ecdict-0', status: 'mastered', correct: 7, total: 9, lastReview: 4, nextReview: 5, interval: 3, quality: 4, successfulReviews: 2 }])
})

it('cleans legacy inventory and migrates progress using already stored ECDICT records offline', async () => {
  await seedLegacy()
  await db.wordBank.put(word(4, { legacyIds: ['cet4-old'] }))
  await db.wordBank.put(word(4, { id: 'cet6-old', source: undefined }))
  await db.wordBankMeta.put({ ...storedMeta, loadedLevels: [0, 1, 2, 3, 4] })

  await bank.ensureWordLevels([4])

  expect((await db.wordBank.toArray()).map(item => item.id)).toEqual(['ecdict-4'])
  expect(await db.userWords.toArray()).toEqual([{ ...legacyProgress, id: 'user-ecdict-4', wordId: 'ecdict-4' }])
  expect(bank.wordBankFallbackMessage()).toBe('')
})

const words: Word[] = Array.from({ length: 2001 }, (_, index) => word(0, { id: `word-${index}` }))
function streamedResponse(value: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(value))
  const response = new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(bytes.slice(0, 100))
      controller.enqueue(bytes.slice(100))
      controller.close()
    },
  }), { headers: { 'content-length': String(bytes.length) } })
  return { response, length: bytes.length }
}

it('reports byte download and incremental import progress without removing existing words', async () => {
  await db.wordBank.put(word(0, { id: 'existing' }))
  const { response, length } = streamedResponse(words)
  const progress: WordBankProgress[] = []
  await bank.importWordBankResponse(response, value => progress.push(value))
  expect(progress.filter(value => value.phase === 'download').map(value => value.loaded)).toEqual([0, 100, length])
  expect(progress.filter(value => value.phase === 'import').map(value => value.loaded)).toEqual([0, 2000, 2001])
  expect(await db.wordBank.count()).toBe(2002)
  expect(await db.wordBank.get('existing')).toBeDefined()
})

it('marks only imported levels as loaded and reports ready counts to cached callers', async () => {
  const progress: WordBankProgress[] = []
  await bank.importWordBankResponse(json(words), value => progress.push(value))
  expect(progress).toContainEqual({ phase: 'import', loaded: 2001, total: 2001 })
  expect((await db.wordBankMeta.get(1))?.loadedLevels).toEqual([0])
  const cached: WordBankProgress[] = []
  await bank.ensureWordLevels([0], value => cached.push(value))
  expect(cached).toEqual([{ phase: 'ready', loaded: 2001, total: 2001 }])
})

it('shares in-flight manifests and overlapping shards, including duplicate levels in one call', async () => {
  const gate = deferred()
  const requests = serveShards(manifest(), async level => { await gate.promise; return json([word(level)]) })
  const firstProgress: WordBankProgress[] = [], secondProgress: WordBankProgress[] = []
  const first = bank.ensureWordLevels([0, 1, 1], value => firstProgress.push(value))
  const second = bank.ensureWordLevels([1, 2], value => secondProgress.push(value))
  try {
    await vi.waitFor(() => expect(requests).toContain('/data/words/level-2.json'))
  } finally { gate.resolve() }
  const [firstPools, secondPools] = await Promise.all([first, second])
  expect(firstPools[1].map(item => item.id)).toEqual(['ecdict-1'])
  expect(secondPools[2].map(item => item.id)).toEqual(['ecdict-2'])
  expect(requests.filter(path => path.endsWith('manifest.json'))).toHaveLength(1)
  expect(requests.filter(path => path.endsWith('level-1.json'))).toHaveLength(1)
  expect(firstProgress.some(value => value.phase === 'import')).toBe(true)
  expect(secondProgress.some(value => value.phase === 'import')).toBe(true)
})

it('merges metadata from disjoint racing calls instead of overwriting loaded levels', async () => {
  serveShards()
  await Promise.all([bank.ensureWordLevels([0]), bank.ensureWordLevels([2])])
  expect((await db.wordBank.toArray()).map(item => item.id)).toEqual(['ecdict-0', 'ecdict-2'])
  expect((await db.wordBankMeta.get(1))?.loadedLevels).toEqual([0, 2])
})

it('uses real byte and batch progress when ensuring shards', async () => {
  const { response, length } = streamedResponse(words)
  serveShards(manifest([2001, 0, 0, 0, 0]), async () => response)
  const progress: WordBankProgress[] = []
  await bank.ensureWordLevels([0], value => progress.push(value))
  expect(progress.filter(value => value.phase === 'download').map(value => value.loaded)).toEqual([0, 100, length])
  expect(progress.filter(value => value.phase === 'import').map(value => value.loaded)).toEqual([0, 2000, 2001])
  expect(progress[progress.length - 1]).toEqual({ phase: 'ready', loaded: 2001, total: 2001 })
})

it('detaches cached callers before later downloads publish progress', async () => {
  serveShards()
  await bank.ensureWordLevels([0])
  const progress: WordBankProgress[] = []
  await bank.ensureWordLevels([0], value => progress.push(value))
  await bank.ensureWordLevels([2])
  expect(progress).toEqual([{ phase: 'ready', loaded: 1, total: 1 }])
})

it('retries a rejected download and clears fallback text after success, including cached success', async () => {
  await bank.ensureWordLevels([0])
  expect(bank.wordBankFallbackMessage()).not.toBe('')
  serveShards()
  expect((await bank.ensureWordLevels([0]))[0]).toHaveLength(1)
  expect(bank.wordBankFallbackMessage()).toBe('')
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
  await bank.ensureWordLevels([2])
  expect(bank.wordBankFallbackMessage()).not.toBe('')
  await bank.ensureWordLevels([0])
  expect(bank.wordBankFallbackMessage()).toBe('')
})

it('redownloads a level missing from IndexedDB despite persisted loadedLevels and an existing cache', async () => {
  await db.wordBank.put(word(0))
  await db.wordBankMeta.put({ ...storedMeta, loadedLevels: [0, 2] })
  const requests = serveShards()
  expect((await bank.ensureWordLevels([2]))[2].map(item => item.id)).toEqual(['ecdict-2'])
  await db.wordBank.delete('ecdict-2')
  expect((await bank.ensureWordLevels([2]))[2].map(item => item.id)).toEqual(['ecdict-2'])
  expect(requests.filter(path => path.endsWith('level-2.json'))).toHaveLength(2)
  expect((await db.wordBankMeta.get(1))?.loadedLevels).toEqual([0, 2])
})

it('recovers partially deleted shards rather than accepting the remaining records as complete', async () => {
  const shard = [word(0), word(0, { id: 'ecdict-second' })]
  const requests = serveShards(manifest([2, 0, 0, 0, 0]), async () => json(shard))
  await bank.ensureWordLevels([0])
  await db.wordBank.delete('ecdict-second')
  expect((await bank.ensureWordLevels([0]))[0].map(item => item.id)).toEqual(['ecdict-0', 'ecdict-second'])
  expect(requests.filter(path => path.endsWith('level-0.json'))).toHaveLength(2)
})

it('recovers partial shards using persisted counts after reloading the module', async () => {
  const shard = [word(0), word(0, { id: 'ecdict-second' })]
  const requests = serveShards(manifest([2, 0, 0, 0, 0]), async () => json(shard))
  await bank.ensureWordLevels([0])
  await db.wordBank.delete('ecdict-second')
  db.close()
  vi.resetModules()
  db = (await import('./db')).db
  bank = await import('./wordBank')
  await db.open()
  expect((await bank.ensureWordLevels([0]))[0]).toHaveLength(2)
  expect(requests.filter(path => path.endsWith('level-0.json'))).toHaveLength(2)
})

it('keeps progress subscribed when overlapping calls reuse the same observer', async () => {
  const gate = deferred()
  const requests = serveShards(manifest(), async level => {
    if (level === 2) await gate.promise
    return json([word(level)])
  })
  const progress: WordBankProgress[] = []
  const observer = (value: WordBankProgress) => progress.push(value)
  const first = bank.ensureWordLevels([0], observer)
  const second = bank.ensureWordLevels([0, 2], observer)
  try {
    await first
    await vi.waitFor(() => expect(requests).toContain('/data/words/level-2.json'))
    progress.length = 0
  } finally { gate.resolve() }
  await second
  expect(progress).toContainEqual({ phase: 'import', loaded: 1, total: 1 })
  expect(progress[progress.length - 1]).toEqual({ phase: 'ready', loaded: 2, total: 2 })
})

it('waits for sibling shards and persists successful ones when another shard fails, then retries only the failure', async () => {
  const gate = deferred()
  let fail = true
  const requests = serveShards(manifest(), async level => {
    if (level === 2 && fail) return new Response(null, { status: 503 })
    await gate.promise
    return json([word(level)])
  })
  const pending = bank.ensureWordLevels([0, 2])
  try { await vi.waitFor(() => expect(requests).toContain('/data/words/level-2.json')) }
  finally { gate.resolve() }
  const pools = await pending
  // Wait for any old, incorrectly detached write before asserting/cleaning up the DB.
  await vi.waitFor(async () => expect(await db.wordBank.get('ecdict-0')).toBeDefined())
  expect(pools[0].map(item => item.id)).toEqual(['ecdict-0'])
  expect((await db.wordBankMeta.get(1))?.loadedLevels).toEqual([0])
  expect(bank.wordBankFallbackMessage()).not.toBe('')
  fail = false
  const recovered = await bank.ensureWordLevels([0, 2])
  expect(recovered[2].map(item => item.id)).toEqual(['ecdict-2'])
  expect((await db.wordBankMeta.get(1))?.loadedLevels).toEqual([0, 2])
  expect(requests.filter(path => path.endsWith('level-0.json'))).toHaveLength(1)
  expect(requests.filter(path => path.endsWith('level-2.json'))).toHaveLength(2)
  expect(bank.wordBankFallbackMessage()).toBe('')
})

it.each([
  ['missing id', { ...word(0), id: undefined }],
  ['blank spelling', { ...word(0), word: ' ' }],
  ['non-string meaning', { ...word(0), meaning: 42 }],
  ['invalid level', { ...word(0), level: 9 }],
  ['invalid phonetic', { ...word(0), phonetic: [] }],
  ['invalid tags', { ...word(0), tags: 'cet4' }],
  ['invalid phrases', { ...word(0), phrases: [{ phrase: 'a phrase' }] }],
  ['invalid legacy aliases', { ...word(0), legacyIds: 'cet4-old' }],
  ['self alias', { ...word(0), legacyIds: ['ecdict-0'] }],
  ['unexpected source', { ...word(0), source: 'unknown' }],
])('rejects %s before mutating any stored data', async (_name, invalid) => {
  await seedLegacy()
  await expect(bank.importWordBankResponse(json([word(0, { id: 'ecdict-valid', legacyIds: ['cet4-old'] }), invalid]))).rejects.toThrow()
  await expectLegacyUnchanged()
})

it('validates the entire response before importing an earlier valid batch', async () => {
  await seedLegacy()
  await expect(bank.importWordBankResponse(json([...words, { ...word(0), id: 'bad', meaning: null }]))).rejects.toThrow()
  await expectLegacyUnchanged()
})

it.each([
  ['non-array payload', {}],
  ['unexpected empty shard', []],
  ['wrong level', [word(2)]],
  ['out-of-range level', [{ ...word(0), level: 9 }]],
  ['duplicate ids', [word(0), word(0)]],
  ['wrong record count', [word(0), word(0, { id: 'ecdict-extra' })]],
])('falls back on %s without removing legacy inventory or publishing loaded metadata', async (_name, shard) => {
  await seedLegacy()
  serveShards(manifest(), async () => json(shard))
  const pools = await bank.ensureWordLevels([0])
  expect(pools[0]).toEqual([])
  expect(bank.wordBankFallbackMessage()).not.toBe('')
  await expectLegacyUnchanged()
})

it.each([
  'https://other.example/level-0.json', '//other.example/level-0.json', '/level-0.json',
  '../level-0.json', 'nested/../../level-0.json', '%2e%2e/level-0.json', '..\\level-0.json',
])('rejects an unsafe manifest URL %s before fetching a shard', async url => {
  const requests = serveShards({ ...manifest(), urls: [url, 'level-1.json', 'level-2.json', 'level-3.json', 'level-4.json'] })
  await bank.ensureWordLevels([0])
  expect(requests).toEqual(['/data/words/manifest.json'])
  expect(await db.wordBank.count()).toBe(0)
  expect(await db.wordBankMeta.get(1)).toBeUndefined()
  expect(bank.wordBankFallbackMessage()).not.toBe('')
})

it.each([
  ['wrong version', { ...manifest(), version: 2 }],
  ['inconsistent total', { ...manifest(), total: 99 }],
  ['invalid counts', { ...manifest(), counts: [-1, 2, 2, 1, 1] }],
  ['missing URLs', { ...manifest(), urls: [] }],
])('rejects a manifest with %s without downloading shards', async (_name, invalid) => {
  const requests = serveShards(invalid)
  await bank.ensureWordLevels([0])
  expect(requests).toEqual(['/data/words/manifest.json'])
  expect(await db.wordBankMeta.get(1)).toBeUndefined()
})

it.each([
  ['HTTP failure', () => new Response(null, { status: 503 })],
  ['invalid JSON', () => new Response('[not json]')],
  ['interrupted stream', () => new Response(new ReadableStream({ start(controller) { controller.error(new Error('connection lost')) } }))],
])('preserves data after %s and retries the shard successfully', async (_name, failure) => {
  await seedLegacy()
  let failing = true
  const requests = serveShards(manifest(), async level => failing ? failure() : json([word(level, { legacyIds: ['cet4-old'] })]))
  await bank.ensureWordLevels([0])
  await expectLegacyUnchanged()
  expect(bank.wordBankFallbackMessage()).not.toBe('')
  failing = false
  expect((await bank.ensureWordLevels([0]))[0]).toHaveLength(1)
  expect(requests.filter(path => path.endsWith('level-0.json'))).toHaveLength(2)
  expect(bank.wordBankFallbackMessage()).toBe('')
})

it('accepts explicitly empty levels without claiming unrelated levels were loaded', async () => {
  const requests = serveShards(manifest([0, 0, 1, 0, 0]), async level => json(level === 2 ? [word(2)] : []))
  await bank.ensureWordLevels([0])
  await bank.ensureWordLevels([0])
  expect(requests.filter(path => path.endsWith('level-0.json'))).toHaveLength(1)
  expect((await db.wordBankMeta.get(1))?.loadedLevels).toEqual([0])
  expect(bank.wordBankFallbackMessage()).toBe('')
})

it('does not let progress observers abort storage or break other callers', async () => {
  serveShards()
  const progress: WordBankProgress[] = []
  const [first, second] = await Promise.all([
    bank.ensureWordLevels([0], () => { throw new Error('unmounted observer') }),
    bank.ensureWordLevels([0], value => progress.push(value)),
  ])
  expect(first[0]).toHaveLength(1)
  expect(second[0]).toHaveLength(1)
  expect(progress.some(value => value.phase === 'import')).toBe(true)
  expect(progress[progress.length - 1]).toEqual({ phase: 'ready', loaded: 1, total: 1 })
  expect(bank.wordBankFallbackMessage()).toBe('')
  await bank.importWordBankResponse(json([word(2)]), () => { throw new Error('observer failed') })
  expect(await db.wordBank.get('ecdict-2')).toBeDefined()
})

it('filters malformed persisted records from the offline fallback without rejecting', async () => {
  await db.wordBank.bulkPut([word(0), { ...word(2), level: 9 } as unknown as Word])
  const pools = await bank.ensureWordLevels([2])
  expect(pools[0].map(item => item.id)).toEqual(['ecdict-0'])
  expect(pools[2]).toEqual([])
  expect(bank.wordBankTotal()).toBe(1)
  expect(bank.wordBankFallbackMessage()).not.toBe('')
})

it('preserves the primary key of an existing legacy progress row when it already equals the ECDICT id', async () => {
  await seedLegacy()
  await db.userWords.delete('progress')
  await db.userWords.put({ ...legacyProgress, id: 'ecdict-0' })
  serveShards(manifest(), async level => json([word(level, { legacyIds: ['cet4-old'] })]))
  await bank.ensureWordLevels([0])
  expect(await db.userWords.toArray()).toEqual([{ ...legacyProgress, id: 'ecdict-0', wordId: 'ecdict-0' }])
})

it('keeps canonical progress when a legacy alias row already has the generated user key', async () => {
  await seedLegacy()
  await db.userWords.delete('progress')
  await db.userWords.put({ ...legacyProgress, id: 'user-ecdict-0' })
  serveShards(manifest(), async level => json([word(level, { legacyIds: ['cet4-old'] })]))
  await bank.ensureWordLevels([0])
  expect(await db.userWords.toArray()).toEqual([{ ...legacyProgress, id: 'user-ecdict-0', wordId: 'ecdict-0' }])
})

it('replaces stale records in a revalidated shard without touching other levels or study progress', async () => {
  await db.wordBank.bulkPut([word(0, { id: 'ecdict-stale' }), word(4)])
  const progress = { ...legacyProgress, wordId: 'ecdict-stale' }
  await db.userWords.put(progress)
  await db.wordBankMeta.put(storedMeta)
  const requests = serveShards()
  expect((await bank.ensureWordLevels([0]))[0].map(item => item.id)).toEqual(['ecdict-0'])
  expect(await db.wordBank.get('ecdict-stale')).toBeUndefined()
  expect(await db.wordBank.get('ecdict-4')).toEqual(word(4))
  expect(await db.userWords.toArray()).toEqual([progress])
  await bank.ensureWordLevels([0])
  expect(requests.filter(path => path.endsWith('level-0.json'))).toHaveLength(1)
})

it('rolls back earlier batches and migrated progress when a later batch cannot be written', async () => {
  await seedLegacy()
  const failLastBatch = (_key: unknown, value: Word) => {
    if (value.id === 'word-2000') throw new Error('disk full')
  }
  db.wordBank.hook('creating', failLastBatch)
  try {
    await expect(bank.importWordBankResponse(json([{ ...words[0], legacyIds: ['cet4-old'] }, ...words.slice(1)]))).rejects.toThrow('disk full')
  } finally { db.wordBank.hook('creating').unsubscribe(failLastBatch) }
  await expectLegacyUnchanged()
})

it('commits metadata with shard data and legacy migration atomically, and allows retry after failure', async () => {
  await seedLegacy()
  const failMetadata = () => { throw new Error('metadata write failed') }
  db.wordBankMeta.hook('updating', failMetadata)
  serveShards(manifest(), async level => json([word(level, { legacyIds: ['cet4-old'] })]))
  try { await bank.ensureWordLevels([0]) }
  finally { db.wordBankMeta.hook('updating').unsubscribe(failMetadata) }
  await expectLegacyUnchanged()
  expect(bank.wordBankFallbackMessage()).not.toBe('')
  await bank.ensureWordLevels([0])
  expect(await db.wordBank.get('cet4-old')).toBeUndefined()
  expect((await db.wordBankMeta.get(1))?.loadedLevels).toEqual([0, 4])
  expect(await db.userWords.toArray()).toEqual([{ ...legacyProgress, id: 'user-ecdict-0', wordId: 'ecdict-0' }])
  expect(bank.wordBankFallbackMessage()).toBe('')
})
