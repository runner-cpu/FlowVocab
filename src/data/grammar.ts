import type { SkillNode } from '../types'

/**
 * 语法技能树：5 大分支 × 3 节点。
 *
 * 出题原则（grammar.test.ts 会强制校验）：
 * 例句只负责讲清规则，题目必须另起炉灶换一句新句子。
 * 早期版本的题目是把例句挖空，学习者照抄上面的例句即可作答，
 * 测到的是「找相同」而不是语法判断，这里全部重写。
 */
export const GRAMMAR_NODES: SkillNode[] = [
  // A 时态语态
  {
    id: 'tense-basic', name: '一般时态', parent: undefined, desc: '一般现在时表示习惯/客观事实；一般过去时表示过去发生的动作。',
    examples: ['My father walks to the office every morning.', 'We visited the science museum last weekend.'],
    quizzes: [
      { prompt: 'Lily ___ her teeth twice a day.', options: ['brush', 'brushes', 'brushed', 'brushing'], answer: 1, explain: 'twice a day 表示日常习惯，用一般现在时；主语 Lily 是第三人称单数，动词加 -es。' },
      { prompt: 'The team ___ the project two weeks ago.', options: ['finish', 'finishes', 'finished', 'finishing'], answer: 2, explain: 'two weeks ago 是明确的过去时间，用一般过去时 finished。' }
    ]
  },
  {
    id: 'tense-perfect', name: '现在完成时', parent: 'tense-basic', desc: 'have/has + 过去分词，强调对现在的影响，常与 since/for/recently 连用。',
    examples: ['She has just finished her homework.', 'They have worked in this city for five years.'],
    quizzes: [
      { prompt: 'The bus ___ yet, so we are still waiting.', options: ['didn\'t leave', 'hasn\'t left', 'isn\'t leaving', 'won\'t leave'], answer: 1, explain: 'yet 表示「到现在为止还」，常与现在完成时连用：hasn\'t left。' },
      { prompt: 'We have known each other ___ primary school.', options: ['since', 'for', 'from', 'during'], answer: 0, explain: 'since 接时间点（primary school），表示从那时一直延续到现在；for 接时间段。' }
    ]
  },
  {
    id: 'tense-passive', name: '被动语态', parent: 'tense-perfect', desc: 'be + 过去分词；强调动作承受者，常省略施动者。',
    examples: ['The new library was opened last month.', 'These cookies are made by my grandmother.'],
    quizzes: [
      { prompt: 'Many trees ___ every spring in this park.', options: ['plant', 'planted', 'are planted', 'are planting'], answer: 2, explain: '树是被栽种的，every spring 用一般现在时被动 are planted。' },
      { prompt: 'The thief ___ by the police last night.', options: ['caught', 'was caught', 'has caught', 'is catching'], answer: 1, explain: '小偷是被抓的，last night 用一般过去时被动 was caught。' }
    ]
  },
  // B 定语从句
  {
    id: 'relative-pronoun', name: '关系代词', parent: undefined, desc: 'who 指人，which/that 指物，在从句中作主语或宾语。',
    examples: ['The girl who won the prize is my classmate.', 'I lost the umbrella which I bought last week.'],
    quizzes: [
      { prompt: 'The doctor ___ treated me was very patient.', options: ['which', 'who', 'whom', 'whose'], answer: 1, explain: '先行词 the doctor 是人，且在从句中作主语，用 who。' },
      { prompt: 'This is the camera ___ my father gave me.', options: ['who', 'whom', 'which', 'where'], answer: 2, explain: '先行词 the camera 是物，用 which（或 that）。' }
    ]
  },
  {
    id: 'relative-adverb', name: '关系副词', parent: 'relative-pronoun', desc: 'where 表地点、when 表时间、why 表原因，在从句中作状语。',
    examples: ['This is the village where my grandparents live.', 'I still remember the morning when the letter arrived.'],
    quizzes: [
      { prompt: 'Do you know the reason ___ she refused the offer?', options: ['where', 'when', 'why', 'which'], answer: 2, explain: '先行词 the reason 表原因，在从句中作原因状语，用 why。' },
      { prompt: 'The café ___ we had lunch yesterday has closed.', options: ['when', 'where', 'which', 'what'], answer: 1, explain: '先行词 the café 表地点，在从句中作地点状语，用 where。' }
    ]
  },
  {
    id: 'relative-nonrestrictive', name: '非限制性定语从句', parent: 'relative-adverb', desc: '用逗号隔开，只作补充说明，不修饰限制先行词，不能用 that 引导。',
    examples: ['Our teacher, who comes from Canada, speaks three languages.', 'The old bridge, which was built in 1900, is still in use.'],
    quizzes: [
      { prompt: 'The novel, ___ was published last year, has sold a million copies.', options: ['that', 'which', 'who', 'when'], answer: 1, explain: '非限制性定语从句指物只能用 which，不能用 that。' },
      { prompt: 'Mr. Lee, ___ teaches us physics, is retiring this summer.', options: ['which', 'that', 'who', 'whom'], answer: 2, explain: '非限制性定语从句先行词是人，且在从句中作主语，用 who。' }
    ]
  },
  // C 名词性从句
  {
    id: 'subject-clause', name: '主语从句', parent: undefined, desc: '从句作主语，常用 whether/what/that 引导，it 作形式主语。',
    examples: ['That she passed the exam surprised everyone.', 'It is not clear whether the match will be cancelled.'],
    quizzes: [
      { prompt: '___ we can finish the task on time depends on the weather.', options: ['That', 'Whether', 'If', 'What'], answer: 1, explain: '主语从句表「是否」，位于句首时用 Whether，不用 If。' },
      { prompt: 'What the students need most ___ more practice.', options: ['are', 'were', 'is', 'be'], answer: 2, explain: 'what 引导的主语从句作主语时，谓语通常用单数 is。' }
    ]
  },
  {
    id: 'object-clause', name: '宾语从句', parent: 'subject-clause', desc: '从句作动词/介词宾语，用陈述语序。',
    examples: ['I wonder whether she will join us tonight.', 'He told me that he had lost his keys.'],
    quizzes: [
      { prompt: 'Could you tell me ___ the nearest bank is?', options: ['where', 'what', 'that', 'whether'], answer: 0, explain: '问地点用 where；宾语从句要用陈述语序「where the nearest bank is」。' },
      { prompt: 'She didn\'t say ___ she would come back.', options: ['that', 'when', 'where', 'what'], answer: 1, explain: '根据语义「什么时候回来」，用 when 引导宾语从句。' }
    ]
  },
  {
    id: 'predicative-clause', name: '表语从句', parent: 'object-clause', desc: '从句作表语，跟在系动词后，说明主语是什么。',
    examples: ['The truth is that nobody was ready for the storm.', 'This is where we first met.'],
    quizzes: [
      { prompt: 'The problem is ___ we don\'t have enough time.', options: ['why', 'because', 'that', 'what'], answer: 2, explain: 'The problem is that... 是表语从句的常用表达，用 that。' },
      { prompt: 'Home is ___ your heart is.', options: ['what', 'which', 'that', 'where'], answer: 3, explain: '表语从句表地点，用 where。' }
    ]
  },
  // D 非谓语动词
  {
    id: 'infinitive', name: '不定式', parent: undefined, desc: 'to do 表目的或将来；It is + adj. + to do 句型。',
    examples: ['She hopes to study abroad next year.', 'It is difficult to learn a language in a month.'],
    quizzes: [
      { prompt: 'He promised ___ me with the report.', options: ['help', 'helping', 'to help', 'helped'], answer: 2, explain: 'promise to do sth. 承诺做某事，用不定式。' },
      { prompt: 'It is necessary ___ the instructions carefully.', options: ['read', 'reading', 'to read', 'reads'], answer: 2, explain: 'It is + adj. + to do 句型，真正的主语是不定式。' }
    ]
  },
  {
    id: 'gerund', name: '动名词', parent: 'infinitive', desc: 'doing 作名词用；enjoy/finish/be good at 后接动名词。',
    examples: ['He keeps asking the same question.', 'Thank you for helping me with the boxes.'],
    quizzes: [
      { prompt: 'Would you mind ___ the window?', options: ['open', 'to open', 'opening', 'opened'], answer: 2, explain: 'mind doing sth. 后接动名词：mind opening。' },
      { prompt: 'They are interested in ___ Chinese history.', options: ['study', 'studying', 'to study', 'studied'], answer: 1, explain: 'be interested in doing sth. 对做某事感兴趣，介词 in 后接动名词。' }
    ]
  },
  {
    id: 'participle', name: '分词', parent: 'gerund', desc: '现在分词表主动/进行，过去分词表被动/完成；作状语或定语。',
    examples: ['Frightened by the noise, the birds flew away.', 'The girl singing on the stage is my sister.'],
    quizzes: [
      { prompt: '___ the news, she burst into tears.', options: ['Hearing', 'Heard', 'To hear', 'Hear'], answer: 0, explain: '她「听到」消息是主动动作，用现在分词 Hearing 作状语。' },
      { prompt: 'The car ___ last week is now being repaired.', options: ['stealing', 'stolen', 'to steal', 'steal'], answer: 1, explain: '汽车是「被偷」的，用过去分词 stolen 作定语。' }
    ]
  },
  // E 虚拟语气
  {
    id: 'subjunctive-present', name: '与现在/将来相反', parent: undefined, desc: 'If + 过去式(be 用 were)，主句用 would/could/should + 动词原形。',
    examples: ['If I had more time, I would learn the piano.', 'If she knew the answer, she would tell us.'],
    quizzes: [
      { prompt: 'If I ___ taller, I could join the basketball team.', options: ['am', 'was', 'were', 'be'], answer: 2, explain: '与现在事实相反，be 动词一律用 were。' },
      { prompt: 'If you ___ harder, you will pass the exam.', options: ['work', 'worked', 'will work', 'working'], answer: 0, explain: '真实条件句：if 从句用一般现在时表将来，主句用 will。' }
    ]
  },
  {
    id: 'subjunctive-past', name: '与过去相反', parent: 'subjunctive-present', desc: 'If + had done，主句用 would/could have done。',
    examples: ['If they had left earlier, they would have caught the train.', 'If she had taken the medicine, she would have felt better.'],
    quizzes: [
      { prompt: 'If we ___ the map, we would not have got lost.', options: ['bring', 'brought', 'had brought', 'have brought'], answer: 2, explain: '与过去事实相反，if 从句用 had done：had brought。' },
      { prompt: 'If he had apologized, she ___ him.', options: ['would forgive', 'would have forgiven', 'forgave', 'will forgive'], answer: 1, explain: '与过去事实相反，主句用 would have done：would have forgiven。' }
    ]
  },
  {
    id: 'subjunctive-implied', name: '含蓄条件句', parent: 'subjunctive-past', desc: '不用 if，用 without/but for/otherwise 等表达假设条件。',
    examples: ['Without your encouragement, I would have quit the team.', 'But for the heavy rain, the game would have continued.'],
    quizzes: [
      { prompt: 'Without electricity, modern cities ___ not function.', options: ['can', 'could', 'will', 'must'], answer: 1, explain: 'without 引出与现在事实相反的假设，谓语用 could + 动词原形。' },
      { prompt: 'But for the doctor\'s quick action, the patient ___ saved.', options: ['would not be', 'would not have been', 'will not be', 'is not'], answer: 1, explain: 'but for 引出与过去事实相反的假设，用 would not have been saved。' }
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
