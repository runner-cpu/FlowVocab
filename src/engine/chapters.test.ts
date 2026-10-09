import { describe, expect, it } from 'vitest'
import {
  CHAPTERS,
  MAX_STARS,
  applyChapterResult,
  chapterView,
  convertStardustToEnergy,
  currentChapterOrder,
  nextChapterId,
  starsForResult,
  stardustForStars,
  totalStardust
} from './chapters'
import type { ModuleKey } from '../types'

const allModules = () => true
const primaryModules = (module: ModuleKey) => module !== 'sentence' && module !== 'writing'

describe('chapter stars and stardust', () => {
  it('maps accuracy to the documented star thresholds', () => {
    expect(starsForResult(10, 10)).toBe(3)
    expect(starsForResult(10, 9)).toBe(3)
    expect(starsForResult(10, 7)).toBe(2)
    expect(starsForResult(10, 4)).toBe(1)
    expect(starsForResult(10, 3)).toBe(0)
  })

  it('requires at least two answers for three stars and rewards a long combo', () => {
    // 两道全对可以拿 3 星（小学路线的听力/写作只有两题），但一题全对只能 2 星。
    expect(starsForResult(2, 2)).toBe(3)
    expect(starsForResult(1, 1)).toBe(2)
    expect(starsForResult(3, 3)).toBe(3)
    // 高正确率 + 本轮连击 ≥5 也可拿 3 星。
    expect(starsForResult(10, 8, 6)).toBe(3)
    expect(starsForResult(10, 8, 2)).toBe(2)
    expect(starsForResult(10, 7, 9)).toBe(2)
  })

  it('never awards stars for an empty or invalid round', () => {
    expect(starsForResult(0, 0)).toBe(0)
    expect(starsForResult(Number.NaN, 3)).toBe(0)
    expect(starsForResult(-5, 2)).toBe(0)
  })

  it('pays stardust per star and clamps out-of-range input', () => {
    expect(stardustForStars(0)).toBe(0)
    expect(stardustForStars(1)).toBe(10)
    expect(stardustForStars(2)).toBe(20)
    expect(stardustForStars(3)).toBe(30)
    expect(stardustForStars(9)).toBe(30)
    expect(stardustForStars(-2)).toBe(0)
    expect(stardustForStars(Number.NaN)).toBe(0)
  })

  it('sums stardust across cleared chapters only', () => {
    expect(totalStardust({ harbour: 3, garden: 1, bridge: 0 })).toBe(40)
    expect(totalStardust({})).toBe(0)
  })

  it('converts stardust into planet energy in fixed batches', () => {
    expect(convertStardustToEnergy(0)).toEqual({ spent: 0, energy: 0, remaining: 0 })
    expect(convertStardustToEnergy(19)).toEqual({ spent: 0, energy: 0, remaining: 19 })
    expect(convertStardustToEnergy(20)).toEqual({ spent: 20, energy: 50, remaining: 0 })
    expect(convertStardustToEnergy(95)).toEqual({ spent: 80, energy: 200, remaining: 15 })
    expect(convertStardustToEnergy(Number.NaN)).toEqual({ spent: 0, energy: 0, remaining: 0 })
  })
})

describe('chapter unlocking', () => {
  it('starts with the first chapter current and the rest locked', () => {
    const views = chapterView(CHAPTERS, {}, allModules)
    expect(views[0]).toMatchObject({ status: 'current', stars: 0, order: 1 })
    expect(views[1]).toMatchObject({ status: 'locked', prerequisite: CHAPTERS[0].place })
    expect(views.map((view) => view.available)).toEqual([true, true, true, true, true, true])
  })

  it('opens the next chapter only after the previous one has stars', () => {
    const oneStar = chapterView(CHAPTERS, { harbour: 1 }, allModules)
    expect(oneStar[0].status).toBe('cleared')
    expect(oneStar[1].status).toBe('current')
    expect(oneStar[2].status).toBe('locked')
  })

  it('locks unavailable chapters and keeps the first uncleared chapter current', () => {
    const views = chapterView(CHAPTERS.slice(0, 4), { harbour: 3 }, primaryModules)
    expect(views[1]).toMatchObject({ available: true, status: 'current' })
    expect(views[2]).toMatchObject({ available: false, status: 'locked' })
    expect(views[3]).toMatchObject({ available: true, status: 'locked' })
    expect(currentChapterOrder(views)).toBe(2)
  })

  it('replaces the prerequisite with the last available chapter', () => {
    const views = chapterView(CHAPTERS.slice(0, 4), {}, primaryModules)
    expect(views[3].prerequisite).toBe(CHAPTERS[1].place)
  })

  it('finds the next playable chapter and stops at the end', () => {
    const start = chapterView(CHAPTERS, { harbour: 3 }, allModules)
    expect(nextChapterId(start, 'harbour')).toBe('garden')
    const finished = chapterView(CHAPTERS, Object.fromEntries(CHAPTERS.map((chapter) => [chapter.id, 3])), allModules)
    expect(nextChapterId(finished, 'library')).toBeNull()
    expect(nextChapterId(finished, 'missing')).toBeNull()
  })
})

describe('chapter results', () => {
  it('records a better result and pays only the difference in stardust', () => {
    const first = applyChapterResult({}, 'harbour', 2)
    expect(first).toMatchObject({ improved: true, stardustGained: 20, stars: { harbour: 2 } })
    const better = applyChapterResult(first.stars, 'harbour', 3)
    expect(better).toMatchObject({ improved: true, stardustGained: 10, stars: { harbour: 3 } })
  })

  it('keeps the best result when a replay is worse or equal', () => {
    const stored = { harbour: 3 }
    expect(applyChapterResult(stored, 'harbour', 1)).toEqual({ stars: stored, improved: false, stardustGained: 0 })
    expect(applyChapterResult(stored, 'harbour', 3)).toEqual({ stars: stored, improved: false, stardustGained: 0 })
  })

  it('clamps invalid improvement input instead of throwing', () => {
    expect(applyChapterResult({}, 'harbour', 99).stars.harbour).toBe(MAX_STARS)
    expect(applyChapterResult({}, 'harbour', Number.NaN).improved).toBe(false)
  })
})
