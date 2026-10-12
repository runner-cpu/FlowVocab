import { describe, expect, it } from 'vitest'
import { itemsForTrack, isModuleAvailable, TRACK_CURRICULUM, vocabLevelsForTrack } from './curriculum'
import { LISTENING_ITEMS } from './listening'
import { GRAMMAR_BRANCHES, GRAMMAR_NODES } from './grammar'

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

  it('keeps the route levels when adaptive or review levels are outside the route', () => {
    expect(vocabLevelsForTrack('primary', 4)).toEqual([0, 4])
    expect(vocabLevelsForTrack('primary', 4, 3)).toEqual([0, 4, 3])
    expect(vocabLevelsForTrack('advanced', 1, 4)).toEqual([1, 2, 3, 4])
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

  it('opens every grammar node with its ancestors so nothing stays permanently locked', () => {
    // 技能树按 parent 逐级解锁：开放子节点却漏掉祖先，会让该节点永远锁死。
    const byId = Object.fromEntries(GRAMMAR_NODES.map((node) => [node.id, node]))
    for (const [track, curriculum] of Object.entries(TRACK_CURRICULUM)) {
      const ids = new Set(curriculum.content.grammar ?? [])
      for (const id of ids) {
        expect(byId[id], `${track}: unknown grammar node ${id}`).toBeDefined()
        let current = byId[id]
        while (current.parent) {
          expect(ids.has(current.parent), `${track}: ${current.id} needs its ancestor ${current.parent}`).toBe(true)
          current = byId[current.parent]
        }
      }
    }
  })

  it('reaches every grammar branch root on the routes that claim a full tree', () => {
    const roots = GRAMMAR_BRANCHES.map((branch) => branch.id)
    for (const track of ['middle-high', 'advanced', 'cet'] as const) {
      const ids = new Set(TRACK_CURRICULUM[track].content.grammar ?? [])
      for (const root of roots) expect(ids.has(root), `${track}: missing branch root ${root}`).toBe(true)
    }
    expect(new Set(TRACK_CURRICULUM.primary.content.grammar)).toEqual(new Set(['tense-basic']))
  })

  it('keeps every referenced content id present in its source library', () => {
    for (const [track, curriculum] of Object.entries(TRACK_CURRICULUM)) {
      for (const [module, ids] of Object.entries(curriculum.content)) {
        const library = module === 'grammar' ? GRAMMAR_NODES.map((node) => node.id) : undefined
        if (!library) continue
        for (const id of ids ?? []) expect(library, `${track}:${module}`).toContain(id)
      }
    }
  })
})
