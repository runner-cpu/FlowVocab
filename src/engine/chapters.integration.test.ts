import { describe, expect, it } from 'vitest'
import { CHAPTERS, chapterView, currentChapterOrder } from '../engine/chapters'
import { isModuleAvailable } from '../data/curriculum'

describe('chapter map wiring', () => {
  it('covers all six training modules exactly once', () => {
    expect(CHAPTERS.map((chapter) => chapter.module)).toEqual(['vocab', 'grammar', 'sentence', 'listening', 'writing', 'reading'])
    expect(new Set(CHAPTERS.map((chapter) => chapter.id)).size).toBe(CHAPTERS.length)
    expect(CHAPTERS.map((chapter) => chapter.sceneIndex)).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('keeps the first chapter playable on every learning track', () => {
    for (const track of ['primary', 'middle-high', 'advanced', 'cet'] as const) {
      const views = chapterView(CHAPTERS, {}, (module) => isModuleAvailable(track, module))
      expect(views[0], track).toMatchObject({ status: 'current', available: true })
    }
  })

  it('reports a monotonically increasing order for the current chapter', () => {
    const empty = chapterView(CHAPTERS, {}, () => true)
    expect(currentChapterOrder(empty)).toBe(1)
    const partial = chapterView(CHAPTERS, { harbour: 3, garden: 2 }, () => true)
    expect(currentChapterOrder(partial)).toBe(3)
  })
})
