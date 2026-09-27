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
  })
})
