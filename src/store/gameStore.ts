import { create } from 'zustand'
import { readPreference, savePreference } from './preferences'
import type { DifficultyLevel, LearningTrack, ModuleKey } from '../types'

export type NavigablePageKey =
  | 'home'
  | 'dashboard'
  | 'vocab'
  | 'grammar'
  | 'sentence'
  | 'listening'
  | 'writing'
  | 'reading'

export type PageKey = NavigablePageKey | 'not-found'

const MODULE_KEYS = ['vocab', 'grammar', 'sentence', 'listening', 'writing', 'reading'] as const

interface GameUI {
  page: PageKey
  go: (p: NavigablePageKey) => void
  reviewWordId: string | null
  reviewWordLevel: DifficultyLevel | null
  reviewWord: (wordId: string, level?: DifficultyLevel) => void
  consumeReviewWord: () => void
  /** 从错题回顾跳到非词汇模块时，携带要重练的那一题的定位信息。 */
  reviewTarget: { module: ModuleKey; contentId: string } | null
  reviewMistake: (module: ModuleKey, contentId: string) => void
  consumeReviewTarget: () => void
  guideOpen: boolean
  openGuide: () => void
  closeGuide: () => void
  theme: 'light' | 'dark'
  toggleTheme: () => void
  track: LearningTrack
  setTrack: (track: LearningTrack) => void
}

function readTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  const stored = readPreference('flowvocab-theme')
  if (stored === 'dark' || stored === 'light') return stored
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function readTrack(): LearningTrack {
  if (typeof window === 'undefined') return 'middle-high'
  const stored = readPreference('flowvocab-track')
  return stored === 'primary' || stored === 'middle-high' || stored === 'advanced' || stored === 'cet' ? stored : 'middle-high'
}

function applyTheme(theme: 'light' | 'dark') {
  if (typeof document !== 'undefined') document.documentElement.dataset.theme = theme
}

function pageFromHash(hash: string): PageKey {
  const path = hash.replace(/^#/, '') || '/home'
  if (path === '/' || path === '/home' || path === 'main-content') return 'home'
  if (path === '/dashboard') return 'dashboard'
  const match = path.match(/^\/module\/([^/]+)$/)
  if (match && MODULE_KEYS.includes(match[1] as (typeof MODULE_KEYS)[number])) {
    return match[1] as (typeof MODULE_KEYS)[number]
  }
  return 'not-found'
}

function hashForPage(page: NavigablePageKey) {
  return page === 'home' || page === 'dashboard' ? `#/${page}` : `#/module/${page}`
}

function writePageHash(page: NavigablePageKey) {
  if (typeof window !== 'undefined') window.location.hash = hashForPage(page)
}

const initialTheme = readTheme()
applyTheme(initialTheme)

export const useUI = create<GameUI>((set) => ({
  page: typeof window === 'undefined' ? 'home' : pageFromHash(window.location.hash),
  go: (page) => {
    writePageHash(page)
    set({ page })
  },
  reviewWordId: null,
  reviewWordLevel: null,
  reviewWord: (wordId, level) => {
    set({ reviewWordId: wordId, reviewWordLevel: level ?? null })
    writePageHash('vocab')
    set({ page: 'vocab' })
  },
  consumeReviewWord: () => set({ reviewWordId: null, reviewWordLevel: null }),
  reviewTarget: null,
  reviewMistake: (module, contentId) => {
    set({ reviewTarget: { module, contentId } })
    writePageHash(module)
    set({ page: module })
  },
  consumeReviewTarget: () => set({ reviewTarget: null }),
  guideOpen: typeof window !== 'undefined' && readPreference('flowvocab-first-run-complete') !== '1',
  openGuide: () => set({ guideOpen: true }),
  closeGuide: () => {
    if (typeof window !== 'undefined') savePreference('flowvocab-first-run-complete', '1')
    set({ guideOpen: false })
  },
  theme: initialTheme,
  toggleTheme: () => set((state) => {
    const theme = state.theme === 'light' ? 'dark' : 'light'
    if (typeof window !== 'undefined') savePreference('flowvocab-theme', theme)
    applyTheme(theme)
    return { theme }
  }),
  track: readTrack(),
  setTrack: (track) => {
    if (typeof window !== 'undefined') savePreference('flowvocab-track', track)
    set({ track })
  }
}))

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    if (window.location.hash === '#main-content') return
    useUI.setState({ page: pageFromHash(window.location.hash) })
  })
}
