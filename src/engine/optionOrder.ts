/**
 * 选项顺序引擎（纯函数）。
 *
 * 静态内容里的正确选项长期停在第一个位置：句子译文 4 题、听写填空 8 题全在位置 1，
 * 阅读一半题目也在位置 1。学习者只要记住位置就能连对，测到的是位置记忆，不是语言判断。
 *
 * 这里按「题目种子」把选项重排：种子固定则顺序固定（重渲染、刷新、备份恢复都不会跳），
 * 但正确选项的位置由种子决定，跨题均匀分布。乱序只改变展示次序，选项文本与判定完全不变。
 */

/** FNV-1a 32 位哈希 + 雪崩收尾：把题目 id 变成稳定种子。 */
function hashSeed(seed: string): number {
  let hash = 2166136261
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  // FNV-1a 的低位与末字符高度相关：种子多以 #0/#1 或节点名结尾时，
  // 直接 hash % 4 会把正确项重新堆到同一位置。这里补一轮雪崩，让低位也用上全串信息。
  hash ^= hash >>> 16
  hash = Math.imul(hash, 0x7feb352d)
  hash ^= hash >>> 15
  hash = Math.imul(hash, 0x846ca68b)
  hash ^= hash >>> 16
  return hash >>> 0
}

/** mulberry32：同一种子产出同一序列，不依赖 Math.random。 */
function nextRandom(state: { value: number }): number {
  state.value = (state.value + 0x6d2b79f5) >>> 0
  let t = state.value
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/**
 * 返回原始下标在展示顺序中的排列。
 * 正确选项被放到 `hashSeed(seed) % 数量` 处，其余选项按种子洗牌填充剩余位置。
 */
export function optionOrder(count: number, correctIndex: number, seed: string): number[] {
  const indexes = Array.from({ length: Math.max(0, count) }, (_, index) => index)
  if (indexes.length < 2) return indexes
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= indexes.length) return indexes
  const hash = hashSeed(seed)
  const target = hash % indexes.length
  const rest = indexes.filter((index) => index !== correctIndex)
  const random = { value: hash }
  for (let i = rest.length - 1; i > 0; i -= 1) {
    const j = Math.floor(nextRandom(random) * (i + 1))
    ;[rest[i], rest[j]] = [rest[j], rest[i]]
  }
  const result: number[] = []
  let cursor = 0
  for (let position = 0; position < indexes.length; position += 1) {
    if (position === target) result.push(correctIndex)
    else result.push(rest[cursor++])
  }
  return result
}

export interface DisplayOption {
  text: string
  correct: boolean
  /** 在原始选项数组中的下标，用来把点击/键盘选择映射回判定逻辑。 */
  sourceIndex: number
}

/** 把「文本数组 + 正确下标」转成可直接渲染的展示顺序。 */
export function displayOptions(options: readonly string[], correctIndex: number, seed: string): DisplayOption[] {
  return optionOrder(options.length, correctIndex, seed).map((index) => ({ text: options[index], correct: index === correctIndex, sourceIndex: index }))
}

/** 展示顺序里正确选项的位置；找不到时返回 -1。 */
export function correctPosition(options: readonly DisplayOption[]): number {
  return options.findIndex((option) => option.correct)
}
