import type { SkillNode } from '../types'

// 语法技能树：5 大分支 × 3 节点
export const GRAMMAR_NODES: SkillNode[] = [
  // A 时态语态
  {
    id: 'tense-basic', name: '一般时态', parent: undefined, desc: '一般现在时表示习惯/客观事实；一般过去时表示过去发生的动作。',
    examples: ['She goes to school by bike every day.', 'They watched a movie last night.'],
    quizzes: [
      { prompt: 'She ___ to work by bus every day.', options: ['go', 'goes', 'went', 'going'], answer: 1, explain: '一般现在时，主语第三人称单数，动词加 -s。' },
      { prompt: 'They ___ a movie last night.', options: ['watch', 'watches', 'watched', 'watching'], answer: 2, explain: 'last night 表过去，用一般过去时。' }
    ]
  },
  {
    id: 'tense-perfect', name: '现在完成时', parent: 'tense-basic', desc: 'have/has + 过去分词，强调对现在的影响，常与 since/for/recently 连用。',
    examples: ['I have read this book twice already.', 'He has lived here since 2010.'],
    quizzes: [
      { prompt: 'I ___ this book twice already.', options: ['read', 'have read', 'was reading', 'will read'], answer: 1, explain: 'already 提示用现在完成时 have read。' },
      { prompt: 'He has lived here ___ 2010.', options: ['for', 'since', 'at', 'in'], answer: 1, explain: 'since + 时间点（2010），for + 时间段。' }
    ]
  },
  {
    id: 'tense-passive', name: '被动语态', parent: 'tense-perfect', desc: 'be + 过去分词；强调动作承受者，常省略施动者。',
    examples: ['The bridge was built in 2010.', 'English is spoken all over the world.'],
    quizzes: [
      { prompt: 'The bridge ___ in 2010.', options: ['built', 'was built', 'has built', 'is building'], answer: 1, explain: '桥是被建造的，用被动语态 was built。' },
      { prompt: 'English ___ all over the world.', options: ['speaks', 'is spoken', 'speaking', 'spoke'], answer: 1, explain: '英语被说，用被动 is spoken。' }
    ]
  },
  // B 定语从句
  {
    id: 'relative-pronoun', name: '关系代词', parent: undefined, desc: 'who 指人，which/that 指物，在从句中作主语或宾语。',
    examples: ['The man who is talking to Tom is my uncle.', 'This is the book which I told you about.'],
    quizzes: [
      { prompt: 'The man ___ is talking to Tom is my uncle.', options: ['which', 'who', 'whom', 'whose'], answer: 1, explain: '先行词是人且作主语，用 who。' },
      { prompt: 'This is the book ___ I told you about.', options: ['who', 'whom', 'which', 'where'], answer: 2, explain: '先行词是物，用 which/that。' }
    ]
  },
  {
    id: 'relative-adverb', name: '关系副词', parent: 'relative-pronoun', desc: 'where 表地点、when 表时间、why 表原因，在从句中作状语。',
    examples: ['I remember the day when we first met.', 'This is the school where I studied.'],
    quizzes: [
      { prompt: 'I remember the day ___ we first met.', options: ['where', 'when', 'which', 'why'], answer: 1, explain: '先行词 the day 表时间，用 when。' },
      { prompt: 'This is the school ___ I studied.', options: ['when', 'where', 'which', 'that'], answer: 1, explain: '先行词 the school 表地点，用 where。' }
    ]
  },
  {
    id: 'relative-nonrestrictive', name: '非限制性定语从句', parent: 'relative-adverb', desc: '用逗号隔开，只作补充说明，不修饰限制先行词，不能用 that 引导。',
    examples: ['My brother, who lives in Beijing, is a doctor.', 'The meeting, which lasted two hours, was boring.'],
    quizzes: [
      { prompt: 'My brother, ___ lives in Beijing, is a doctor.', options: ['that', 'who', 'whom', 'whose'], answer: 1, explain: '非限制性定语从句中先行词是人，用 who。' },
      { prompt: 'The meeting, ___ lasted two hours, was boring.', options: ['which', 'that', 'who', 'when'], answer: 0, explain: '非限制性定语从句指物只能用 which，不能用 that。' }
    ]
  },
  // C 名词性从句
  {
    id: 'subject-clause', name: '主语从句', parent: undefined, desc: '从句作主语，常用 whether/what/that 引导，it 作形式主语。',
    examples: ['Whether he will come is still uncertain.', 'What matters most is hard work.'],
    quizzes: [
      { prompt: '___ he will come is still uncertain.', options: ['That', 'Whether', 'If', 'What'], answer: 1, explain: '主语从句表"是否"，句首用 Whether 不用 If。' },
      { prompt: 'What matters most ___ hard work.', options: ['are', 'were', 'is', 'be'], answer: 2, explain: '主语从句作主语，谓语用单数 is。' }
    ]
  },
  {
    id: 'object-clause', name: '宾语从句', parent: 'subject-clause', desc: '从句作动词/介词宾语，用陈述语序。',
    examples: ['I don\'t know why he said that.', 'She asked me where I was going.'],
    quizzes: [
      { prompt: 'I don\'t know ___ he said that.', options: ['why', 'where', 'that', 'what'], answer: 0, explain: '根据语义"为什么说"，用 why。' },
      { prompt: 'She asked me ___ I was going.', options: ['that', 'if', 'where', 'what'], answer: 2, explain: '问地点用 where，宾语从句用陈述语序。' }
    ]
  },
  {
    id: 'predicative-clause', name: '表语从句', parent: 'object-clause', desc: '从句作表语，跟在系动词后，说明主语是什么。',
    examples: ['The reason is that he was ill.', 'That\'s what I want to say.'],
    quizzes: [
      { prompt: 'The reason is ___ he was ill.', options: ['why', 'because', 'that', 'what'], answer: 2, explain: 'The reason is that... 是固定搭配，用 that。' },
      { prompt: 'That\'s ___ I want to say.', options: ['what', 'which', 'that', 'who'], answer: 0, explain: '表语从句缺宾语，用 what 引导。' }
    ]
  },
  // D 非谓语动词
  {
    id: 'infinitive', name: '不定式', parent: undefined, desc: 'to do 表目的或将来；It is + adj. + to do 句型。',
    examples: ['It\'s important to practice English every day.', 'He decided to accept the job offer.'],
    quizzes: [
      { prompt: 'It\'s important ___ English every day.', options: ['practice', 'to practice', 'practicing', 'practiced'], answer: 1, explain: 'It is + adj. + to do 句型，用不定式。' },
      { prompt: 'He decided ___ the job offer.', options: ['accept', 'accepting', 'to accept', 'accepted'], answer: 2, explain: 'decide to do sth. 决定做某事。' }
    ]
  },
  {
    id: 'gerund', name: '动名词', parent: 'infinitive', desc: 'doing 作名词用；enjoy/finish/be good at 后接动名词。',
    examples: ['I enjoy listening to English songs.', 'She is good at solving problems.'],
    quizzes: [
      { prompt: 'I enjoy ___ English songs.', options: ['listen', 'to listen', 'listening to', 'listened'], answer: 2, explain: 'enjoy doing sth. 后接动名词。' },
      { prompt: 'She is good at ___ problems.', options: ['solve', 'solving', 'solved', 'to solve'], answer: 1, explain: 'be good at doing sth. 擅长做某事。' }
    ]
  },
  {
    id: 'participle', name: '分词', parent: 'gerund', desc: '现在分词表主动/进行，过去分词表被动/完成；作状语或定语。',
    examples: ['Seen from the hill, the city looks beautiful.', 'The boy reading under the tree is my cousin.'],
    quizzes: [
      { prompt: '___ from the hill, the city looks beautiful.', options: ['Seeing', 'Seen', 'See', 'To see'], answer: 1, explain: '城市是"被看"，用过去分词 Seen 作状语。' },
      { prompt: 'The boy ___ under the tree is my cousin.', options: ['reading', 'read', 'to read', 'is reading'], answer: 0, explain: '现在分词 reading 作定语，表主动进行。' }
    ]
  },
  // E 虚拟语气
  {
    id: 'subjunctive-present', name: '与现在/将来相反', parent: undefined, desc: 'If + 过去式(be 用 were)，主句用 would/could/should + 动词原形。',
    examples: ['If I were you, I would study harder.', 'If it rains tomorrow, we will stay at home.'],
    quizzes: [
      { prompt: 'If I ___ you, I would study harder.', options: ['am', 'was', 'were', 'be'], answer: 2, explain: '与现在事实相反，be 动词一律用 were。' },
      { prompt: 'If it ___ tomorrow, we will stay at home.', options: ['rain', 'rains', 'rained', 'will rain'], answer: 1, explain: '真实条件句用一般现在时表将来，主句 will。' }
    ]
  },
  {
    id: 'subjunctive-past', name: '与过去相反', parent: 'subjunctive-present', desc: 'If + had done，主句用 would/could have done。',
    examples: ['If I had known, I would have come earlier.', 'If he had studied, he would have passed the exam.'],
    quizzes: [
      { prompt: 'If I had known, I ___ earlier.', options: ['would come', 'will come', 'would have come', 'came'], answer: 2, explain: '与过去相反，主句用 would have done。' },
      { prompt: 'If he had studied, he ___ the exam.', options: ['would pass', 'would have passed', 'passed', 'passes'], answer: 1, explain: '与过去相反，主句用 would have passed。' }
    ]
  },
  {
    id: 'subjunctive-implied', name: '含蓄条件句', parent: 'subjunctive-past', desc: '不用 if，用 without/but for/otherwise 等表达假设条件。',
    examples: ['Without water, nothing could live.', 'But for your help, we would not have succeeded.'],
    quizzes: [
      { prompt: 'Without water, nothing ___ live.', options: ['can', 'could', 'will', 'must'], answer: 1, explain: '含蓄条件句表假设，用 could。' },
      { prompt: 'But for your help, we ___ have succeeded.', options: ['would', 'would not', 'will', 'could'], answer: 1, explain: '与过去事实相反的含蓄条件，用 would not have。' }
    ]
  }
]

export const GRAMMAR_BRANCHES = [
  { id: 'tense-basic', name: '时态语态' },
  { id: 'relative-pronoun', name: '定语从句' },
  { id: 'subject-clause', name: '名词性从句' },
  { id: 'infinitive', name: '非谓语动词' },
  { id: 'subjunctive-present', name: '虚拟语气' }
]
