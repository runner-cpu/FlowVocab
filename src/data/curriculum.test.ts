import { describe, expect, it } from 'vitest'
import { itemsForTrack, isModuleAvailable, TRACK_CURRICULUM } from './curriculum'
import { LISTENING_ITEMS } from './listening'

describe('track curriculum', () => {
  it('locks primary sentence and writing while keeping its core modules available', () => {
    expect(isModuleAvailable('primary', 'vocab')).toBe(true)
    expect(isModuleAvailable('primary', 'grammar')).toBe(true)
    expect(isModuleAvailable('primary', 'listening')).toBe(true)
    expect(isModuleAvailable('primary', 'reading')).toBe(true)
    expect(isModuleAvailable('primary', 'sentence')).toBe(false)
    expect(isModuleAvailable('primary', 'writing')).toBe(false)
  })

  it('makes every module available to CET and assigns different vocabulary levels to each track', () => {
    expect(Object.values(TRACK_CURRICULUM.cet.modules).every(Boolean)).toBe(true)
    expect(new Set(Object.values(TRACK_CURRICULUM).map(track => track.levels.join(','))).size).toBe(4)
  })

  it('filters listening content differently for primary and CET', () => {
    expect(itemsForTrack('primary', 'listening', LISTENING_ITEMS).map(item => item.id)).not.toEqual(
      itemsForTrack('cet', 'listening', LISTENING_ITEMS).map(item => item.id)
    )
  })
  it('defines a non-listening content subset for each available module', () => {
    for (const track of Object.values(TRACK_CURRICULUM)) for (const module of ['grammar', 'sentence', 'writing', 'reading'] as const) {
      if (track.modules[module]) expect(track.content[module]?.length).toBeGreaterThan(0)
    }
  })
})
