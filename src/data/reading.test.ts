import { describe, expect, it } from 'vitest'
import { CHAPTERS } from './reading'

/**
 * 阅读考点题的防泄题约束。
 *
 * 故事里每个选项按钮本身就是下一步行动，如果选项文字正好等于考点题答案，
 * 学习者不用读文章，只要照着上面那行按钮点就行。这里把这种重合钉死。
 */
describe('reading quiz content', () => {
  it('never lets a choice label contain the answer of its own quiz', () => {
    for (const chapter of CHAPTERS) {
      for (const [nodeId, node] of Object.entries(chapter.nodes)) {
        for (const choice of node.choices) {
          if (!choice.quiz) continue
          const answer = choice.quiz.options[choice.quiz.answer].toLowerCase()
          expect(
            choice.label.toLowerCase().includes(answer),
            `${chapter.id}:${nodeId}「${choice.label}」直接写出了答案「${choice.quiz.options[choice.quiz.answer]}」`
          ).toBe(false)
        }
      }
    }
  })

  it('keeps every quiz answer index valid and options distinct', () => {
    for (const chapter of CHAPTERS) {
      for (const [nodeId, node] of Object.entries(chapter.nodes)) {
        for (const choice of node.choices) {
          if (!choice.quiz) continue
          const quiz = choice.quiz
          expect(Number.isInteger(quiz.answer) && quiz.answer >= 0 && quiz.answer < quiz.options.length, `${chapter.id}:${nodeId}`).toBe(true)
          expect(new Set(quiz.options).size, `${chapter.id}:${nodeId}`).toBe(quiz.options.length)
        }
      }
    }
  })
})
