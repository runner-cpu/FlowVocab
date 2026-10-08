/**
 * ECDICT 的释义里含字面量 `\n` 转义序列（不是真实换行），直接渲染会出现
 * “n. 网, ...\na. 净的...” 这样的乱码。这里统一在展示边界做一次规整：
 * - 字面量 \n / \r\n / 真实换行 / 制表符 → 中文分号
 * - 连续分隔符去重、首尾空白清理
 * 只影响展示文本，不回写词库。
 */
export function formatMeaning(meaning: string | undefined | null): string {
  if (!meaning) return ''
  const normalized = meaning
    .replace(/\r\n/g, '\n')
    .replace(/\\r\\n|\\n|\\r/g, '\n')
    .replace(/[\t\n]+/g, '\n')
  return normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('；')
    .replace(/；{2,}/g, '；')
    .replace(/^；|；$/g, '')
    .trim()
}

/** 同一释义在规整后是否等价，用于干扰项去重。 */
export function sameMeaning(left: string | undefined, right: string | undefined): boolean {
  return formatMeaning(left) === formatMeaning(right)
}
