import type { SentenceQuest } from '../types'

// 句子拆解 + 翻译题（示例内容）
export const SENTENCE_QUESTS: SentenceQuest[] = [
  {
    id: 'p1',
    type: 'puzzle',
    sentence: 'Students who practice speaking English every day can improve their fluency quickly.',
    segments: [
      { text: 'Students', bucket: 'main' },
      { text: 'who practice speaking English every day', bucket: 'clause' },
      { text: 'can improve their fluency', bucket: 'main' },
      { text: 'quickly', bucket: 'modifier' }
    ]
  },
  {
    id: 'p2',
    type: 'puzzle',
    sentence: 'The book that I borrowed from the library last week is really interesting.',
    segments: [
      { text: 'The book', bucket: 'main' },
      { text: 'that I borrowed', bucket: 'clause' },
      { text: 'from the library', bucket: 'modifier' },
      { text: 'last week', bucket: 'modifier' },
      { text: 'is really interesting', bucket: 'main' }
    ]
  },
  {
    id: 't1',
    type: 'translate',
    sentence: 'Not until the deadline did he finish the report.',
    prompt: '选择最恰当的译文：',
    options: ['直到截止日期他才完成报告。', '他没有在截止日期前完成报告。', '他在截止日期前就完成了报告。', '截止日期一到他就放弃了报告。'],
    answer: 0,
    explain: 'Not until + 倒装结构：直到……才……。'
  },
  {
    id: 't2',
    type: 'translate',
    sentence: 'It is generally believed that reading widely broadens one\'s mind.',
    prompt: '选择最恰当的译文：',
    options: ['人们普遍认为广泛阅读能开阔眼界。', '广泛阅读一般被认为很困难。', '有人认为阅读能改变命运。', '阅读被广泛用来拓展思维训练。'],
    answer: 0,
    explain: 'It is believed that... 表示"人们认为"，broaden one\'s mind 开阔眼界。'
  },
  {
    id: 't3',
    type: 'translate',
    sentence: 'So attractive was the offer that she accepted it immediately.',
    prompt: '选择最恰当的译文：',
    options: ['这个条件如此诱人以至于她立刻接受了。', '这个条件很诱人，但她没有立刻接受。', '她接受了条件，因为条件并不诱人。', '条件太诱人反而让她犹豫不决。'],
    answer: 0,
    explain: 'So...that... 结构倒装，表示"如此……以至于……"。'
  },
  {
    id: 't4',
    type: 'translate',
    sentence: 'Hardly had he arrived when it started to rain.',
    prompt: '选择最恰当的译文：',
    options: ['他一到天就开始下雨了。', '他到达很久后天才下雨。', '他宁愿冒雨也不愿到达。', '雨停后他才到达。'],
    answer: 0,
    explain: 'Hardly...when... 表示"一……就……"，句首倒装。'
  }
]
