import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { useProgress, emptyDaily } from '../../store/progressStore'
import { dayKey } from '../../engine/forget'
import ProgressionPanel, { SaveStatus } from './ProgressionPanel'

afterEach(cleanup)
const seed = () => useProgress.setState({
  profile: { id: 1, totalXp: 499, streakDays: 0, bestCombo: 0, createdAt: 0, lastStudyDate: null, claimedQuestDates: [], unlockedAchievements: [], settings: { zenMode: true, volume: 0, voiceRate: 1 } },
  planet: { id: 1, energy: 0, level: 0, lastActive: 0, dailyGoal: 100 },
  daily: emptyDaily(dayKey(Date.now())), userWords: [], saveError: null
})
describe('progression surfaces', () => {
  it('shows the level progress, all three quests, and an accessible locked chest', () => {
    seed()
    render(<ProgressionPanel />)
    expect(screen.getByRole('progressbar', { name: '等级经验' })).toHaveAttribute('aria-valuenow', '499')
    expect(screen.getByText('完成 10 次作答')).toBeVisible()
    expect(screen.getByText('获得 80 XP')).toBeVisible()
    expect(screen.getByText('达成 5 连击')).toBeVisible()
    expect(screen.getByRole('button', { name: /每日宝箱/ })).toBeDisabled()
  })
  it('keeps locked achievement names and criteria readable and shows ten planet stages', () => {
    seed()
    render(<ProgressionPanel achievements />)
    expect(screen.getByText('连续学习 7 天')).toBeVisible()
    expect(screen.getByText('掌握 100 个单词')).toBeVisible()
    expect(screen.getByText('达成 20 连击')).toBeVisible()
    expect(screen.getByLabelText('星球十阶段').querySelectorAll('li')).toHaveLength(10)
  })
  it('exposes save failure and keyboard-accessible retry', () => {
    seed()
    useProgress.setState({ saveError: '本次作答尚未保存，请重试。' })
    render(<SaveStatus />)
    expect(screen.getByRole('alert')).toHaveTextContent('尚未保存')
    const retry = screen.getByRole('button', { name: '重试保存' })
    retry.focus()
    expect(retry).toHaveFocus()
  })

  it('reports a chest claim failure inline', async () => {
    seed()
    const date = dayKey(Date.now())
    useProgress.setState({
      daily: { date, xp: 80, energy: 0, comboMax: 5, modules: { vocab: 10, grammar: 0, sentence: 0, listening: 0, writing: 0, reading: 0 } },
      claimDailyChest: vi.fn().mockRejectedValue(new Error('database locked')),
    })
    render(<ProgressionPanel />)
    const chest = screen.getByRole('button', { name: /每日宝箱/ })
    expect(chest).toBeEnabled()
    chest.click()
    expect(await screen.findByRole('alert')).toHaveTextContent('宝箱领取失败')
  })
})
