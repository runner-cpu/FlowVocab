import type { LearningTrack, ModuleKey } from '../types'

export interface LearningScene {
  module: ModuleKey
  eyebrow: string
  title: string
  visual: string
  prompt: string
  tracks: LearningTrack[]
  tint: string
}

export const LEARNING_SCENES: LearningScene[] = [
  { module: 'vocab', eyebrow: '语境词卡', title: '微光港', visual: './assets/flowvocab-scene-vocab.png', prompt: '用图像认出高频词，建立第一条记忆航线。', tracks: ['primary', 'middle-high', 'advanced', 'cet'], tint: '#1eb7a0' },
  { module: 'grammar', eyebrow: '技能树', title: '语法花园', visual: './assets/flowvocab-scene-grammar.png', prompt: '把规则放回故事里，理解每一次变化。', tracks: ['primary', 'middle-high', 'advanced', 'cet'], tint: '#3b82f6' },
  { module: 'sentence', eyebrow: '句子拼图', title: '桥梁工坊', visual: './assets/flowvocab-scene-sentence.png', prompt: '移动词块，让长句从悬崖两侧连起来。', tracks: ['middle-high', 'advanced', 'cet'], tint: '#f28c5c' },
  { module: 'listening', eyebrow: '声音探险', title: '星际电台', visual: './assets/flowvocab-scene-listening.png', prompt: '听见节奏、语气和场景中的关键信号。', tracks: ['primary', 'middle-high', 'advanced', 'cet'], tint: '#5b7def' },
  { module: 'writing', eyebrow: '表达工坊', title: '灵感工作室', visual: './assets/flowvocab-scene-writing.png', prompt: '用句型卡搭出更自然、更有画面的表达。', tracks: ['middle-high', 'advanced', 'cet'], tint: '#9b74dd' },
  { module: 'reading', eyebrow: '剧情副本', title: '故事图书馆', visual: './assets/flowvocab-scene-reading.png', prompt: '沿着情节找线索，把阅读理解变成探索。', tracks: ['primary', 'middle-high', 'advanced', 'cet'], tint: '#d99843' }
]
