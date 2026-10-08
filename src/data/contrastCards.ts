/**
 * 形近 / 易混词对比卡（离线手工整理，面向 CET-4/6）
 *
 * 每张卡聚焦一组"长得像或意思容易串"的词，给出音标、中文释义、词性，
 * 一句点明区别的提示，以及一组把两个词放进同一语境的例句。
 * 数据完全离线：不请求网络、不依赖运行时，可被引擎与组件直接引用。
 */

export interface ContrastWord {
  word: string
  /** 音标，采用 ASCII 友好写法，可直接朗读展示。 */
  phonetic: string
  meaning: string
  pos: string
}

export interface ContrastCard {
  id: string
  words: ContrastWord[]
  /** 一句话说明区分规则（10–120 字符，且必须出现卡中至少一个词）。 */
  tip: string
  exampleEn: string
  exampleCn: string
}

export const CONTRAST_CARDS: ContrastCard[] = [
  {
    id: 'cc-affect-effect',
    words: [
      { word: 'affect', phonetic: "/əˈfekt/", meaning: '影响；作用于（动词）', pos: 'v.' },
      { word: 'effect', phonetic: "/ɪˈfekt/", meaning: '效果；影响（名词）', pos: 'n.' }
    ],
    tip: 'affect 是动词"影响"，effect 是名词"效果"：a 开头先做动作，e 开头常是结果。',
    exampleEn: 'Noise can affect your sleep, and poor sleep has a bad effect on memory.',
    exampleCn: '噪音会影响睡眠，而睡眠不足又会对记忆产生不良影响。'
  },
  {
    id: 'cc-adapt-adopt-adept',
    words: [
      { word: 'adapt', phonetic: "/əˈdæpt/", meaning: '适应；改编', pos: 'v.' },
      { word: 'adopt', phonetic: "/əˈdɒpt/", meaning: '采纳；收养', pos: 'v.' },
      { word: 'adept', phonetic: "/əˈdept/", meaning: '熟练的；行家', pos: 'adj./n.' }
    ],
    tip: 'adapt 含 dapt 表示适应，adopt 含 opt 表示选择采纳，adept 含 ept 表示熟练内行。',
    exampleEn: 'She adapted to the new job, adopted a fresh method, and became adept at data work.',
    exampleCn: '她适应了新工作，采纳了新方法，并变得擅长数据处理。'
  },
  {
    id: 'cc-principle-principal',
    words: [
      { word: 'principle', phonetic: "/ˈprɪnsəpl/", meaning: '原则；原理', pos: 'n.' },
      { word: 'principal', phonetic: "/ˈprɪnsəpl/", meaning: '校长；主要的', pos: 'n./adj.' }
    ],
    tip: 'principle 结尾 -ple 提示规则原则，principal 结尾 -pal 提示校长与首要。',
    exampleEn: 'The principal explained the school principle of honesty to the students.',
    exampleCn: '校长向学生解释了学校诚实的原则。'
  },
  {
    id: 'cc-desert-dessert',
    words: [
      { word: 'desert', phonetic: "/ˈdezət/", meaning: '沙漠；抛弃', pos: 'n./v.' },
      { word: 'dessert', phonetic: "/dɪˈzɜːt/", meaning: '甜点', pos: 'n.' }
    ],
    tip: 'dessert 双写 s 像甜品要多加一份糖，desert 单写 s 表示沙漠或抛弃。',
    exampleEn: 'After dinner at the desert camp, they shared a sweet dessert.',
    exampleCn: '在沙漠营地用完晚餐后，他们分享了一份甜甜的甜点。'
  },
  {
    id: 'cc-complement-compliment',
    words: [
      { word: 'complement', phonetic: "/ˈkɒmplɪment/", meaning: '补充；补足物', pos: 'v./n.' },
      { word: 'compliment', phonetic: "/ˈkɒmplɪment/", meaning: '赞美；称赞', pos: 'n./v.' }
    ],
    tip: 'complement 的 e 联想 complete 补足，compliment 的 i 联想"我喜欢你"的赞美。',
    exampleEn: 'Her scarf complements the coat, and the teacher gave her a compliment on the color.',
    exampleCn: '她的围巾与外套相互映衬，老师还称赞了这个颜色。'
  },
  {
    id: 'cc-quiet-quite',
    words: [
      { word: 'quiet', phonetic: "/ˈkwaɪət/", meaning: '安静的', pos: 'adj.' },
      { word: 'quite', phonetic: "/kwaɪt/", meaning: '相当；十分', pos: 'adv.' }
    ],
    tip: 'quiet 读两个音节表示安静，quite 一个音节收在 -te，是"相当"的程度副词。',
    exampleEn: 'The library is quite quiet in the morning.',
    exampleCn: '早晨的图书馆相当安静。'
  },
  {
    id: 'cc-through-thorough',
    words: [
      { word: 'through', phonetic: "/θruː/", meaning: '穿过；通过', pos: 'prep.' },
      { word: 'thorough', phonetic: "/ˈθʌrə/", meaning: '彻底的；周密的', pos: 'adj.' }
    ],
    tip: 'through 表示穿行而过，thorough 多出 o+u 表示彻底而周密的。',
    exampleEn: 'A thorough check goes through every line of the report.',
    exampleCn: '一次彻底的检查会看遍报告的每一行。'
  },
  {
    id: 'cc-personal-personnel',
    words: [
      { word: 'personal', phonetic: "/ˈpɜːsənl/", meaning: '个人的；私人的', pos: 'adj.' },
      { word: 'personnel', phonetic: "/ˌpɜːsəˈnel/", meaning: '全体人员；人事部门', pos: 'n.' }
    ],
    tip: 'personal 是形容词"个人的"，personnel 双写 n 加 -el 指全体人员或人事。',
    exampleEn: 'The personnel manager asked about my personal plans.',
    exampleCn: '人事经理询问了我的个人计划。'
  },
  {
    id: 'cc-economic-economical',
    words: [
      { word: 'economic', phonetic: "/ˌiːkəˈnɒmɪk/", meaning: '经济（上）的', pos: 'adj.' },
      { word: 'economical', phonetic: "/ˌiːkəˈnɒmɪkl/", meaning: '节约的；经济的', pos: 'adj.' }
    ],
    tip: 'economic 只谈经济领域，economical 表示省钱节约，多出的 -al 是"会过日子"。',
    exampleEn: 'The country reported steady economic growth, and this car is economical on fuel.',
    exampleCn: '该国报告了稳定的经济增长，而这辆车很省油。'
  },
  {
    id: 'cc-sensitive-sensible',
    words: [
      { word: 'sensitive', phonetic: "/ˈsensətɪv/", meaning: '敏感的；灵敏的', pos: 'adj.' },
      { word: 'sensible', phonetic: "/ˈsensəbl/", meaning: '明智的；合情理的', pos: 'adj.' }
    ],
    tip: 'sensitive 含 -tive 描述感觉敏感，sensible 含 -ible 描述判断明智。',
    exampleEn: 'It is sensible to buy a sensitive microphone for recording.',
    exampleCn: '买一个灵敏的麦克风来录音是明智的。'
  },
  {
    id: 'cc-beside-besides',
    words: [
      { word: 'beside', phonetic: "/bɪˈsaɪd/", meaning: '在……旁边', pos: 'prep.' },
      { word: 'besides', phonetic: "/bɪˈsaɪdz/", meaning: '除……之外（还）', pos: 'prep./adv.' }
    ],
    tip: 'beside 只指位置在旁边，besides 多出 s 表示"另外还有"。',
    exampleEn: 'Besides English, she sat beside a Japanese student in class.',
    exampleCn: '除了英语，她在课上还坐在一位日本学生旁边。'
  },
  {
    id: 'cc-rise-raise',
    words: [
      { word: 'rise', phonetic: "/raɪz/", meaning: '上升；升起（不及物）', pos: 'v.' },
      { word: 'raise', phonetic: "/reɪz/", meaning: '提高；举起（及物）', pos: 'v.' }
    ],
    tip: 'rise 自己上升不带宾语，raise 必须带宾语去举起或提高。',
    exampleEn: 'Prices rise every year, so the company has to raise salaries.',
    exampleCn: '物价每年上涨，所以公司不得不提高薪水。'
  },
  {
    id: 'cc-lie-lay',
    words: [
      { word: 'lie', phonetic: "/laɪ/", meaning: '躺；位于（不及物）', pos: 'v.' },
      { word: 'lay', phonetic: "/leɪ/", meaning: '放置；下蛋（及物）', pos: 'v.' }
    ],
    tip: 'lie 自己躺着不带宾语，lay 要放下某物所以必带宾语。',
    exampleEn: 'Do not lay your bag here and lie on the sofa all day.',
    exampleCn: '别把包放在这儿，然后整天躺在沙发上。'
  },
  {
    id: 'cc-borrow-lend',
    words: [
      { word: 'borrow', phonetic: "/ˈbɒrəʊ/", meaning: '借入', pos: 'v.' },
      { word: 'lend', phonetic: "/lend/", meaning: '借出', pos: 'v.' }
    ],
    tip: 'borrow 是往里借入，lend 是往外借出，两者方向刚好相反。',
    exampleEn: 'Could I borrow your notes and lend you my dictionary in return?',
    exampleCn: '我能借你的笔记吗？作为交换我把字典借给你。'
  },
  {
    id: 'cc-advice-advise',
    words: [
      { word: 'advice', phonetic: "/ədˈvaɪs/", meaning: '建议（名词）', pos: 'n.' },
      { word: 'advise', phonetic: "/ədˈvaɪz/", meaning: '建议；劝告（动词）', pos: 'v.' }
    ],
    tip: 'advice 是名词用 -ce 收尾，advise 是动词用 -se 收尾。',
    exampleEn: 'My teacher advised me to follow her advice on reading.',
    exampleCn: '老师建议我听从她关于阅读的建议。'
  },
  {
    id: 'cc-weather-whether',
    words: [
      { word: 'weather', phonetic: "/ˈweðə/", meaning: '天气', pos: 'n.' },
      { word: 'whether', phonetic: "/ˈweðə/", meaning: '是否', pos: 'conj.' }
    ],
    tip: 'weather 与天气有关含 ea，whether 与选择有关以 wh- 开头。',
    exampleEn: 'I do not know whether the weather will be fine tomorrow.',
    exampleCn: '我不知道明天天气是否晴好。'
  },
  {
    id: 'cc-stationary-stationery',
    words: [
      { word: 'stationary', phonetic: "/ˈsteɪʃənri/", meaning: '静止的；固定的', pos: 'adj.' },
      { word: 'stationery', phonetic: "/ˈsteɪʃənri/", meaning: '文具', pos: 'n.' }
    ],
    tip: 'stationary 的 a 表示停住不动，stationery 的 e 表示纸笔文具。',
    exampleEn: 'The bus stayed stationary while I bought stationery nearby.',
    exampleCn: '公交车停着没动，我在附近买了文具。'
  },
  {
    id: 'cc-except-expect',
    words: [
      { word: 'except', phonetic: "/ɪkˈsept/", meaning: '除……之外', pos: 'prep.' },
      { word: 'expect', phonetic: "/ɪkˈspekt/", meaning: '期望；预料', pos: 'v.' }
    ],
    tip: 'except 的 -cept 表拿出去除，expect 的 -spect 表向外张望期待。',
    exampleEn: 'Everyone except Tom expects a holiday.',
    exampleCn: '除汤姆外，每个人都期待放假。'
  },
  {
    id: 'cc-access-excess',
    words: [
      { word: 'access', phonetic: "/ˈækses/", meaning: '通道；使用权', pos: 'n.' },
      { word: 'excess', phonetic: "/ɪkˈses/", meaning: '过量；过度的', pos: 'n./adj.' }
    ],
    tip: 'access 双 c 表接近使用，excess 的 ex- 表向外溢出所以是过量。',
    exampleEn: 'Students have free access to the library, but excess noise is not allowed.',
    exampleCn: '学生可以免费使用图书馆，但不允许过度喧哗。'
  },
  {
    id: 'cc-cite-site-sight',
    words: [
      { word: 'cite', phonetic: "/saɪt/", meaning: '引用；引证', pos: 'v.' },
      { word: 'site', phonetic: "/saɪt/", meaning: '地点；网站', pos: 'n.' },
      { word: 'sight', phonetic: "/saɪt/", meaning: '视力；景象', pos: 'n.' }
    ],
    tip: 'cite 含 c 表引用，site 含 e 表地点场所，sight 含 gh 与视觉有关。',
    exampleEn: 'The report cited data from the site, and the view was a beautiful sight.',
    exampleCn: '报告引用了该网站的数据，眼前景象十分美丽。'
  },
  {
    id: 'cc-moral-morale',
    words: [
      { word: 'moral', phonetic: "/ˈmɒrəl/", meaning: '道德的；寓意', pos: 'adj./n.' },
      { word: 'morale', phonetic: "/məˈrɑːl/", meaning: '士气；斗志', pos: 'n.' }
    ],
    tip: 'moral 重音在前表道德寓意，morale 重音在后表团队士气。',
    exampleEn: 'The team kept high morale and discussed the moral of the story.',
    exampleCn: '球队保持着高昂的士气，并讨论了故事的寓意。'
  },
  {
    id: 'cc-historic-historical',
    words: [
      { word: 'historic', phonetic: "/hɪˈstɒrɪk/", meaning: '有历史意义的', pos: 'adj.' },
      { word: 'historical', phonetic: "/hɪˈstɒrɪkl/", meaning: '历史上的；史实的', pos: 'adj.' }
    ],
    tip: 'historic 指具有里程碑意义，historical 只表示属于历史或与史实有关。',
    exampleEn: 'The historic speech is now studied in historical research.',
    exampleCn: '那篇具有历史意义的演讲如今被纳入历史研究。'
  },
  {
    id: 'cc-imaginary-imaginative',
    words: [
      { word: 'imaginary', phonetic: "/ɪˈmædʒɪnəri/", meaning: '虚构的；想象中的', pos: 'adj.' },
      { word: 'imaginative', phonetic: "/ɪˈmædʒɪnətɪv/", meaning: '富有想象力的', pos: 'adj.' }
    ],
    tip: 'imaginary 表示只存在于想象中，imaginative 表示人善于想象。',
    exampleEn: 'The imaginative child invented an imaginary friend.',
    exampleCn: '那个想象力丰富的孩子虚构了一个想象中的朋友。'
  },
  {
    id: 'cc-industrial-industrious',
    words: [
      { word: 'industrial', phonetic: "/ɪnˈdʌstriəl/", meaning: '工业的', pos: 'adj.' },
      { word: 'industrious', phonetic: "/ɪnˈdʌstriəs/", meaning: '勤奋的', pos: 'adj.' }
    ],
    tip: 'industrial 与工业部门有关，industrious 专门形容人勤勉努力。',
    exampleEn: 'The industrious engineer works in an industrial city.',
    exampleCn: '这位勤奋的工程师在一座工业城市工作。'
  },
  {
    id: 'cc-respectful-respective',
    words: [
      { word: 'respectful', phonetic: "/rɪˈspektfl/", meaning: '恭敬的；有礼貌的', pos: 'adj.' },
      { word: 'respective', phonetic: "/rɪˈspektɪv/", meaning: '各自的', pos: 'adj.' }
    ],
    tip: 'respectful 含 -ful 表充满敬意，respective 含 -ive 表各自的。',
    exampleEn: 'The two respectful students returned to their respective seats.',
    exampleCn: '两位彬彬有礼的学生回到了各自的座位。'
  },
  {
    id: 'cc-credible-credulous',
    words: [
      { word: 'credible', phonetic: "/ˈkredəbl/", meaning: '可信的', pos: 'adj.' },
      { word: 'credulous', phonetic: "/ˈkredjələs/", meaning: '轻信的', pos: 'adj.' }
    ],
    tip: 'credible 指内容可信，credulous 指人容易轻信。',
    exampleEn: 'The story sounds credible, but only a credulous reader believes it at once.',
    exampleCn: '这个故事听起来可信，但只有轻信的读者才会立刻相信。'
  },
  {
    id: 'cc-later-latter',
    words: [
      { word: 'later', phonetic: "/ˈleɪtə/", meaning: '后来；较晚的', pos: 'adv./adj.' },
      { word: 'latter', phonetic: "/ˈlætə/", meaning: '后者的', pos: 'adj./n.' }
    ],
    tip: 'later 表时间更晚，latter 指两者中的后者，常与 former 相对。',
    exampleEn: 'Ten years later we finally chose the latter plan.',
    exampleCn: '十年后我们最终选择了后者那个方案。'
  },
  {
    id: 'cc-loose-lose',
    words: [
      { word: 'loose', phonetic: "/luːs/", meaning: '松的；宽松的', pos: 'adj.' },
      { word: 'lose', phonetic: "/luːz/", meaning: '丢失；输掉', pos: 'v.' }
    ],
    tip: 'loose 双写 o 读清音 s 表松弛，lose 单写 o 读浊音 z 表失去。',
    exampleEn: 'A loose screw can make you lose time.',
    exampleCn: '一颗松动的螺丝可能让你损失时间。'
  },
  {
    id: 'cc-custom-costume',
    words: [
      { word: 'custom', phonetic: "/ˈkʌstəm/", meaning: '习俗；习惯', pos: 'n.' },
      { word: 'costume', phonetic: "/ˈkɒstjuːm/", meaning: '戏服；服装', pos: 'n.' }
    ],
    tip: 'custom 指风俗习惯，costume 多出的 o 与装扮演出有关。',
    exampleEn: 'It is a local custom to wear a traditional costume at the festival.',
    exampleCn: '在节日里穿传统服装是当地习俗。'
  },
  {
    id: 'cc-diary-dairy',
    words: [
      { word: 'diary', phonetic: "/ˈdaɪəri/", meaning: '日记', pos: 'n.' },
      { word: 'dairy', phonetic: "/ˈdeəri/", meaning: '乳制品（的）', pos: 'n./adj.' }
    ],
    tip: 'diary 中间的 i 属于"我"写的日记，dairy 中间的 air 连着奶味。',
    exampleEn: 'She wrote in her diary about working on a dairy farm.',
    exampleCn: '她在日记里写到了在奶牛场工作的经历。'
  },
  {
    id: 'cc-vocation-vacation',
    words: [
      { word: 'vocation', phonetic: "/vəʊˈkeɪʃn/", meaning: '职业；使命', pos: 'n.' },
      { word: 'vacation', phonetic: "/vəˈkeɪʃn/", meaning: '假期', pos: 'n.' }
    ],
    tip: 'vocation 的 o 提示职业使命，vacation 的 a 提示空闲假期。',
    exampleEn: 'I met a teacher who treats teaching as a vocation during my vacation.',
    exampleCn: '假期里我遇到一位把教学当作使命的老师。'
  },
  {
    id: 'cc-emigrate-immigrate',
    words: [
      { word: 'emigrate', phonetic: "/ˈemɪɡreɪt/", meaning: '移居国外（迁出）', pos: 'v.' },
      { word: 'immigrate', phonetic: "/ˈɪmɪɡreɪt/", meaning: '移入；移民入境', pos: 'v.' }
    ],
    tip: 'emigrate 的 e- 表向外迁出，immigrate 的 im- 表向内迁入。',
    exampleEn: 'They emigrated from their hometown and immigrated to Canada.',
    exampleCn: '他们从家乡迁出，移民到了加拿大。'
  },
  {
    id: 'cc-expand-expend',
    words: [
      { word: 'expand', phonetic: "/ɪkˈspænd/", meaning: '扩大；扩张', pos: 'v.' },
      { word: 'expend', phonetic: "/ɪkˈspend/", meaning: '花费；消耗', pos: 'v.' }
    ],
    tip: 'expand 的 a 与空间扩张有关，expend 的 e 与花钱花费有关。',
    exampleEn: 'The firm plans to expand, so it will expend more on research.',
    exampleCn: '公司计划扩张，因此将在研发上花更多钱。'
  },
  {
    id: 'cc-consequent-consecutive',
    words: [
      { word: 'consequent', phonetic: "/ˈkɒnsɪkwənt/", meaning: '随之发生的', pos: 'adj.' },
      { word: 'consecutive', phonetic: "/kənˈsekjətɪv/", meaning: '连续不断的', pos: 'adj.' }
    ],
    tip: 'consequent 表示因果上随之而来，consecutive 表示一个接一个连续不断。',
    exampleEn: 'Three consecutive rainy days caused the consequent delay.',
    exampleCn: '连续三天下雨导致了随之而来的延误。'
  },
  {
    id: 'cc-attain-obtain',
    words: [
      { word: 'attain', phonetic: "/əˈteɪn/", meaning: '达到；实现（目标）', pos: 'v.' },
      { word: 'obtain', phonetic: "/əbˈteɪn/", meaning: '获得；得到', pos: 'v.' }
    ],
    tip: 'attain 多用于达到目标或水平，obtain 多用于得到具体的东西。',
    exampleEn: 'She obtained the data and finally attained her goal.',
    exampleCn: '她获得了数据，并最终实现了目标。'
  },
  {
    id: 'cc-efficient-effective',
    words: [
      { word: 'efficient', phonetic: "/ɪˈfɪʃnt/", meaning: '高效的；效率高的', pos: 'adj.' },
      { word: 'effective', phonetic: "/ɪˈfektɪv/", meaning: '有效的；起作用的', pos: 'adj.' }
    ],
    tip: 'efficient 强调省时省力效率高，effective 强调能达到预期效果。',
    exampleEn: 'This efficient method is also effective for beginners.',
    exampleCn: '这种高效的方法对初学者也很有效。'
  },
  {
    id: 'cc-attitude-altitude',
    words: [
      { word: 'attitude', phonetic: "/ˈætɪtjuːd/", meaning: '态度', pos: 'n.' },
      { word: 'altitude', phonetic: "/ˈæltɪtjuːd/", meaning: '海拔；高度', pos: 'n.' }
    ],
    tip: 'attitude 的 t 与态度有关，altitude 的 l 与高度海拔有关。',
    exampleEn: 'Her positive attitude helped her climb to a high altitude.',
    exampleCn: '她积极的态度帮助她爬上了高海拔。'
  },
  {
    id: 'cc-board-broad',
    words: [
      { word: 'board', phonetic: "/bɔːd/", meaning: '木板；董事会', pos: 'n.' },
      { word: 'broad', phonetic: "/brɔːd/", meaning: '宽阔的', pos: 'adj.' }
    ],
    tip: 'board 写作 b-o-a-r-d 是木板，broad 写作 b-r-o-a-d 是宽阔，r 的位置不同。',
    exampleEn: 'A broad desk made of board stood in the meeting room.',
    exampleCn: '会议室里放着一张用木板做成的宽大桌子。'
  },
  {
    id: 'cc-angel-angle',
    words: [
      { word: 'angel', phonetic: "/ˈeɪndʒl/", meaning: '天使', pos: 'n.' },
      { word: 'angle', phonetic: "/ˈæŋɡl/", meaning: '角度；立场', pos: 'n.' }
    ],
    tip: 'angel 结尾是 -gel 像天使，angle 结尾是 -gle 像角度。',
    exampleEn: 'The photo was taken from a low angle, making the child look like a little angel.',
    exampleCn: '照片从低角度拍摄，让孩子看起来像个小天使。'
  },
  {
    id: 'cc-confirm-conform',
    words: [
      { word: 'confirm', phonetic: "/kənˈfɜːm/", meaning: '确认；证实', pos: 'v.' },
      { word: 'conform', phonetic: "/kənˈfɔːm/", meaning: '遵守；符合', pos: 'v.' }
    ],
    tip: 'confirm 含 firm 表确认坚定，conform 含 form 表按形式遵守。',
    exampleEn: 'Please confirm the date and conform to the safety rules.',
    exampleCn: '请确认日期，并遵守安全规定。'
  },
  {
    id: 'cc-wander-wonder',
    words: [
      { word: 'wander', phonetic: "/ˈwɒndə/", meaning: '漫步；走神', pos: 'v.' },
      { word: 'wonder', phonetic: "/ˈwʌndə/", meaning: '想知道；奇迹', pos: 'v./n.' }
    ],
    tip: 'wander 的 a 表示漫无目的地走，wonder 的 o 表示心里的疑问。',
    exampleEn: 'I wonder why she likes to wander in the old town.',
    exampleCn: '我想知道她为什么喜欢在老城里漫步。'
  },
  {
    id: 'cc-ensure-insure-assure',
    words: [
      { word: 'ensure', phonetic: "/ɪnˈʃʊə/", meaning: '确保；保证（事情）', pos: 'v.' },
      { word: 'insure', phonetic: "/ɪnˈʃʊə/", meaning: '投保；给……保险', pos: 'v.' },
      { word: 'assure', phonetic: "/əˈʃʊə/", meaning: '使确信；向……保证', pos: 'v.' }
    ],
    tip: 'ensure 确保事情发生，insure 给财产投保，assure 向对方保证使其放心。',
    exampleEn: 'We insure the car and assure customers that we ensure safe delivery.',
    exampleCn: '我们为汽车投保，并向顾客保证我们会确保安全交付。'
  },
  {
    id: 'cc-conscious-conscience',
    words: [
      { word: 'conscious', phonetic: "/ˈkɒnʃəs/", meaning: '有意识的；察觉的', pos: 'adj.' },
      { word: 'conscience', phonetic: "/ˈkɒnʃəns/", meaning: '良心；道德心', pos: 'n.' }
    ],
    tip: 'conscious 是形容词"有意识的"，conscience 是名词"良心"，注意词尾 -ous 与 -ence。',
    exampleEn: 'He was conscious of his conscience troubling him.',
    exampleCn: '他意识到自己的良心在不安。'
  },
  {
    id: 'cc-council-counsel',
    words: [
      { word: 'council', phonetic: "/ˈkaʊnsl/", meaning: '委员会；议会', pos: 'n.' },
      { word: 'counsel', phonetic: "/ˈkaʊnsl/", meaning: '建议；劝告', pos: 'n./v.' }
    ],
    tip: 'council 的 c 表示委员会机构，counsel 的 s 表示给建议劝告。',
    exampleEn: 'The city council asked a lawyer for counsel.',
    exampleCn: '市议会向一位律师征求意见。'
  },
  {
    id: 'cc-device-devise',
    words: [
      { word: 'device', phonetic: "/dɪˈvaɪs/", meaning: '装置；设备', pos: 'n.' },
      { word: 'devise', phonetic: "/dɪˈvaɪz/", meaning: '设计；想出', pos: 'v.' }
    ],
    tip: 'device 是名词设备，devise 是动词设计，词尾清音 s 与浊音 z 决定词性。',
    exampleEn: 'They devised a simple device to measure rain.',
    exampleCn: '他们设计了一个简单的装置来测量降雨。'
  },
  {
    id: 'cc-intense-intensive',
    words: [
      { word: 'intense', phonetic: "/ɪnˈtens/", meaning: '强烈的；紧张的', pos: 'adj.' },
      { word: 'intensive', phonetic: "/ɪnˈtensɪv/", meaning: '密集的；集中的', pos: 'adj.' }
    ],
    tip: 'intense 形容感受强烈，intensive 形容短时间高密度地进行。',
    exampleEn: 'The intensive course was intense but useful.',
    exampleCn: '这门密集型课程强度很大，但很有用。'
  },
  {
    id: 'cc-priceless-worthless',
    words: [
      { word: 'priceless', phonetic: "/ˈpraɪsləs/", meaning: '无价的；极珍贵的', pos: 'adj.' },
      { word: 'worthless', phonetic: "/ˈwɜːθləs/", meaning: '毫无价值的', pos: 'adj.' }
    ],
    tip: 'priceless 表示珍贵到无法定价，worthless 表示毫无价值，两个 -less 含义相反。',
    exampleEn: 'The old photo is priceless to the family, though others think it worthless.',
    exampleCn: '这张老照片对全家来说无价，尽管别人觉得它一文不值。'
  },
  {
    id: 'cc-statue-status',
    words: [
      { word: 'statue', phonetic: "/ˈstætʃuː/", meaning: '雕像', pos: 'n.' },
      { word: 'status', phonetic: "/ˈsteɪtəs/", meaning: '地位；状态', pos: 'n.' }
    ],
    tip: 'statue 结尾 -ue 指雕像实体，status 结尾 -us 指身份地位或状态。',
    exampleEn: 'The statue shows a scholar of high status.',
    exampleCn: '这座雕像表现的是一位地位很高的学者。'
  }
]

const WORD_INDEX: Map<string, ContrastCard> = (() => {
  const index = new Map<string, ContrastCard>()
  for (const card of CONTRAST_CARDS) {
    for (const entry of card.words) {
      const key = entry.word.trim().toLowerCase()
      if (key && !index.has(key)) index.set(key, card)
    }
  }
  return index
})()

/**
 * 按单词查找对比卡（大小写不敏感，自动去除首尾空白）。
 * 未命中或入参不是有效字符串时返回 null。
 */
export function findContrastCard(word: string): ContrastCard | null {
  if (typeof word !== 'string') return null
  const key = word.trim().toLowerCase()
  if (!key) return null
  return WORD_INDEX.get(key) ?? null
}
