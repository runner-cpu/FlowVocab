// 遗忘曲线调度（SM-2 简化版）：间隔数组
export const INTERVALS_DAYS = [1, 3, 7, 15, 30]

export function qualityOf(correct: boolean, timeMs: number, medianMs: number): 0 | 1 | 2 {
  if (!correct) return 0
  if (timeMs < medianMs) return 2
  return 1
}

export function nextInterval(prevInterval: number, quality: 0 | 1 | 2): number {
  if (quality === 0) return INTERVALS_DAYS[0]
  const idx = Math.min(Math.max(quality, 1), 2)
  // 从 1/3/7 起步，之后按 2 倍增长
  if (prevInterval <= 0) return INTERVALS_DAYS[idx]
  return Math.min(prevInterval * 2, 30)
}

export function nextStatus(
  status: string,
  quality: 0 | 1 | 2,
  successfulReviews: number
): 'new' | 'learning' | 'mastered' {
  if (quality >= 1) {
    return successfulReviews >= 3 ? 'mastered' : 'learning'
  }
  return status === 'new' ? 'new' : 'learning'
}

export function updateReviewProgress(
  status: string,
  quality: 0 | 1 | 2,
  successfulReviews: number
): { status: 'new' | 'learning' | 'mastered'; successfulReviews: number } {
  const nextSuccessfulReviews = quality >= 1 ? successfulReviews + 1 : 0
  return {
    status: nextStatus(status, quality, nextSuccessfulReviews),
    successfulReviews: nextSuccessfulReviews
  }
}

export function normalizeSuccessfulReviews(status: string, value: number | undefined): number {
  const successfulReviews = value ?? 0
  return status === 'mastered' ? Math.max(successfulReviews, 3) : successfulReviews
}

export function dayKey(ts: number): string {
  const d = new Date(ts)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}
