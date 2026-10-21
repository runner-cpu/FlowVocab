import { describe, expect, it } from 'vitest'
import { GRAMMAR_BRANCHES, GRAMMAR_NODES } from './grammar'

/** 归一化成小写词序列，用来比较「例题」与「题目」是不是同一句话。 */
function tokens(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
}

/** 词集合 Jaccard 相似度：0 表示毫无重合，1 表示完全一致。 */
function similarity(a: string, b: string): number {
  const left = new Set(tokens(a))
  const right = new Set(tokens(b))
  const union = new Set([...left, ...right])
  return [...left].filter((word) => right.has(word)).length / Math.max(union.size, 1)
}

describe('grammar content', () => {
  it('keeps every branch rooted at a node that exists', () => {
    const ids = new Set(GRAMMAR_NODES.map((node) => node.id))
    for (const branch of GRAMMAR_BRANCHES) expect(ids.has(branch.id), branch.id).toBe(true)
  })

  it('keeps node ids unique and every quiz answer index valid', () => {
    expect(new Set(GRAMMAR_NODES.map((node) => node.id)).size).toBe(GRAMMAR_NODES.length)
    for (const node of GRAMMAR_NODES) {
      expect(node.quizzes.length, node.id).toBeGreaterThanOrEqual(2)
      for (const quiz of node.quizzes) {
        expect(quiz.prompt, node.id).toContain('___')
        expect(Number.isInteger(quiz.answer) && quiz.answer >= 0 && quiz.answer < quiz.options.length, quiz.prompt).toBe(true)
        expect(new Set(quiz.options).size, quiz.prompt).toBe(quiz.options.length)
      }
    }
  })

  /**
   * 核心回归断言：例题可以讲规则，但绝不能把题目答案原样写在上面。
   * 旧版把例句挖空当作题目，学习者照抄上一行即可作答；这里用词重合度把它钉死。
   */
  it('never reuses an example sentence as the quiz sentence', () => {
    for (const node of GRAMMAR_NODES) {
      for (const quiz of node.quizzes) {
        const filled = quiz.prompt.replace('___', quiz.options[quiz.answer])
        for (const example of node.examples) {
          const score = similarity(filled, example)
          expect(score, `${node.id}: 题目「${filled}」与例句「${example}」重合度过高（${score.toFixed(2)}）`).toBeLessThan(0.5)
        }
      }
    }
  })

  it('does not paste the completed quiz sentence into the examples verbatim', () => {
    for (const node of GRAMMAR_NODES) {
      for (const quiz of node.quizzes) {
        const filled = quiz.prompt.replace('___', quiz.options[quiz.answer]).toLowerCase().replace(/\s+/g, ' ')
        for (const example of node.examples) {
          expect(example.toLowerCase().replace(/\s+/g, ' ')).not.toContain(filled)
        }
      }
    }
  })
})
