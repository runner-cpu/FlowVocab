import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useProgress } from '../../store/progressStore'
import PlanetView, { ENERGY_PER_LEVEL, nextLevelGap, planetStage } from './PlanetView'

afterEach(cleanup)

describe('planet growth math', () => {
  it('maps energy to the documented stage names', () => {
    expect(planetStage(0)).toBe('未启航')
    expect(planetStage(6)).toBe('群山起伏')
    expect(planetStage(99)).toBe('生命繁盛')
  })

  it('reports the energy needed for the next stage and stops at max level', () => {
    expect(nextLevelGap(0)).toEqual({ level: 0, current: 0, needed: ENERGY_PER_LEVEL, percent: 0 })
    expect(nextLevelGap(120)).toEqual({ level: 0, current: 120, needed: ENERGY_PER_LEVEL, percent: 48 })
    expect(nextLevelGap(9 * ENERGY_PER_LEVEL + 10)?.level).toBe(9)
    expect(nextLevelGap(10 * ENERGY_PER_LEVEL)).toBeNull()
    expect(nextLevelGap(Number.NaN)).toEqual({ level: 0, current: 0, needed: ENERGY_PER_LEVEL, percent: 0 })
  })
})

describe('planet visual stages', () => {
  it.each([
    [0, '未启航'],
    [6, '群山起伏'],
    [10, '生命繁盛']
  ] as const)('exposes level %i as the distinct %s stage', (level, stage) => {
    useProgress.setState({ planet: { id: 1, energy: level * 250, level, lastActive: Date.now(), dailyGoal: 100 } })
    render(<PlanetView />)

    const planet = screen.getByRole('img', { name: new RegExp(`星球等级 ${level}.*${stage}`) })
    expect(planet).toHaveAttribute('data-level', String(level))
    expect(planet.parentElement?.querySelector('.planet-core')).toHaveClass(`p${level}`)
  })

  it('shows the growth progress and expands the stage explanation on demand', () => {
    useProgress.setState({ planet: { id: 1, energy: 120, level: 0, lastActive: Date.now(), dailyGoal: 100 } })
    render(<PlanetView />)
    const bar = screen.getByRole('progressbar', { name: /距离 Lv.1 还差 130 能量/ })
    expect(bar).toHaveAttribute('aria-valuenow', '120')
    expect(screen.getByText(/距 Lv.1 还差 130 能量/)).toBeVisible()
    const toggle = screen.getByRole('button', { name: '阶段说明' })
    expect(screen.queryByText(/共 10 段/)).toBeNull()
    fireEvent.click(toggle)
    expect(screen.getByText(/共 10 段/)).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: '收起阶段说明' }))
    expect(screen.queryByText(/共 10 段/)).toBeNull()
  })

  it('uses distinct atmosphere classes for advanced levels', () => {
    useProgress.setState({ planet: { id: 1, energy: 1500, level: 6, lastActive: Date.now(), dailyGoal: 100 } })
    const { rerender } = render(<PlanetView />)
    const levelSix = screen.getByRole('img', { name: /星球等级 6/ })
    const levelSixCore = levelSix.querySelector('.planet-core')
    expect(levelSixCore).toHaveClass('p6')
    const levelSixClassName = levelSixCore?.className
    useProgress.setState({ planet: { id: 1, energy: 2500, level: 10, lastActive: Date.now(), dailyGoal: 100 } })
    rerender(<PlanetView />)
    const levelTen = screen.getByRole('img', { name: /星球等级 10/ })
    const levelTenCore = levelTen.querySelector('.planet-core')
    expect(levelTenCore).toHaveClass('p10')
    expect(levelSixClassName).not.toBe(levelTenCore?.className)
  })
})
