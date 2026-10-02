import { expect, test } from 'vitest'
import { buildHeatmapData } from './Heatmap'

test('keeps raw XP values and floors heatmap scale at the daily goal', () => {
  const today = new Date(2026, 8, 27)
  const dates = [0, 1, 2, 3].map((offset) => { const date = new Date(today); date.setDate(today.getDate() - 3 + offset); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` })
  const result = buildHeatmapData(dates.map((date, index) => ({ date, xp: [0, 20, 80, 140][index], energy: 0, comboMax: 0, modules: { vocab: 0, grammar: 0, sentence: 0, listening: 0, writing: 0, reading: 0 } })), 3, 100, today)
  expect(result.values).toEqual([20, 80, 140])
  expect(result.max).toBeGreaterThanOrEqual(100)
})
