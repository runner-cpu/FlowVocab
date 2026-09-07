import type { Word, DifficultyLevel } from '../types'

// 四六级高频词 · 示例子集（正式版可接入完整大纲词库）
// 每行: [单词, 音标, 词性, 释义, 英文例句, 中文例句]
type Row = [string, string, string, string, string, string]

const ROWS: Record<DifficultyLevel, Row[]> = {
  0: [
    ['abandon', '/əˈbændən/', 'v.', '放弃；抛弃', 'They had to abandon the plan due to lack of funds.', '由于缺乏资金，他们不得不放弃这个计划。'],
    ['absorb', '/əbˈzɔːb/', 'v.', '吸收；使全神贯注', 'Plants absorb water through their roots.', '植物通过根部吸收水分。'],
    ['academic', '/ˌækəˈdemɪk/', 'adj.', '学术的', 'Academic performance is important for college students.', '学业成绩对大学生很重要。'],
    ['access', '/ˈækses/', 'n.', '通道；使用机会', 'Students have free access to the library.', '学生可以免费使用图书馆。'],
    ['achieve', '/əˈtʃiːv/', 'v.', '实现；达到', 'She worked hard to achieve her goal.', '她努力工作以实现目标。'],
    ['adapt', '/əˈdæpt/', 'v.', '适应；改编', 'It took him a while to adapt to the new environment.', '他花了一段时间才适应新环境。'],
    ['adequate', '/ˈædɪkwət/', 'adj.', '充足的', 'Make sure you get adequate sleep before the exam.', '考试前确保充足的睡眠。'],
    ['adjust', '/əˈdʒʌst/', 'v.', '调整', 'You can adjust the volume of the speaker.', '你可以调节扬声器的音量。'],
    ['admire', '/ədˈmaɪə(r)/', 'v.', '钦佩；欣赏', 'I admire her courage and determination.', '我钦佩她的勇气和决心。'],
    ['adopt', '/əˈdɒpt/', 'v.', '采纳；收养', 'The company decided to adopt a new strategy.', '公司决定采纳新策略。'],
    ['advocate', '/ˈædvəkeɪt/', 'v.', '提倡', 'Many experts advocate a balanced diet.', '许多专家提倡均衡饮食。'],
    ['affect', '/əˈfekt/', 'v.', '影响', 'The weather can affect your mood.', '天气会影响你的心情。'],
    ['afford', '/əˈfɔːd/', 'v.', '负担得起', "We can't afford to waste time.", '我们浪费不起时间。'],
    ['aggressive', '/əˈɡresɪv/', 'adj.', '好斗的；进取的', 'He has an aggressive approach to sales.', '他采取积极进取的销售方式。'],
    ['ancient', '/ˈeɪnʃənt/', 'adj.', '古老的', 'The ancient city attracts many tourists.', '这座古城吸引了许多游客。'],
    ['anxious', '/ˈæŋkʃəs/', 'adj.', '焦虑的', 'She felt anxious about the interview.', '她对面试感到焦虑。'],
    ['apologize', '/əˈpɒlədʒaɪz/', 'v.', '道歉', 'You should apologize for being late.', '你应该为迟到道歉。'],
    ['apparent', '/əˈpærənt/', 'adj.', '明显的', 'It was apparent that he was tired.', '很明显他累了。'],
    ['appeal', '/əˈpiːl/', 'v./n.', '吸引；呼吁', 'The idea appeals to young people.', '这个想法很吸引年轻人。'],
    ['apply', '/əˈplaɪ/', 'v.', '申请；应用', 'She applied for a scholarship.', '她申请了奖学金。'],
    ['appoint', '/əˈpɔɪnt/', 'v.', '任命', 'They appointed him as the new manager.', '他们任命他为新经理。'],
    ['appreciate', '/əˈpriːʃieɪt/', 'v.', '感激；欣赏', 'I really appreciate your help.', '我非常感激你的帮助。'],
    ['approach', '/əˈprəʊtʃ/', 'v./n.', '接近；方法', 'We need a new approach to this problem.', '我们需要解决这个问题的新方法。'],
    ['appropriate', '/əˈprəʊpriət/', 'adj.', '适当的', 'Please wear appropriate clothes for the ceremony.', '请穿适合仪式的服装。'],
    ['approve', '/əˈpruːv/', 'v.', '批准；赞成', 'The board approved the new budget.', '董事会批准了新预算。'],
    ['arise', '/əˈraɪz/', 'v.', '出现；产生', 'Problems may arise during the process.', '过程中可能出现问题。'],
    ['arrange', '/əˈreɪndʒ/', 'v.', '安排', 'Let me arrange a meeting for us.', '让我为我们安排一次会议。'],
    ['artificial', '/ˌɑːtɪˈfɪʃl/', 'adj.', '人造的', 'Artificial intelligence is changing our lives.', '人工智能正在改变我们的生活。'],
    ['assess', '/əˈses/', 'v.', '评估', "Teachers assess students' progress regularly.", '老师定期评估学生的进步。'],
    ['assume', '/əˈsjuːm/', 'v.', '假定；承担', "Don't assume that everyone agrees with you.", '别假定每个人都同意你。']
  ],
  1: [
    ['attitude', '/ˈætɪtjuːd/', 'n.', '态度', 'A positive attitude helps you succeed.', '积极的态度助你成功。'],
    ['available', '/əˈveɪləbl/', 'adj.', '可获得的', 'The tickets are still available online.', '门票在网上仍可买到。'],
    ['avoid', '/əˈvɔɪd/', 'v.', '避免', 'Try to avoid making the same mistake.', '尽量避免犯同样的错误。'],
    ['barrier', '/ˈbæriə(r)/', 'n.', '障碍', 'Language is often a barrier to communication.', '语言常常是交流的障碍。'],
    ['behave', '/bɪˈheɪv/', 'v.', '表现', 'Children should behave well in public.', '孩子在公共场合应表现良好。'],
    ['benefit', '/ˈbenɪfɪt/', 'n./v.', '益处；受益', 'Regular exercise benefits your health.', '规律锻炼有益健康。'],
    ['budget', '/ˈbʌdʒɪt/', 'n.', '预算', 'We have a limited budget this month.', '我们这个月预算有限。'],
    ['calculate', '/ˈkælkjuleɪt/', 'v.', '计算', 'Calculate the total cost before you decide.', '决定前先计算总成本。'],
    ['campaign', '/kæmˈpeɪn/', 'n.', '运动；活动', 'They launched a campaign to protect the environment.', '他们发起了环保活动。'],
    ['campus', '/ˈkæmpəs/', 'n.', '校园', 'The library is in the center of the campus.', '图书馆在校园中心。'],
    ['capable', '/ˈkeɪpəbl/', 'adj.', '有能力的', 'She is capable of handling this task.', '她有能力处理这项任务。'],
    ['capture', '/ˈkæptʃə(r)/', 'v.', '捕获；捕捉', 'The photo captures the beauty of the sunset.', '这张照片捕捉了日落之美。'],
    ['casual', '/ˈkæʒuəl/', 'adj.', '随便的；偶然的', 'He wore casual clothes to the party.', '他穿便装去参加聚会。'],
    ['caution', '/ˈkɔːʃn/', 'n.', '谨慎', 'Use caution when crossing the road.', '过马路时要小心。'],
    ['cease', '/siːs/', 'v.', '停止', 'The factory ceased production last year.', '这家工厂去年停产了。'],
    ['challenge', '/ˈtʃælɪndʒ/', 'n./v.', '挑战', 'Learning English is a challenge worth taking.', '学英语是值得接受的挑战。'],
    ['characteristic', '/ˌkærəktəˈrɪstɪk/', 'n.', '特征', 'Patience is a characteristic of good teachers.', '耐心是好老师的特征。'],
    ['circumstance', '/ˈsɜːkəmstəns/', 'n.', '环境；情况', 'Under no circumstances should you give up.', '任何情况下都不应放弃。'],
    ['comment', '/ˈkɒment/', 'n./v.', '评论', 'He refused to comment on the matter.', '他拒绝就此事发表评论。'],
    ['commit', '/kəˈmɪt/', 'v.', '承诺；犯（罪）', 'She committed herself to the project.', '她全身心投入这个项目。'],
    ['community', '/kəˈmjuːnəti/', 'n.', '社区', 'The whole community joined the cleanup.', '整个社区都参加了大扫除。'],
    ['complex', '/ˈkɒmpleks/', 'adj.', '复杂的', 'This is a complex problem with no easy answer.', '这是一个没有简单答案的复杂问题。'],
    ['concentrate', '/ˈkɒnsntreɪt/', 'v.', '集中', "I can't concentrate with all this noise.", '这么吵我无法集中注意力。'],
    ['concept', '/ˈkɒnsept/', 'n.', '概念', 'The concept of time is hard to explain.', '时间的概念很难解释。'],
    ['concern', '/kənˈsɜːn/', 'n./v.', '关心；担忧', 'There is growing concern about air pollution.', '人们对空气污染越来越担忧。'],
    ['conclude', '/kənˈkluːd/', 'v.', '得出结论', 'We can conclude that the experiment succeeded.', '我们可以得出结论：实验成功了。'],
    ['conduct', '/kənˈdʌkt/', 'v.', '进行；指挥', 'The survey was conducted nationwide.', '这项调查在全国范围内进行。'],
    ['confident', '/ˈkɒnfɪdənt/', 'adj.', '自信的', 'Be confident when you speak English.', '说英语时要自信。'],
    ['conflict', '/ˈkɒnflɪkt/', 'n.', '冲突', 'The two sides failed to resolve the conflict.', '双方未能解决冲突。'],
    ['consequence', '/ˈkɒnsɪkwəns/', 'n.', '后果', 'Think about the consequences before you act.', '行动前想想后果。']
  ],
  2: [
    ['considerable', '/kənˈsɪdərəbl/', 'adj.', '相当大的', 'The project requires considerable investment.', '该项目需要大量投资。'],
    ['consistent', '/kənˈsɪstənt/', 'adj.', '一致的', 'His story is consistent with the facts.', '他的说法与事实一致。'],
    ['constant', '/ˈkɒnstənt/', 'adj.', '持续不断的', 'The machine requires constant maintenance.', '这台机器需要持续维护。'],
    ['construct', '/kənˈstrʌkt/', 'v.', '建造', 'The bridge was constructed in 2010.', '这座桥建于2010年。'],
    ['consume', '/kənˈsjuːm/', 'v.', '消耗', 'Cars consume a lot of fuel.', '汽车消耗大量燃料。'],
    ['contemporary', '/kənˈtemprəri/', 'adj.', '当代的', 'She studies contemporary Chinese literature.', '她研究当代中国文学。'],
    ['contribute', '/kənˈtrɪbjuːt/', 'v.', '贡献；促成', 'Exercise contributes to good health.', '锻炼有助于健康。'],
    ['controversial', '/ˌkɒntrəˈvɜːʃl/', 'adj.', '有争议的', 'The policy remains controversial.', '这项政策仍有争议。'],
    ['convince', '/kənˈvɪns/', 'v.', '说服', 'He convinced me to join the team.', '他说服我加入团队。'],
    ['cooperate', '/kəʊˈɒpəreɪt/', 'v.', '合作', 'The two companies agreed to cooperate.', '两家公司同意合作。'],
    ['crucial', '/ˈkruːʃl/', 'adj.', '至关重要的', 'Timing is crucial in this negotiation.', '时机在这次谈判中至关重要。'],
    ['cultivate', '/ˈkʌltɪveɪt/', 'v.', '培养；耕作', 'Reading helps cultivate critical thinking.', '阅读有助于培养批判性思维。'],
    ['currency', '/ˈkʌrənsi/', 'n.', '货币', 'The euro is the common currency there.', '欧元是那里通用的货币。'],
    ['decline', '/dɪˈklaɪn/', 'v./n.', '下降；拒绝', 'Sales declined sharply last quarter.', '上季度销售急剧下降。'],
    ['dedicate', '/ˈdedɪkeɪt/', 'v.', '奉献', 'She dedicated her life to education.', '她把一生奉献给教育。'],
    ['define', '/dɪˈfaɪn/', 'v.', '定义', 'How do you define success?', '你如何定义成功？'],
    ['demonstrate', '/ˈdemənstreɪt/', 'v.', '证明；演示', 'The study demonstrates a clear link.', '这项研究证明了明确的联系。'],
    ['deny', '/dɪˈnaɪ/', 'v.', '否认', 'He denied breaking the window.', '他否认打破了窗户。'],
    ['depend', '/dɪˈpend/', 'v.', '依赖', 'Success depends on hard work.', '成功取决于努力。'],
    ['derive', '/dɪˈraɪv/', 'v.', '源于', 'Many English words derive from Latin.', '许多英语单词源于拉丁语。'],
    ['deserve', '/dɪˈzɜːv/', 'v.', '值得', 'You deserve a rest after all that work.', '干了那么多活，你该休息一下。'],
    ['determine', '/dɪˈtɜːmɪn/', 'v.', '决定；查明', 'Your attitude determines your altitude.', '态度决定高度。'],
    ['device', '/dɪˈvaɪs/', 'n.', '设备', 'This device can measure air quality.', '这个设备可以测量空气质量。'],
    ['diminish', '/dɪˈmɪnɪʃ/', 'v.', '减少', 'His influence has diminished over time.', '他的影响力随时间减弱。'],
    ['distinguish', '/dɪˈstɪŋɡwɪʃ/', 'v.', '区分', "It's hard to distinguish the twins.", '很难区分这对双胞胎。'],
    ['diverse', '/daɪˈvɜːs/', 'adj.', '多样的', 'The city has a diverse population.', '这座城市人口多元。'],
    ['dominate', '/ˈdɒmɪneɪt/', 'v.', '主导', 'The company dominates the local market.', '这家公司主导本地市场。'],
    ['dramatic', '/drəˈmætɪk/', 'adj.', '戏剧性的；显著的', 'There was a dramatic increase in sales.', '销售额显著增长。'],
    ['economy', '/ɪˈkɒnəmi/', 'n.', '经济', 'The economy is growing steadily.', '经济稳步增长。'],
    ['eliminate', '/ɪˈlɪmɪneɪt/', 'v.', '消除', 'We must eliminate waste in production.', '我们必须消除生产中的浪费。']
  ],
  3: [
    ['emerge', '/ɪˈmɜːdʒ/', 'v.', '出现', 'New evidence emerged during the trial.', '审判期间出现了新证据。'],
    ['emphasize', '/ˈemfəsaɪz/', 'v.', '强调', 'The teacher emphasized the importance of practice.', '老师强调练习的重要性。'],
    ['enable', '/ɪˈneɪbl/', 'v.', '使能够', 'Technology enables us to work remotely.', '技术使我们能够远程工作。'],
    ['encounter', '/ɪnˈkaʊntə(r)/', 'v.', '遭遇', 'You may encounter difficulties at first.', '一开始你可能会遇到困难。'],
    ['enhance', '/ɪnˈhɑːns/', 'v.', '提高', 'Regular reading enhances vocabulary.', '经常阅读能扩大词汇量。'],
    ['ensure', '/ɪnˈʃʊə(r)/', 'v.', '确保', 'Please ensure all windows are closed.', '请确保所有窗户都关好。'],
    ['enterprise', '/ˈentəpraɪz/', 'n.', '企业；事业', 'He runs a small enterprise.', '他经营一家小企业。'],
    ['equivalent', '/ɪˈkwɪvələnt/', 'adj.', '等同的', 'One dollar is equivalent to about seven yuan.', '一美元约等于七元人民币。'],
    ['essential', '/ɪˈsenʃl/', 'adj.', '必不可少的', 'Water is essential for life.', '水是生命所必需的。'],
    ['evaluate', '/ɪˈvæljueɪt/', 'v.', '评价', 'We need to evaluate the results carefully.', '我们需要仔细评估结果。'],
    ['evident', '/ˈevɪdənt/', 'adj.', '明显的', 'It was evident that she was upset.', '显然她很不高兴。'],
    ['evolve', '/ɪˈvɒlv/', 'v.', '进化；演变', 'The company evolved from a small shop.', '这家公司从小店发展而来。'],
    ['exceed', '/ɪkˈsiːd/', 'v.', '超过', 'Do not exceed the speed limit.', '不要超速。'],
    ['exclude', '/ɪkˈskluːd/', 'v.', '排除', 'The price excludes delivery.', '价格不含运费。'],
    ['exhibit', '/ɪɡˈzɪbɪt/', 'v./n.', '展出；展品', 'The museum exhibits ancient artifacts.', '博物馆展出古代文物。'],
    ['expand', '/ɪkˈspænd/', 'v.', '扩大', 'The company plans to expand overseas.', '公司计划向海外扩张。'],
    ['exploit', '/ɪkˈsplɔɪt/', 'v.', '开发；利用', 'We should exploit solar energy fully.', '我们应充分利用太阳能。'],
    ['explore', '/ɪkˈsplɔː(r)/', 'v.', '探索', 'Scientists explore the depths of the ocean.', '科学家探索海洋深处。'],
    ['extensive', '/ɪkˈstensɪv/', 'adj.', '广泛的', 'The storm caused extensive damage.', '风暴造成大面积破坏。'],
    ['external', '/ɪkˈstɜːnl/', 'adj.', '外部的', 'The external walls need painting.', '外墙需要粉刷。'],
    ['facilitate', '/fəˈsɪlɪteɪt/', 'v.', '促进', 'The new system facilitates data sharing.', '新系统促进数据共享。'],
    ['feasible', '/ˈfiːzəbl/', 'adj.', '可行的', 'Is it feasible to finish within a week?', '一周内完成可行吗？'],
    ['focus', '/ˈfəʊkəs/', 'v./n.', '集中；焦点', 'Focus on your own progress.', '专注于你自己的进步。'],
    ['fundamental', '/ˌfʌndəˈmentl/', 'adj.', '基本的', 'Reading is a fundamental skill.', '阅读是一项基本技能。'],
    ['generate', '/ˈdʒenəreɪt/', 'v.', '产生', 'Wind farms generate clean electricity.', '风力发电场产生清洁电力。'],
    ['genuine', '/ˈdʒenjuɪn/', 'adj.', '真正的', 'She showed genuine interest in art.', '她对艺术表现出真正的兴趣。'],
    ['gradual', '/ˈɡrædʒuəl/', 'adj.', '逐渐的', 'There has been a gradual improvement.', '情况在逐渐改善。'],
    ['highlight', '/ˈhaɪlaɪt/', 'v.', '突出', 'The report highlights key trends.', '报告突出了主要趋势。'],
    ['hypothesis', '/haɪˈpɒθəsɪs/', 'n.', '假设', 'The experiment tested the hypothesis.', '实验检验了这一假设。'],
    ['identical', '/aɪˈdentɪkl/', 'adj.', '完全相同的', 'The two products are almost identical.', '这两种产品几乎完全相同。']
  ],
  4: [
    ['illustrate', '/ˈɪləstreɪt/', 'v.', '说明；举例', 'This chart illustrates the trend clearly.', '这张图表清楚地说明了趋势。'],
    ['impact', '/ˈɪmpækt/', 'n./v.', '影响', 'The policy had a huge impact on prices.', '这项政策对价格产生了巨大影响。'],
    ['implement', '/ˈɪmplɪment/', 'v.', '实施', 'The plan will be implemented next month.', '该计划将于下月实施。'],
    ['imply', '/ɪmˈplaɪ/', 'v.', '暗示', 'His silence implied agreement.', '他的沉默暗示同意。'],
    ['impose', '/ɪmˈpəʊz/', 'v.', '强加；征税', 'New taxes were imposed on imports.', '对进口商品征收了新税。'],
    ['incentive', '/ɪnˈsentɪv/', 'n.', '激励', 'Bonuses are a strong incentive for staff.', '奖金对员工是强有力的激励。'],
    ['indicate', '/ˈɪndɪkeɪt/', 'v.', '表明', 'The results indicate a need for change.', '结果表明需要变革。'],
    ['inevitable', '/ɪnˈevɪtəbl/', 'adj.', '不可避免的', 'Change is inevitable in any industry.', '任何行业的变化都不可避免。'],
    ['infer', '/ɪnˈfɜː(r)/', 'v.', '推断', 'We can infer the meaning from context.', '我们可以从上下文推断含义。'],
    ['inherit', '/ɪnˈherɪt/', 'v.', '继承', 'She inherited the house from her uncle.', '她从叔叔那里继承了这栋房子。'],
    ['innovation', '/ˌɪnəˈveɪʃn/', 'n.', '创新', 'Innovation drives economic growth.', '创新推动经济增长。'],
    ['insight', '/ˈɪnsaɪt/', 'n.', '洞察力', 'The book offers deep insight into human nature.', '这本书对人性的洞察很深刻。'],
    ['inspire', '/ɪnˈspaɪə(r)/', 'v.', '激励；启发', 'Her story inspired many students.', '她的故事激励了许多学生。'],
    ['install', '/ɪnˈstɔːl/', 'v.', '安装', 'They installed new software on all computers.', '他们在所有电脑上安装了新软件。'],
    ['integrate', '/ˈɪntɪɡreɪt/', 'v.', '整合', 'The app integrates several learning tools.', '这个应用整合了几种学习工具。'],
    ['intense', '/ɪnˈtens/', 'adj.', '强烈的', 'The competition was intense.', '竞争非常激烈。'],
    ['interpret', '/ɪnˈtɜːprɪt/', 'v.', '解释；口译', 'How do you interpret this poem?', '你如何解读这首诗？'],
    ['intervene', '/ˌɪntəˈviːn/', 'v.', '干预', 'The government intervened to stabilize prices.', '政府出面稳定价格。'],
    ['invest', '/ɪnˈvest/', 'v.', '投资', 'They invested heavily in research.', '他们在研究上投入巨资。'],
    ['investigate', '/ɪnˈvestɪɡeɪt/', 'v.', '调查', 'Police are investigating the accident.', '警方正在调查这起事故。'],
    ['involve', '/ɪnˈvɒlv/', 'v.', '涉及；参与', 'The job involves a lot of travel.', '这份工作涉及大量出差。'],
    ['isolate', '/ˈaɪsəleɪt/', 'v.', '隔离', 'Patients were isolated to prevent spread.', '病人被隔离以防止传播。'],
    ['justify', '/ˈdʒʌstɪfaɪ/', 'v.', '证明…正当', 'Nothing can justify such behavior.', '没有任何理由可以为这种行为开脱。'],
    ['maintain', '/meɪnˈteɪn/', 'v.', '维持；维护', "It's important to maintain a healthy lifestyle.", '保持健康的生活方式很重要。'],
    ['manipulate', '/məˈnɪpjuleɪt/', 'v.', '操纵', 'He tried to manipulate the data.', '他试图操纵数据。'],
    ['mechanism', '/ˈmekənɪzəm/', 'n.', '机制', 'The body has a natural healing mechanism.', '人体有自然的愈合机制。'],
    ['motivate', '/ˈməʊtɪveɪt/', 'v.', '激励', 'Good teachers motivate their students.', '好老师会激励学生。'],
    ['negotiate', '/nɪˈɡəʊʃieɪt/', 'v.', '谈判', 'The two sides are negotiating a trade deal.', '双方正在谈判一项贸易协议。'],
    ['perception', '/pəˈsepʃn/', 'n.', '感知；看法', 'Public perception of the brand improved.', '公众对该品牌的看法有所改善。'],
    ['persist', '/pəˈsɪst/', 'v.', '坚持；持续', 'If the problem persists, call us.', '如果问题持续存在，请给我们打电话。']
  ]
}

const LEVEL_ORDER: DifficultyLevel[] = [0, 1, 2, 3, 4]

export const WORDS: Word[] = LEVEL_ORDER.flatMap((level) =>
  ROWS[level].map((r, i) => ({
    id: `w${level}-${i}`,
    word: r[0],
    phonetic: r[1],
    pos: r[2],
    meaning: r[3],
    example: r[4],
    exampleCn: r[5],
    level
  }))
)

export const WORDS_BY_LEVEL: Record<DifficultyLevel, Word[]> = {
  0: WORDS.filter((w) => w.level === 0),
  1: WORDS.filter((w) => w.level === 1),
  2: WORDS.filter((w) => w.level === 2),
  3: WORDS.filter((w) => w.level === 3),
  4: WORDS.filter((w) => w.level === 4)
}

// 每题干扰释义（用于词汇四选一）
export function buildVocabOptions(correct: Word): { text: string; correct: boolean }[] {
  const pool = new Set<string>()
  pool.add(correct.meaning)
  // 从同档或其他档收集 3 个干扰释义
  const others = WORDS.filter((w) => w.id !== correct.id)
  for (const w of others) {
    if (pool.size >= 4) break
    pool.add(w.meaning)
  }
  const arr = [...pool]
  // 打乱
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.map((t) => ({ text: t, correct: t === correct.meaning }))
}
