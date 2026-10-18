import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { useProgress } from './progressStore'
import { useUI } from './gameStore'

beforeEach(async () => {
  await db.delete(); await db.open()
  await useProgress.getState().init()
  useUI.setState({ track: 'middle-high' })
})
afterEach(async () => { await db.delete() })

describe('mistake persistence through the answer flow', () => {
  it('records a grammar mistake and removes it on a later correct answer', async () => {
    const store = useProgress.getState()
    const mistake = {
      module: 'grammar' as const,
      contentId: 'tense-basic#0',
      prompt: 'She ___ to work by bus every day.',
      chosen: 'go',
      correctAnswer: 'goes',
      tag: 'agreement' as const
    }

    await store.answer({ module: 'grammar', correct: false, timeMs: 3000, mistake })
    let mistakes = useProgress.getState().progress?.mistakes ?? []
    expect(mistakes).toHaveLength(1)
    expect(mistakes[0]).toMatchObject({ contentId: 'tense-basic#0', count: 1, tag: 'agreement' })

    // 同一题再错一次：只累加，不新增。
    await useProgress.getState().answer({ module: 'grammar', correct: false, timeMs: 3000, mistake })
    mistakes = useProgress.getState().progress?.mistakes ?? []
    expect(mistakes).toHaveLength(1)
    expect(mistakes[0].count).toBe(2)

    // 答对后自动移出。
    await useProgress.getState().answer({ module: 'grammar', correct: true, timeMs: 1200, mistake })
    expect(useProgress.getState().progress?.mistakes ?? []).toHaveLength(0)
  })

  it('keeps mistakes from different modules separate', async () => {
    const answer = useProgress.getState().answer
    await answer({ module: 'grammar', correct: false, timeMs: 2000, mistake: { module: 'grammar', contentId: 'q1', prompt: 'Q1', tag: 'tense' } })
    await answer({ module: 'reading', correct: false, timeMs: 2000, mistake: { module: 'reading', contentId: 'q1', prompt: 'Q1', tag: 'generic' } })
    await answer({ module: 'vocab', correct: false, timeMs: 2000, mistake: { module: 'vocab', contentId: 'word-1', prompt: 'explore', tag: 'spelling' } })
    const mistakes = useProgress.getState().progress?.mistakes ?? []
    expect(mistakes).toHaveLength(3)
    expect(new Set(mistakes.map((record) => record.module))).toEqual(new Set(['grammar', 'reading', 'vocab']))
  })

  it('clears a single record on request and survives a reload', async () => {
    const mistake = { module: 'writing' as const, contentId: 'w-err-1', prompt: 'He don\'t like it.', tag: 'agreement' as const }
    await useProgress.getState().answer({ module: 'writing', correct: false, timeMs: 2000, mistake })
    // 重新从 IndexedDB 载入，确认写库而不是只改内存。
    await useProgress.getState().init(true)
    expect(useProgress.getState().progress?.mistakes).toHaveLength(1)

    await useProgress.getState().clearMistake('writing', 'w-err-1')
    await useProgress.getState().init(true)
    expect(useProgress.getState().progress?.mistakes ?? []).toHaveLength(0)
  })

  it('does not touch the notebook when a module omits the mistake payload', async () => {
    await useProgress.getState().answer({ module: 'grammar', correct: false, timeMs: 2000 })
    expect(useProgress.getState().progress?.mistakes ?? []).toHaveLength(0)
  })
})

describe('daily goal setting', () => {
  it('clamps the goal into a usable range and persists it', async () => {
    await useProgress.getState().updateDailyGoal(20)
    expect(useProgress.getState().planet?.dailyGoal).toBe(40)

    await useProgress.getState().updateDailyGoal(1234)
    expect(useProgress.getState().planet?.dailyGoal).toBe(400)

    await useProgress.getState().updateDailyGoal(137)
    expect(useProgress.getState().planet?.dailyGoal).toBe(140)

    await useProgress.getState().init(true)
    expect(useProgress.getState().planet?.dailyGoal).toBe(140)
  })
})
