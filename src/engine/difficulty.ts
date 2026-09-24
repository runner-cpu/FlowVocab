import type { DifficultyLevel, FeedbackEvent } from '../types'

export const MAX_LEVEL = 4
export const WINDOW_SIZE = 10

export const DIFFICULTY_COLORS = ['#52C41A', '#3B82F6', '#9334E6', '#F4B400', '#EA4335']
export const DIFFICULTY_NAMES = ['四级核心', '四级高频', '六级', '六级高频', '考研超纲']

export interface DifficultyState {
  level: DifficultyLevel
  window: Array<{ correct: boolean; slow: boolean }>
  step: number // 累计题数
}

export function createDifficultyState(): DifficultyState {
  return { level: 0, window: [], step: 0 }
}

/**
 * 动态难度阀门：滑动窗口最近10题，>85% 升档，<60% 或超慢过多 降档。
 */
export function updateDifficulty(
  prev: DifficultyState,
  correct: boolean,
  timeMs: number,
  medianMs: number
): { state: DifficultyState; feedback: FeedbackEvent | null } {
  const slow = timeMs > medianMs * 1.4
  const window = [...prev.window, { correct, slow }].slice(-WINDOW_SIZE)
  const step = prev.step + 1

  let level: DifficultyLevel = prev.level
  let feedback: FeedbackEvent | null = null

  if (window.length >= WINDOW_SIZE) {
    const acc = window.filter((sample) => sample.correct).length / WINDOW_SIZE
    const slowRatio = window.filter((sample) => sample.slow).length / WINDOW_SIZE
    if (acc > 0.85 && slowRatio < 0.4 && level < MAX_LEVEL) {
      level = (level + 1) as DifficultyLevel
      feedback = { type: 'levelup', combo: 0, isCritical: false, rageActive: false, message: '🚀 挑战升级！' }
    } else if ((acc < 0.6 || slowRatio > 0.6) && level > 0) {
      level = (level - 1) as DifficultyLevel
      feedback = { type: 'leveldown', combo: 0, isCritical: false, rageActive: false, message: '🌿 帮你稳一稳' }
    }
  }

  return { state: { level, window, step }, feedback }
}
