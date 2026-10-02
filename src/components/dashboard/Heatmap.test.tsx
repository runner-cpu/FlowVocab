import { describe, expect, it } from 'vitest'
import { buildHeatmapData } from './Heatmap'

describe('heatmap range construction', () => {
  it('returns exactly the requested number of local calendar days ending today', () => {
    const today = new Date(2026, 9, 2, 23, 45)
    const values = buildHeatmapData([
      { date: '2026-09-30', xp: 7 } as never,
      { date: '2026-10-01', xp: 11 } as never,
      { date: '2026-10-02', xp: 13 } as never
    ], 3, 100, today)

    expect(values.values).toEqual([7, 11, 13])
    expect(values.values).toHaveLength(3)
  })

  it('does not include the previous day when the request is one day', () => {
    const today = new Date(2026, 9, 2, 0, 5)
    const values = buildHeatmapData([
      { date: '2026-10-01', xp: 99 } as never,
      { date: '2026-10-02', xp: 3 } as never
    ], 1, 100, today)

    expect(values.values).toEqual([3])
  })
})
