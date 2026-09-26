import { describe, expect, test } from 'vitest'
import { heatmapScale, levelFromXp, planetLevelFromEnergy, vocabMasteryScore } from './progression'
import { ACTIVE_VOCAB_TARGET } from './progression'

describe('progression display helpers', () => {
  test('maps XP through the approved cumulative threshold table', () => {
    expect(levelFromXp(0)).toBe(0)
    expect(levelFromXp(499)).toBe(0)
    expect(levelFromXp(500)).toBe(1)
    expect(levelFromXp(1499)).toBe(1)
    expect(levelFromXp(1500)).toBe(2)
    expect(levelFromXp(26400)).toBe(9)
    expect(levelFromXp(999999)).toBe(9)
  })

  test('maps energy into ten 250-energy planet levels', () => {
    expect(planetLevelFromEnergy(0)).toBe(0)
    expect(planetLevelFromEnergy(249)).toBe(0)
    expect(planetLevelFromEnergy(250)).toBe(1)
    expect(planetLevelFromEnergy(5000)).toBe(10)
    expect(planetLevelFromEnergy(5250)).toBe(10)
  })

  test('shows reviewed words as partial progress toward the active target', () => {
    expect(vocabMasteryScore(0, 120, 600)).toBe(5)
    expect(vocabMasteryScore(600, 0, 600)).toBe(100)
    expect(vocabMasteryScore(700, 400, 600)).toBe(100)
  })

  test('uses the 80th non-zero percentile or the daily goal for heatmap scale', () => {
    expect(heatmapScale([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5)).toBe(8)
    expect(heatmapScale([0, 1, 2], 10)).toBe(10)
    expect(heatmapScale([0, 0], 10)).toBe(10)
  })

  test('keeps the active vocabulary target independent of a physical bank size', () => {
    expect(vocabMasteryScore(12, 24, ACTIVE_VOCAB_TARGET)).toBe(3)
  })
})
