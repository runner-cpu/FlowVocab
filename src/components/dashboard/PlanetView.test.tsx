import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { useProgress } from '../../store/progressStore'
import PlanetView from './PlanetView'

afterEach(cleanup)

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
