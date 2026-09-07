import type { WritingTask } from '../types'

/**
 * 写作·句型工坊（P0：客观题化）
 * 设计依据：开放式写作规则批改易被钻空子且体验不稳定，
 * P0 改为「句子排序」+「句子改错」两类客观题，训练四六级高频写作句型与常见错误；
 * P2 再接入 LLM 开放式批改。
 */
export const WRITING_TASKS: WritingTask[] = [
  // ---------- 排序题：重构句型 ----------
  {
    id: 'w-sort-1',
    title: '倒装句重建',
    type: 'sort',
    prompt: '将下列片段按正确语序排列，重建出规范的倒装句（Only when…）。',
    segments: ['Only when we make full use of time', 'can we achieve', 'our goals in study'],
    explain: '倒装句：Only when + 从句 → 主句部分倒装（can we…）。原句：Only when we make full use of time can we achieve our goals in study.'
  },
  {
    id: 'w-sort-2',
    title: 'not only 并列',
    type: 'sort',
    prompt: '将片段排列成 Not only… but also… 结构，注意主谓倒装。',
    segments: ['Not only does reading enrich our knowledge', 'but it also', 'broadens our horizons'],
    explain: 'Not only 置于句首时助动词提前：Not only does reading enrich our knowledge, but it also broadens our horizons.'
  },
  {
    id: 'w-sort-3',
    title: '强调句重建',
    type: 'sort',
    prompt: '排列成 It is … that … 强调句，强调「坚持写日记这一习惯」。',
    segments: ['It is a good habit of keeping a diary', 'that helps us', 'improve our writing skills'],
    explain: '强调句：It is + 被强调部分 + that + 其余。原句：It is a good habit of keeping a diary that helps us improve our writing skills.'
  },
  {
    id: 'w-sort-4',
    title: '非谓语开篇',
    type: 'sort',
    prompt: '排列成 Having done… 开篇的非谓语结构。',
    segments: ['Having finished the homework', 'she went to bed', 'early that night'],
    explain: '非谓语开篇：Having finished the homework, she went to bed early that night.'
  },

  // ---------- 改错题：四六级写作高频错误 ----------
  {
    id: 'w-err-1',
    title: '主谓一致',
    type: 'error',
    prompt: '选出下列句子中最恰当的正确改法（原句含语法错误）。',
    sentence: 'He don’t like the way the teacher explains the lesson.',
    options: [
      'He doesn’t like the way the teacher explains the lesson.',
      'He don’t likes the way the teacher explains the lesson.',
      'He doesn’t like the ways the teacher explains the lesson.',
      'He don’t like the way the teacher explain the lesson.'
    ],
    answer: 0,
    explain: '一般现在时第三人称单数用 doesn’t + 动词原形：He doesn’t like…'
  },
  {
    id: 'w-err-2',
    title: 'there be + 主谓',
    type: 'error',
    prompt: '选出正确改法。',
    sentence: 'There are a lot of students thinks that online learning is convenient.',
    options: [
      'There are a lot of students think that online learning is convenient.',
      'There are a lot of students thinking that online learning is convenient.',
      'There are a lot of students who think that online learning is convenient.',
      'There are a lot of students thought that online learning is convenient.'
    ],
    answer: 2,
    explain: 'there be 后接名词 + 定语从句修饰：There are a lot of students who think that…（students 与 think 间需从句连接词）。'
  },
  {
    id: 'w-err-3',
    title: '比较级冗余',
    type: 'error',
    prompt: '找出并修正比较级中的冗余错误。',
    sentence: 'She is more taller than her sister in the photo.',
    options: [
      'She is taller than her sister in the photo.',
      'She is more tall than her sister in the photo.',
      'She is the taller than her sister in the photo.',
      'She is more taller than her sister in the photo.'
    ],
    answer: 0,
    explain: '比较级 taller 已经表达「更」，不能再加 more（more taller 是冗余错误）。'
  },
  {
    id: 'w-err-4',
    title: '介词+动名词',
    type: 'error',
    prompt: '选出正确改法。',
    sentence: 'I am looking forward to hear from you soon.',
    options: [
      'I am looking forward to hearing from you soon.',
      'I am looking forward to heard from you soon.',
      'I am looking forward to hears from you soon.',
      'I am looking forward to hear from you soon.'
    ],
    answer: 0,
    explain: 'look forward to 中的 to 是介词，后接动名词：looking forward to hearing…'
  }
]

export const WRITING_TASK_INDEX: Record<string, number> = Object.fromEntries(
  WRITING_TASKS.map((t, i) => [t.id, i])
)
