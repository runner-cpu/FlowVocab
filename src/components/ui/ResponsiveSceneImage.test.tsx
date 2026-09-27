import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import Home from '../../pages/Home'
import { useUI } from '../../store/gameStore'

afterEach(cleanup)

describe('home responsive scene media', () => {
  it('prioritizes the hero and lazily loads every below-fold scene from WebP variants', () => {
    useUI.setState({ track: 'middle-high' })
    render(<Home />)

    const hero = screen.getByRole('img', { name: '戴耳机的小狐狸站在夜色港湾，准备展开英语词汇探险' })
    expect(hero).toHaveAttribute('loading', 'eager')
    expect(hero).toHaveAttribute('fetchpriority', 'high')
    expect(hero.getAttribute('src')).toMatch(/neon-harbor-quest-1280\.webp$/)
    expect(hero.getAttribute('srcset')).toContain('neon-harbor-quest-768.webp 768w')
    expect(hero.getAttribute('srcset')).toContain('neon-harbor-quest-1280.webp 1280w')
    expect(hero).toHaveAttribute('width', '1280')
    expect(hero).toHaveAttribute('height', '853')

    const scenes = screen.getAllByRole('img', { name: /学习场景插画$/ })
    expect(scenes).toHaveLength(6)
    for (const scene of scenes) {
      expect(scene).toHaveAttribute('loading', 'lazy')
      expect(scene.getAttribute('src')).toMatch(/-1024\.webp$/)
      expect(scene.getAttribute('srcset')).toMatch(/-640\.webp 640w/)
      expect(scene.getAttribute('srcset')).toMatch(/-1024\.webp 1024w/)
      expect(scene).toHaveAttribute('width', '1024')
      expect(scene).toHaveAttribute('height', '768')
    }
  })
})
