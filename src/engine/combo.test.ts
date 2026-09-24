import { describe, expect, it } from 'vitest'
import { createComboState, evaluateAnswer } from './combo'

const correct = { correct: true, timeMs: 4000, medianMs: 4000 }
function answers(count: number) {
  let state = createComboState()
  const results = []
  for (let i = 0; i < count; i++) {
    const result = evaluateAnswer(correct, state)
    results.push(result)
    state = result.state
  }
  return results
}
describe('continuous combo with separate rage charges', () => {
  it('keeps combo 5 when triggering three charges', () => {
    const fifth = answers(5)[4]
    expect(fifth.state).toEqual({ combo: 5, maxCombo: 5, rageActive: true, rageRemaining: 3 })
    expect(fifth.feedback.type).toBe('rage')
    expect(fifth.xp).toBe(10)
  })
  it('continues to combo 8 and doubles exactly the next three answers', () => {
    const results = answers(9)
    expect(results.slice(5, 9).map(r => r.xp)).toEqual([20, 20, 20, 10])
    expect(results[7].state).toEqual({ combo: 8, maxCombo: 8, rageActive: false, rageRemaining: 0 })
    expect(results[8].state.rageActive).toBe(false)
  })
  it('recharges at 10, 15 and 20 without resetting the continuous combo', () => {
    const results = answers(20)
    expect(results.filter(r => r.feedback.type === 'rage').map(r => r.state.combo)).toEqual([5, 10, 15, 20])
    expect(results[19].state.maxCombo).toBe(20)
    expect(results[9].state.rageRemaining).toBe(3)
  })
  it('resets combo and rage on an error while preserving the record', () => {
    const result = evaluateAnswer({ ...correct, correct: false }, answers(6)[5].state)
    expect(result.state).toEqual({ combo: 0, maxCombo: 6, rageActive: false, rageRemaining: 0 })
    expect(result.xp).toBe(2)
    expect(result.energy).toBe(0)
  })
})
