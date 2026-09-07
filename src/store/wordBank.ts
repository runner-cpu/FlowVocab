import { db } from './db'
import { WORDS } from '../data/words'
import type { Word, DifficultyLevel } from '../types'

/**
 * 词库服务：真实大纲词库（KyleBing english-vocabulary, CET4 7508 + CET6 5651）懒加载。
 * 首次访问 fetch public/data/words.json → 批量写入 IndexedDB（wordBank 表），
 * 之后直接从 IndexedDB 读取，离线可用。网络/加载失败时降级到内置示例词库。
 *
 * 许可证提示：KyleBing 仓库未明确标注许可证，数据仅用于学习/开发验证，
 * 正式上线前请替换为 ECDICT(MIT) 或自建词库。
 */
const IMPORT_VERSION = 1
const BATCH = 2000

let cache: Record<DifficultyLevel, Word[]> | null = null
let total = 0
let loading: Promise<Record<DifficultyLevel, Word[]>> | null = null

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

export async function ensureWordBank(): Promise<Record<DifficultyLevel, Word[]>> {
  if (cache) return cache
  if (loading) return loading
  loading = (async () => {
    try {
      const meta = await db.wordBankMeta.get(1)
      if (!meta || meta.version !== IMPORT_VERSION || meta.total === 0) {
        const res = await fetch('data/words.json')
        if (!res.ok) throw new Error(`词库加载失败: HTTP ${res.status}`)
        const raw = (await res.json()) as Word[]
        const norm = raw.map(normalize)
        await db.wordBank.clear()
        for (let i = 0; i < norm.length; i += BATCH) {
          await db.wordBank.bulkPut(norm.slice(i, i + BATCH))
        }
        await db.wordBankMeta.put({ id: 1, version: IMPORT_VERSION, total: norm.length, updatedAt: Date.now() })
        total = norm.length
      } else {
        total = meta.total
      }
      const all = await db.wordBank.toArray()
      cache = buildCache(all)
    } catch (e) {
      console.warn('词库加载失败，降级到内置示例词库', e)
      cache = buildCache(WORDS)
      total = WORDS.length
    }
    return cache
  })()
  return loading
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
