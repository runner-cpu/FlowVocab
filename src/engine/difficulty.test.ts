import { describe, expect, test } from 'vitest'
import { createDifficultyState, updateDifficulty } from './difficulty'

describe('updateDifficulty', () => {
  test('forgets expired slow answers so ten fast correct answers can level up', () => {
    let state = createDifficultyState()

    for (let index = 0; index < 10; index += 1) {
      state = updateDifficulty(state, true, 1500, 1000).state
    }
    for (let index = 0; index < 10; index += 1) {
      state = updateDifficulty(state, true, 900, 1000).state
    }

    expect(state.window).toHaveLength(10)
    expect(state.window.filter((sample) => sample.slow)).toHaveLength(0)
    expect(state.level).toBeGreaterThan(0)
  })

  test('retains exactly ten samples after more than ten answers', () => {
    let state = createDifficultyState()

    for (let index = 0; index < 11; index += 1) {
      state = updateDifficulty(state, true, 900, 1000).state
    }

    expect(state.window).toHaveLength(10)
  })
})
