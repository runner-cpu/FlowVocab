import { create } from 'zustand'

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
}

export const useUI = create<GameUI>((set) => ({
  page: 'home',
  go: (p) => set({ page: p })
}))
