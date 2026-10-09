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
    <button onClick={() => report(2, 2)}>report node round</button>
    <button onClick={() => { report(1, 1); report(2, 1); report(3, 2) }}>report growing run</button>
    <button onClick={() => { report(3, 2); report(3, 2); report(3, 2) }}>report repeated snapshot</button>
    <button onClick={() => { report(6, 6); report(2, 2) }}>report better then worse</button>
    <button onClick={() => report(0, 0)}>report empty round</button>
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

  it('rejects a zero-question report instead of settling an untouched chapter', async () => {
    render(<ChapterShell module="vocab"><Trigger /></ChapterShell>)
    fireEvent.click(screen.getByRole('button', { name: 'report empty round' }))
    expect(screen.queryByRole('heading', { name: '灯塔点亮' })).toBeNull()
    expect(useProgress.getState().progress?.chapterStars?.harbour).toBeUndefined()
    expect(useProgress.getState().progress?.stardust ?? 0).toBe(0)
  })

  it('settles a short node so low-content routes can still earn stars', async () => {
    // 小学路线的语法只有一个节点、两道题；旧门槛（5 题）会让该章节永远拿不到星。
    render(<ChapterShell module="grammar"><Trigger /></ChapterShell>)
    fireEvent.click(screen.getByRole('button', { name: 'report node round' }))
    expect(await screen.findByRole('heading', { name: '灯塔点亮' })).toBeVisible()
    expect(screen.getByText(/完成 2 题 · 答对 2 题/)).toBeVisible()
    expect(screen.getByRole('img', { name: '本章结算：3 / 3 星' })).toBeVisible()
    await waitFor(() => expect(useProgress.getState().progress?.chapterStars?.garden).toBe(3))
  })

  it('uses the best run snapshot instead of summing repeated reports', async () => {
    render(<ChapterShell module="grammar"><Trigger /></ChapterShell>)
    fireEvent.click(screen.getByRole('button', { name: 'report growing run' }))
    expect(await screen.findByRole('heading', { name: '灯塔点亮' })).toBeVisible()
    // 1 → 2 → 3 的快照应结算为 3 题 2 对（1 星），而不是累加成 6 题。
    expect(screen.getByText(/完成 3 题 · 答对 2 题/)).toBeVisible()
    await waitFor(() => expect(useProgress.getState().progress?.chapterStars?.garden).toBe(1))
    expect(useProgress.getState().progress?.stardust).toBe(10)
  })

  it('does not inflate a score when the same snapshot is reported repeatedly', async () => {
    render(<ChapterShell module="grammar"><Trigger /></ChapterShell>)
    fireEvent.click(screen.getByRole('button', { name: 'report repeated snapshot' }))
    expect(await screen.findByRole('heading', { name: '灯塔点亮' })).toBeVisible()
    expect(screen.getByText(/完成 3 题 · 答对 2 题/)).toBeVisible()
    await waitFor(() => expect(useProgress.getState().progress?.chapterStars?.garden).toBe(1))
    expect(useProgress.getState().progress?.stardust).toBe(10)
  })

  it('keeps the most complete report and ignores a shorter later one', async () => {
    render(<ChapterShell module="grammar"><Trigger /></ChapterShell>)
    fireEvent.click(screen.getByRole('button', { name: 'report better then worse' }))
    expect(await screen.findByRole('heading', { name: '灯塔点亮' })).toBeVisible()
    expect(screen.getByText(/完成 6 题 · 答对 6 题/)).toBeVisible()
    await waitFor(() => expect(useProgress.getState().progress?.chapterStars?.garden).toBe(3))
    expect(useProgress.getState().progress?.stardust).toBe(30)
  })

  it('pays no extra stardust when a cleared chapter is replayed', async () => {
    const first = render(<ChapterShell module="vocab"><Trigger /></ChapterShell>)
    fireEvent.click(screen.getByRole('button', { name: 'report full round' }))
    await screen.findByRole('heading', { name: '灯塔点亮' })
    await waitFor(() => expect(useProgress.getState().progress?.stardust).toBe(30))
    cleanup()
    render(<ChapterShell module="vocab"><Trigger /></ChapterShell>)
    fireEvent.click(screen.getByRole('button', { name: 'report full round' }))
    expect(await screen.findByRole('heading', { name: '灯塔点亮' })).toBeVisible()
    expect(screen.getByText('本章星尘已拿满，重玩不再重复掉落')).toBeVisible()
    expect(useProgress.getState().progress?.stardust).toBe(30)
    void first
  })

  it('treats the floor constant as a positive number', () => {
    expect(SETTLE_MIN_ANSWERS).toBeGreaterThan(0)
  })
})
