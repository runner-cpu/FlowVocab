import { create } from 'zustand'
import type { LearningTrack } from '../types'

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
  reviewWord: (wordId: string) => void
  consumeReviewWord: () => void
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
  const stored = window.localStorage.getItem('flowvocab-theme')
  if (stored === 'dark' || stored === 'light') return stored
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function readTrack(): LearningTrack {
  if (typeof window === 'undefined') return 'middle-high'
  const stored = window.localStorage.getItem('flowvocab-track')
  return stored === 'primary' || stored === 'middle-high' || stored === 'advanced' || stored === 'cet' ? stored : 'middle-high'
}

function applyTheme(theme: 'light' | 'dark') {
  if (typeof document !== 'undefined') document.documentElement.dataset.theme = theme
}

function pageFromHash(hash: string): PageKey {
  const path = hash.replace(/^#/, '') || '/home'
  if (path === '/home') return 'home'
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

const initialTheme = readTheme()
applyTheme(initialTheme)

export const useUI = create<GameUI>((set) => ({
  page: typeof window === 'undefined' ? 'home' : pageFromHash(window.location.hash),
  go: (page) => {
    if (typeof window !== 'undefined') window.location.hash = hashForPage(page)
    set({ page })
  },
  reviewWordId: null,
  reviewWord: (wordId) => {
    if (typeof window !== 'undefined') window.location.hash = hashForPage('vocab')
    set({ page: 'vocab', reviewWordId: wordId })
  },
  consumeReviewWord: () => set({ reviewWordId: null }),
  guideOpen: typeof window !== 'undefined' && window.localStorage.getItem('flowvocab-first-run-complete') !== '1',
  openGuide: () => set({ guideOpen: true }),
  closeGuide: () => {
    if (typeof window !== 'undefined') window.localStorage.setItem('flowvocab-first-run-complete', '1')
    set({ guideOpen: false })
  },
  theme: initialTheme,
  toggleTheme: () => set((state) => {
    const theme = state.theme === 'light' ? 'dark' : 'light'
    if (typeof window !== 'undefined') window.localStorage.setItem('flowvocab-theme', theme)
    applyTheme(theme)
    return { theme }
  }),
  track: readTrack(),
  setTrack: (track) => {
    if (typeof window !== 'undefined') window.localStorage.setItem('flowvocab-track', track)
    set({ track })
  }
}))

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    useUI.setState({ page: pageFromHash(window.location.hash) })
  })
}
