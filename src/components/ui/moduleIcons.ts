import { BookOpen, BookOpenText, GitBranch, Headphones, PenLine, Puzzle, type LucideIcon } from 'lucide-react'
import type { ModuleKey } from '../../types'

/**
 * 模块图标：全站唯一的图标来源，六个模块共用同一套 Lucide 线性图标。
 *
 * 放在 UI 层而不是 types/index.ts：types 会被数据层与 store 引入，
 * 把 React 组件塞进去会让纯数据模块多一条组件依赖。
 * 插画场景图仍然保留（ResponsiveSceneImage），低龄路线继续靠图建立认知。
 */
export const MODULE_ICONS: Record<ModuleKey, LucideIcon> = {
  vocab: BookOpen,
  grammar: GitBranch,
  sentence: Puzzle,
  listening: Headphones,
  writing: PenLine,
  reading: BookOpenText
}
