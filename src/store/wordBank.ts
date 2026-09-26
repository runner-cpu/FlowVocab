import { db } from './db'
import { WORDS } from '../data/words'
import type { Word, DifficultyLevel, WordBankProgress } from '../types'

/**
 * 词库服务：真实大纲词库（KyleBing english-vocabulary, CET4 7508 + CET6 5651）懒加载。
 * 首次访问 fetch public/data/words.json → 批量写入 IndexedDB（wordBank 表），
 * 之后直接从 IndexedDB 读取，离线可用。网络/加载失败时降级到内置示例词库。
 *
 * 许可证提示：KyleBing 仓库未明确标注许可证，数据仅用于学习/开发验证，
 * 正式上线前请替换为 ECDICT(MIT) 或自建词库。
 */
const IMPORT_VERSION = 2
const BATCH = 2000

let cache: Record<DifficultyLevel, Word[]> | null = null
let total = 0
let loading: Promise<Record<DifficultyLevel, Word[]>> | null = null
let fallbackMessage = ''
let latestProgress: WordBankProgress = { phase: 'download', loaded: 0, total: 0 }
const listeners = new Set<(progress: WordBankProgress) => void>()

function publish(progress: WordBankProgress) {
  latestProgress = progress
  listeners.forEach(listener => listener(progress))
}

export function wordBankFallbackMessage(): string { return fallbackMessage }

/** The same response reader serves network downloads and offline import files. */
export async function importWordBankResponse(response: Response, onProgress: (progress: WordBankProgress) => void = () => {}): Promise<void> {
  if (!response.ok) throw new Error(`词库下载失败: HTTP ${response.status}`)
  const length = Number(response.headers.get('content-length')) || 0
  onProgress({ phase: 'download', loaded: 0, total: length })
  let raw: Word[]
  if (length > 0 && response.body) {
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let text = ''
    let loaded = 0
    try {
      while (true) {
        const chunk = await reader.read()
        if (chunk.done) break
        text += decoder.decode(chunk.value, { stream: true })
        loaded += chunk.value.byteLength
        onProgress({ phase: 'download', loaded, total: length })
      }
      text += decoder.decode()
      raw = JSON.parse(text)
    } finally { reader.releaseLock() }
  } else {
    raw = await response.json()
  }
  if (!Array.isArray(raw) || !raw.length || raw.some(w => !w || typeof w.id !== 'string' || typeof w.word !== 'string' || typeof w.meaning !== 'string' || ![0, 1, 2, 3, 4].includes(w.level))) throw new Error('词库文件格式不正确')
  const words = raw.map(normalize)
  onProgress({ phase: 'import', loaded: 0, total: words.length })
  for (let i = 0; i < words.length; i += BATCH) {
    await db.wordBank.bulkPut(words.slice(i, i + BATCH))
    onProgress({ phase: 'import', loaded: Math.min(i + BATCH, words.length), total: words.length })
  }
  await db.wordBankMeta.put({ id: 1, version: IMPORT_VERSION, total: words.length, updatedAt: Date.now() })
}

function normalize(w: Word): Word {
  return {
    ...w,
    phonetic: w.phonetic ?? '',
    example: w.example ?? '',
    exampleCn: w.exampleCn ?? '',
    phrases: w.phrases ?? []
  }
}

function buildCache(words: Word[]): Record<DifficultyLevel, Word[]> {
  const c: Record<DifficultyLevel, Word[]> = { 0: [], 1: [], 2: [], 3: [], 4: [] }
  for (const w of words) c[w.level]?.push(w)
  return c
}

export async function ensureWordBank(onProgress?: (progress: WordBankProgress) => void): Promise<Record<DifficultyLevel, Word[]>> {
  if (cache) {
    onProgress?.({ phase: 'ready', loaded: total, total })
    return cache
  }
  if (onProgress) { listeners.add(onProgress); onProgress(latestProgress) }
  if (!loading) loading = (async () => {
    try {
      const meta = await db.wordBankMeta.get(1)
      if (!meta || meta.version !== IMPORT_VERSION || meta.total === 0) {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 20000)
        try {
          const res = await fetch('data/words.json', { signal: controller.signal })
          await importWordBankResponse(res, publish)
        } finally { clearTimeout(timeout) }
      }
      const all = await db.wordBank.toArray()
      if (!all.length) throw new Error('离线词库为空')
      cache = buildCache(all)
      total = all.length
    } catch {
      const saved = await db.wordBank.toArray().catch(() => [])
      const fallback = saved.length ? saved : WORDS
      cache = buildCache(fallback)
      total = fallback.length
      fallbackMessage = saved.length ? '完整词库暂不可用，已使用本机保存的词汇继续航行。' : '完整词库下载或导入失败，已启用内置离线词库；学习进度仍会保存在本机。'
    }
    publish({ phase: 'ready', loaded: total, total })
    return cache
  })()
  try { return await loading } finally { if (onProgress) listeners.delete(onProgress) }
}

export function wordBankTotal(): number {
  return total
}

export function getWordPool(level: DifficultyLevel): Word[] {
  return cache?.[level] ?? []
}

/** 四选一干扰项：从词池随机取 3 个不同释义，与正确释义打乱 */
export function buildVocabOptions(correct: Word, pool: Word[]): { text: string; correct: boolean }[] {
  const used = new Set<string>([correct.meaning])
  const distractors: string[] = []
  // 优先取同 level，不够再跨档
  const candidates = [...pool].sort(() => Math.random() - 0.5)
  for (const w of candidates) {
    if (distractors.length >= 3) break
    if (w.id === correct.id || !w.meaning) continue
    if (used.has(w.meaning)) continue
    used.add(w.meaning)
    distractors.push(w.meaning)
  }
  const arr = [correct.meaning, ...distractors]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.map((t) => ({ text: t, correct: t === correct.meaning }))
}
