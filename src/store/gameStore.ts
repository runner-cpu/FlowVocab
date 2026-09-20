import { create } from 'zustand'
import type { LearningTrack } from '../types'

export type PageKey =
  | 'home'
  | 'dashboard'
  | 'vocab'
  | 'grammar'
  | 'sentence'
  | 'listening'
  | 'writing'
  | 'reading'

interface GameUI {
  page: PageKey
  go: (p: PageKey) => void
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

const initialTheme = readTheme()
applyTheme(initialTheme)

export const useUI = create<GameUI>((set) => ({
  page: 'home',
  go: (p) => set({ page: p }),
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
