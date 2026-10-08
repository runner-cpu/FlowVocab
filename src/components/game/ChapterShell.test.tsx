import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import ChapterShell, { useChapterResult, SETTLE_MIN_ANSWERS } from './ChapterShell'
import { db } from '../../store/db'
import { useProgress } from '../../store/progressStore'
import { useUI } from '../../store/gameStore'

function Trigger() {
  const { report } = useChapterResult()
  return <>
    <button onClick={() => report(10, 9)}>report full round</button>
    <button onClick={() => report(SETTLE_MIN_ANSWERS - 1, SETTLE_MIN_ANSWERS - 1)}>report short round</button>
  </>
}

beforeEach(async () => {
  await db.delete()
  await db.open()
  await useProgress.getState().init()
  useUI.setState({ track: 'middle-high', page: 'vocab' })
})
afterEach(async () => { cleanup(); await db.delete() })

describe('chapter shell settlement', () => {
  it('turns a reported round into stars, stardust and a persisted chapter result', async () => {
    render(<ChapterShell module="vocab"><Trigger /></ChapterShell>)
    expect(screen.getByText('第 1 站 · 词汇灯塔')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'report full round' }))
    expect(await screen.findByRole('heading', { name: '灯塔点亮' })).toBeVisible()
    expect(screen.getByRole('img', { name: '本章结算：3 / 3 星' })).toBeVisible()
    expect(screen.getByText('获得星尘 +30')).toBeVisible()
    await waitFor(() => expect(useProgress.getState().progress?.chapterStars?.harbour).toBe(3))
    expect(useProgress.getState().progress?.stardust).toBe(30)
    expect(await db.progress.get(1)).toMatchObject({ chapterStars: { harbour: 3 }, stardust: 30 })
  })

  it('ignores a round shorter than the settlement minimum', async () => {
    render(<ChapterShell module="vocab"><Trigger /></ChapterShell>)
    fireEvent.click(screen.getByRole('button', { name: 'report short round' }))
    expect(screen.queryByRole('heading', { name: '灯塔点亮' })).toBeNull()
    expect(useProgress.getState().progress?.chapterStars?.harbour).toBeUndefined()
    expect(useProgress.getState().progress?.stardust ?? 0).toBe(0)
  })

  it('keeps the best stars and pays only the stardust difference on replay', async () => {
    render(<ChapterShell module="vocab"><Trigger /></ChapterShell>)
    fireEvent.click(screen.getByRole('button', { name: 'report full round' }))
    await screen.findByRole('heading', { name: '灯塔点亮' })
    await waitFor(() => expect(useProgress.getState().progress?.stardust).toBe(30))
    fireEvent.click(screen.getByRole('button', { name: /再来一轮/ }))
    expect(screen.queryByRole('heading', { name: '灯塔点亮' })).toBeNull()
    await useProgress.getState().recordChapterResult('harbour', SETTLE_MIN_ANSWERS, 0)
    expect(useProgress.getState().progress?.chapterStars?.harbour).toBe(3)
    expect(useProgress.getState().progress?.stardust).toBe(30)
  })

  it('never pays out for a chapter that does not exist on the route', async () => {
    render(<ChapterShell module="vocab"><Trigger /></ChapterShell>)
    await useProgress.getState().recordChapterResult('missing-chapter', 10, 10)
    expect(useProgress.getState().progress?.stardust ?? 0).toBe(0)
    expect(useProgress.getState().progress?.chapterStars?.harbour).toBeUndefined()
    expect(useProgress.getState().progress?.chapterStars?.['missing-chapter']).toBeUndefined()
  })
})
