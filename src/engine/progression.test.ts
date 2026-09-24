import { describe, expect, test } from 'vitest'
import { heatmapScale, levelFromXp, planetLevelFromEnergy, vocabMasteryScore } from './progression'

describe('progression display helpers', () => {
  test('maps XP into 100-point levels', () => {
    expect(levelFromXp(0)).toBe(0)
    expect(levelFromXp(99)).toBe(0)
    expect(levelFromXp(100)).toBe(1)
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
})
