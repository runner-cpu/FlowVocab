// ============ 全局类型定义 ============

export type DifficultyLevel = 0 | 1 | 2 | 3 | 4

export type VocabMode = 'meaning' | 'listening' | 'spelling'
export interface VocabQuestion {
  word: Word
  mode: VocabMode
  prompt: string
  options: { text: string; correct: boolean }[]
  boss: boolean
}
export interface WordBankProgress {
  phase: 'download' | 'import' | 'ready'
  loaded: number
  total: number
}

export interface FeedbackEvent {
  type: 'hit' | 'critical' | 'combo' | 'rage' | 'miss' | 'levelup' | 'leveldown'
  combo: number
  isCritical?: boolean
  rageActive?: boolean
  message?: string
}

// ---------- 词汇 ----------
export interface Word {
  id: string
  word: string
  phonetic: string
  meaning: string
  example: string
  exampleCn: string
  level: DifficultyLevel
  pos: string
  /** Licensed ECDICT inventory. */
  source?: 'ecdict'
  tags?: string[]
  legacyIds?: string[]
  /** 常考搭配/词组 */
  phrases?: { phrase: string; translation: string }[]
}

export type WordStatus = 'new' | 'learning' | 'mastered'

export interface UserWord {
  id: string
  wordId: string
  status: WordStatus
  correct: number
  total: number
  lastReview: number | null
  nextReview: number
  interval: number
  quality: number
  successfulReviews: number
}

// ---------- 语法 ----------
export interface GrammarQuiz {
  prompt: string
  options: string[]
  answer: number
  explain: string
}

export interface SkillNode {
  id: string
  name: string
  parent?: string
  desc: string
  examples: string[]
  quizzes: GrammarQuiz[]
}

// ---------- 句子 ----------
export interface SentenceQuest {
  id: string
  type: 'puzzle' | 'translate'
  sentence: string
  segments?: { text: string; bucket: 'main' | 'clause' | 'modifier' }[]
  prompt?: string
  options?: string[]
  answer?: number
  explain?: string
}

// ---------- 听力 ----------
export interface ListeningItem {
  id: string
  text: string
  level: number
  blanks: { index: number; answer: string; options: string[] }[]
}

// ---------- 写作 ----------
export interface SentenceCard {
  id: string
  type: string
  pattern: string
  meaning: string
  example: string
  points: number
}

export interface WritingTask {
  id: string
  title: string
  /** sort=句子排序（重构句型） / error=改错题（找错误/选正确改法） */
  type: 'sort' | 'error'
  prompt: string
  /** sort：正确顺序的句子片段（UI 打乱展示） */
  segments?: string[]
  /** error：含错误的句子 */
  sentence?: string
  /** error：四个选项 */
  options?: string[]
  /** error：正确选项下标 */
  answer?: number
  explain?: string
}

// ---------- 阅读 ----------
export interface ReadingQuiz {
  prompt: string
  options: string[]
  answer: number
  explain: string
}

export interface NarrativeChoice {
  label: string
  next: string
  quiz?: ReadingQuiz
}

export interface NarrativeNode {
  id: string
  text: string
  choices: NarrativeChoice[]
}

export interface Chapter {
  id: string
  title: string
  intro: string
  start: string
  nodes: Record<string, NarrativeNode>
}

// ---------- 六维 ----------
export type ModuleKey = 'vocab' | 'grammar' | 'sentence' | 'listening' | 'writing' | 'reading'

export type LearningTrack = 'primary' | 'middle-high' | 'advanced' | 'cet'

export interface LearningTrackMeta {
  label: string
  shortLabel: string
  description: string
  goal: string
  accent: string
}

export const LEARNING_TRACKS: Record<LearningTrack, LearningTrackMeta> = {
  primary: { label: '小学启蒙', shortLabel: '小学', description: '图片、故事和基础表达', goal: '用图像和故事建立英语自信', accent: '#f2a65a' },
  'middle-high': { label: '初高中进阶', shortLabel: '初高中', description: '语法、听力和主题阅读', goal: '把知识点放进真实语境里', accent: '#3b82f6' },
  advanced: { label: '高中冲刺', shortLabel: '高中', description: '长难句、写作和综合理解', goal: '让复杂内容变成可拆解的路径', accent: '#8b5cf6' },
  cet: { label: '四六级备考', shortLabel: '四六级', description: '考纲词汇与题型模拟', goal: '围绕考试目标稳定提分', accent: '#ef745f' }
}

export const TRACK_MODULE_FOCUS: Record<LearningTrack, Record<ModuleKey, string>> = {
  primary: { vocab: '图片认词与基础表达', grammar: '句型规律与颜色提示', sentence: '短句拼图与口语模仿', listening: '慢速对话与声音线索', writing: '看图写一句完整表达', reading: '绘本线索与故事理解' },
  'middle-high': { vocab: '主题词汇与搭配', grammar: '核心时态与从句', sentence: '句子结构与语序', listening: '校园与生活场景', writing: '段落衔接与表达', reading: '主题阅读与证据定位' },
  advanced: { vocab: '长难句高频词', grammar: '非谓语与复杂从句', sentence: '拆解长难句', listening: '综合听力与推断', writing: '论证结构与句型升级', reading: '篇章逻辑与主旨' },
  cet: { vocab: '考纲词汇与题型模拟', grammar: '考纲语法辨析', sentence: '考纲长句重构', listening: '新闻与讲座听力', writing: '四级/六级写作模板', reading: '题型模拟速读与定位' }
}

export const MODULE_META: Record<ModuleKey, { name: string; icon: string; color: string; desc: string }> = {
  vocab: { name: '词汇·词魂战场', icon: '⚔️', color: '#5B8DEF', desc: '节奏打击背词' },
  grammar: { name: '语法·技能树', icon: '🌳', color: '#34A853', desc: '点亮语法技能' },
  sentence: { name: '句子·拆解工坊', icon: '🧩', color: '#F4B400', desc: '长难句拆解拼图' },
  listening: { name: '听力·ASMR听写', icon: '🎧', color: '#EA4335', desc: '听音辨词闯关' },
  writing: { name: '写作·卡牌对战', icon: '🃏', color: '#9334E6', desc: '句型卡组牌写作' },
  reading: { name: '阅读·叙事副本', icon: '📖', color: '#00ACC1', desc: '剧情推进读考点' }
}

// ---------- 雷达 ----------
export interface Radar {
  vocab: number
  grammar: number
  sentence: number
  listening: number
  writing: number
  reading: number
}

// ---------- 会话 ----------
export interface Session {
  id: number
  time: number
  module: ModuleKey
  comboMax: number
  correct: number
  total: number
  difficultyFlow: number[]
  energy: number
}

// ---------- 每日统计 ----------
export interface DailyStat {
  date: string
  xp: number
  energy: number
  comboMax: number
  modules: Record<ModuleKey, number>
}

// ---------- 进度 ----------
export interface Progress {
  id: number
  radar: Radar
  skillTree: Record<string, boolean>
  cards: string[]
  narrative: Record<string, string>
  writingLog: { taskId: string; score: number; time: number }[]
  // 模块完成度计数
  sentencePassed: number
  listeningPassed: number
  writingDone: number
  writingScoreSum: number
  readingDone: number
}

// ---------- 星球 ----------
export interface Planet {
  id: number
  energy: number
  level: number
  lastActive: number
  dailyGoal: number
}

// ---------- 用户 ----------
export interface UserProfile {
  id: number
  totalXp: number
  bestCombo: number
  streakDays: number
  lastStudyDate: string | null
  /** Local date for chests; date:quest-id for automatically awarded quest XP. */
  claimedQuestDates: string[]
  unlockedAchievements: string[]
  createdAt: number
  settings: { zenMode: boolean; volume: number; voiceRate: number }
}
