import type { FeedbackEvent } from '../types'

export interface AnswerInput {
  correct: boolean
  timeMs: number
  medianMs: number
}

export interface ComboState {
  combo: number
  maxCombo: number
  rageActive: boolean
  rageRemaining: number
}

export interface ComboResult {
  state: ComboState
  feedback: FeedbackEvent
  xp: number
  energy: number
}

export const RAGE_COMBO = 5
export const RAGE_CHARGES = 3 // 怒气激活后接下来 3 次作答双倍经验（消除倒计时焦虑）
export const COMBO_TITLE_THRESHOLD = 10

export function createComboState(): ComboState {
  return { combo: 0, maxCombo: 0, rageActive: false, rageRemaining: 0 }
}

/**
 * 连击 / 暴击 / 怒气引擎：每次作答调用一次，返回新状态、反馈事件与产出。
 *
 * 怒气机制（v4）：5 连击触发「怒气」，接下来的 3 次作答获得双倍经验；
 * 每次正确作答消耗 1 次，答错则怒气结束。不采用倒计时，避免「时间焦虑」。
 */
export function evaluateAnswer(input: AnswerInput, prev: ComboState): ComboResult {
  const rageActive = prev.rageRemaining > 0

  const next: ComboState = { ...prev, rageActive }
  let feedback: FeedbackEvent
  let xp = 0
  let energy = 0

  if (input.correct) {
    next.combo += 1
    next.maxCombo = Math.max(next.maxCombo, next.combo)
    const isCritical = input.timeMs < input.medianMs * 0.7
    // 怒气触发（攒满 5 连击）：触发后连击归零，重新开始攒下一次怒气
    if (!rageActive && next.combo >= RAGE_COMBO) {
      const triggerCombo = next.combo
      next.combo = 0
      next.rageActive = true
      next.rageRemaining = RAGE_CHARGES
      feedback = { type: 'rage', combo: triggerCombo, isCritical, rageActive: true, message: `🔥 怒气爆发 · 接下来 ${RAGE_CHARGES} 次作答双倍经验！` }
    } else {
      // 处于怒气中：正确作答消耗 1 次
      if (rageActive) next.rageRemaining = Math.max(0, prev.rageRemaining - 1)
      next.rageActive = next.rageRemaining > 0
      if (next.combo >= COMBO_TITLE_THRESHOLD) {
        feedback = { type: 'combo', combo: next.combo, isCritical, rageActive: next.rageActive, message: `🔥 连击 ${next.combo}！` }
      } else if (isCritical) {
        feedback = { type: 'critical', combo: next.combo, isCritical, rageActive: next.rageActive, message: '⚡ 暴击！' }
      } else {
        feedback = { type: 'hit', combo: next.combo, isCritical, rageActive: next.rageActive }
      }
    }
    const base = 10
    xp = Math.round(base * (next.rageActive ? 2 : 1) * (isCritical ? 2 : 1))
    energy = Math.round((1 + next.combo * 0.2) * 10) / 10
  } else {
    next.combo = 0
    next.rageActive = false
    next.rageRemaining = 0
    feedback = { type: 'miss', combo: 0, isCritical: false, rageActive: false, message: '错题已收入错题本' }
    xp = 2
    energy = 0
  }

  return { state: next, feedback, xp, energy }
}
