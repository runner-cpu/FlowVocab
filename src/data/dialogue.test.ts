import { describe, expect, it } from 'vitest'
import { DIALOGUE_RULES, DIALOGUE_SCENES } from './dialogue'

/** 局部编辑距离：数据不变量自检用，避免依赖引擎实现。 */
function distance(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index)
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i]
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      current.push(Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost))
    }
    previous.splice(0, previous.length, ...current)
  }
  return previous[b.length]
}

const normalize = (word: string) => word.toLowerCase().replace(/[^a-z0-9']/g, '')
const tokensOf = (sentence: string) => sentence.split(/[^a-zA-Z0-9']+/).map(normalize).filter(Boolean)

describe('dialogue scene content', () => {
  it('covers the ten learning scenes with stable ids', () => {
    expect(DIALOGUE_SCENES.map((scene) => scene.id)).toEqual([
      'harbour-arrival',
      'grammar-garden',
      'bridge-workshop',
      'radio-station',
      'studio',
      'story-library',
      'market-street',
      'lighthouse-clinic',
      'weather-tower',
      'cafe-corner'
    ])
    for (const scene of DIALOGUE_SCENES) {
      expect(scene.title.length, scene.id).toBeGreaterThan(0)
      expect(scene.place.length, scene.id).toBeGreaterThan(0)
      expect(scene.heroLine.trim().length, scene.id).toBeGreaterThan(0)
      expect(scene.questions.length, scene.id).toBeGreaterThanOrEqual(4)
      expect(scene.questions.length, scene.id).toBeLessThanOrEqual(6)
    }
  })

  it('keeps every question id unique across all scenes', () => {
    const ids = DIALOGUE_SCENES.flatMap((scene) => scene.questions.map((question) => question.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('only uses known rule ids with a Chinese prompt', () => {
    for (const scene of DIALOGUE_SCENES) {
      for (const question of scene.questions) {
        expect(DIALOGUE_RULES, question.id).toContain(question.rule)
        expect(question.prompt.trim().length, question.id).toBeGreaterThan(0)
        // 题干以中文呈现，避免把答案直接暴露给学习者。
        expect(/[\u4e00-\u9fff]/.test(question.prompt), question.id).toBe(true)
      }
    }
  })

  it('requires every keyword to actually appear in the spoken sentence', () => {
    for (const scene of DIALOGUE_SCENES) {
      for (const question of scene.questions) {
        const tokens = tokensOf(question.spoken)
        expect(question.keywords.length, question.id).toBeGreaterThanOrEqual(2)
        expect(question.keywords.length, question.id).toBeLessThanOrEqual(4)
        for (const keyword of question.keywords) {
          expect(tokens, `${question.id}:${keyword}`).toContain(normalize(keyword))
        }
      }
    }
  })

  it('keeps distractors from colliding with keywords or duplicates', () => {
    for (const scene of DIALOGUE_SCENES) {
      for (const question of scene.questions) {
        expect(question.distractors.length, question.id).toBeGreaterThanOrEqual(1)
        expect(new Set(question.distractors.map(normalize)).size, question.id).toBe(question.distractors.length)
        for (const distractor of question.distractors) {
          for (const keyword of question.keywords) {
            const gap = distance(normalize(distractor), normalize(keyword))
            expect(gap, `${question.id}: ${distractor} vs ${keyword}`).toBeGreaterThan(1)
          }
        }
      }
    }
  })

  it('gives every question at least one distractor the offline hint engine can reach', () => {
    // engine/dialogue.ts 的 distractorFeedback 只在编辑距离 <= 3 时给出「听到的是 X，本题需要 Y」；
    // 若整道题的干扰词都在这个半径之外，学习者说错时不会收到任何提示。
    const unreachable: string[] = []
    for (const scene of DIALOGUE_SCENES) {
      for (const question of scene.questions) {
        const reachable = question.distractors.some((distractor) =>
          question.keywords.some((keyword) => {
            const gap = distance(normalize(distractor), normalize(keyword))
            return gap > 1 && gap <= 3
          })
        )
        if (!reachable) unreachable.push(`${question.id}: ${question.distractors.join('/')} vs ${question.keywords.join('/')}`)
      }
    }
    expect(unreachable).toEqual([])
  })

  it('uses A2-B1 sized English sentences', () => {
    for (const scene of DIALOGUE_SCENES) {
      for (const question of scene.questions) {
        const words = question.spoken.trim().split(/\s+/)
        expect(words.length, question.id).toBeGreaterThanOrEqual(4)
        expect(words.length, question.id).toBeLessThanOrEqual(12)
        expect(/[A-Za-z]/.test(question.spoken), question.id).toBe(true)
      }
    }
  })
})
