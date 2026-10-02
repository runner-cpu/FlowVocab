import { describe, expect, it } from 'vitest'
import { moduleForRadarLabel, RADAR_LABELS } from './RadarChart'

describe('radar dimension navigation', () => {
  it('maps every displayed dimension to its learning module', () => {
    expect(RADAR_LABELS.map(moduleForRadarLabel)).toEqual(['vocab', 'grammar', 'sentence', 'listening', 'writing', 'reading'])
  })

  it('ignores chart labels that are not dimensions', () => {
    expect(moduleForRadarLabel('unknown')).toBeNull()
  })
})
