/**
 * 离线语音对话内容：六个学习场景各有一段狐狸引导语与 4-6 道口语题。
 * 纯前端数据，无网络、无模型调用；spoken 即学习者需要说出的英文参考句。
 */

export const DIALOGUE_RULES = ['past-tense', 'plural', 'preposition', 'modal', 'article'] as const

export type DialogueRule = (typeof DIALOGUE_RULES)[number]

export interface DialogueQuestion {
  id: string
  /** 展示给学习者的中文题干 */
  prompt: string
  /** 学习者必须说出的英文句子（参考键，用于 token 高亮与匹配） */
  spoken: string
  /** 2-4 个必须命中的关键词（均出现在 spoken 中） */
  keywords: string[]
  /** 形近/错误形式词，用于规则反馈 */
  distractors: string[]
  /** 语法提示 id */
  rule: DialogueRule
}

export interface DialogueScene {
  id: string
  title: string
  place: string
  /** 狐狸的 TTS 目标句 */
  heroLine: string
  questions: DialogueQuestion[]
}

export const DIALOGUE_SCENES: DialogueScene[] = [
  {
    id: 'harbour-arrival',
    title: '微光港',
    place: '港口',
    heroLine: 'Welcome to the harbour! I am Finn the fox. Ask me about boats, tickets, and the sea.',
    questions: [
      {
        id: 'harbour-arrival-q1',
        prompt: '每天早上八点有两班渡轮离开港口。',
        spoken: 'Two ferries leave the harbour at eight every morning.',
        keywords: ['ferries', 'harbour'],
        distractors: ['ferry', 'left'],
        rule: 'plural'
      },
      {
        id: 'harbour-arrival-q2',
        prompt: '我们今天早上到了港口。',
        spoken: 'We arrived at the harbour this morning.',
        keywords: ['arrived', 'harbour'],
        distractors: ['arrival', 'reached'],
        rule: 'past-tense'
      },
      {
        id: 'harbour-arrival-q3',
        prompt: '船票在我的蓝色背包里。',
        spoken: 'The tickets are in my blue backpack.',
        keywords: ['tickets', 'in'],
        distractors: ['packets', 'pockets'],
        rule: 'preposition'
      },
      {
        id: 'harbour-arrival-q4',
        prompt: '我可以在甲板上要一杯茶吗？',
        spoken: 'Can I have a cup of tea on the deck please?',
        keywords: ['can', 'deck'],
        distractors: ['could', 'dark'],
        rule: 'modal'
      },
      {
        id: 'harbour-arrival-q5',
        prompt: '船中午开往小岛。',
        spoken: 'The boat is going to the island at noon.',
        keywords: ['boat', 'island'],
        distractors: ['board', 'ireland'],
        rule: 'preposition'
      }
    ]
  },
  {
    id: 'grammar-garden',
    title: '语法花园',
    place: '语法栈桥',
    heroLine: 'This garden grows sentences. Tell me what people did, have, and will do.',
    questions: [
      {
        id: 'grammar-garden-q1',
        prompt: '她已经写完作业了。',
        spoken: 'She has finished her homework already.',
        keywords: ['has', 'finished'],
        distractors: ['having', 'finish'],
        rule: 'past-tense'
      },
      {
        id: 'grammar-garden-q2',
        prompt: '孩子们正在花园里玩。',
        spoken: 'The children are playing in the garden.',
        keywords: ['children', 'playing'],
        distractors: ['childs', 'played'],
        rule: 'plural'
      },
      {
        id: 'grammar-garden-q3',
        prompt: '如果下雨，我们就待在屋里。',
        spoken: 'If it rains, we will stay inside.',
        keywords: ['rains', 'will'],
        distractors: ['rained', 'would'],
        rule: 'modal'
      },
      {
        id: 'grammar-garden-q4',
        prompt: '那本书是我老师写的。',
        spoken: 'That is the book my teacher wrote.',
        keywords: ['wrote', 'book'],
        distractors: ['written', 'notebook'],
        rule: 'past-tense'
      },
      {
        id: 'grammar-garden-q5',
        prompt: '你每天应该多喝水。',
        spoken: 'You should drink more water every day.',
        keywords: ['should', 'water'],
        distractors: ['would', 'weather'],
        rule: 'modal'
      }
    ]
  },
  {
    id: 'bridge-workshop',
    title: '桥梁工坊',
    place: '句子市集',
    heroLine: 'Every long sentence is a bridge. Say the missing piece and the bridge will hold.',
    questions: [
      {
        id: 'bridge-workshop-q1',
        prompt: '狐狸跳过那座木桥。',
        spoken: 'The fox jumps over the wooden bridge.',
        keywords: ['fox', 'over'],
        distractors: ['wolf', 'under'],
        rule: 'preposition'
      },
      {
        id: 'bridge-workshop-q2',
        prompt: '她把灯笼放在了桌子上。',
        spoken: 'She put the lantern on the table.',
        keywords: ['lantern', 'on'],
        distractors: ['ladder', 'under'],
        rule: 'preposition'
      },
      {
        id: 'bridge-workshop-q3',
        prompt: '我们会在午饭后过河。',
        spoken: 'We will cross the river after lunch.',
        keywords: ['will', 'after'],
        distractors: ['would', 'before'],
        rule: 'modal'
      },
      {
        id: 'bridge-workshop-q4',
        prompt: '屋顶上有两只鸟。',
        spoken: 'There are two birds on the roof.',
        keywords: ['two', 'birds'],
        distractors: ['third', 'boards'],
        rule: 'plural'
      },
      {
        id: 'bridge-workshop-q5',
        prompt: '那张旧地图在桌子下面。',
        spoken: 'The old map is under the desk.',
        keywords: ['map', 'under'],
        distractors: ['mask', 'over'],
        rule: 'preposition'
      }
    ]
  },
  {
    id: 'radio-station',
    title: '星际电台',
    place: '听力码头',
    heroLine: 'Stay on this channel. Repeat what you hear, and I will tune the signal.',
    questions: [
      {
        id: 'radio-station-q1',
        prompt: '收音机正在播放一首八十年代的歌。',
        spoken: 'The radio plays a song from the eighties.',
        keywords: ['radio', 'song'],
        distractors: ['rodeo', 'sound'],
        rule: 'plural'
      },
      {
        id: 'radio-station-q2',
        prompt: '请把音量调小一点。',
        spoken: 'Please turn down the volume a little.',
        keywords: ['turn', 'down'],
        distractors: ['term', 'up'],
        rule: 'preposition'
      },
      {
        id: 'radio-station-q3',
        prompt: '我们的信号昨晚到达了电台。',
        spoken: 'Our signal reached the station last night.',
        keywords: ['signal', 'station', 'last'],
        distractors: ['single', 'stationary', 'late'],
        rule: 'past-tense'
      },
      {
        id: 'radio-station-q4',
        prompt: '你能再说一遍最后一句吗？',
        spoken: 'Could you repeat the last sentence?',
        keywords: ['could', 'repeat'],
        distractors: ['can', 'remind'],
        rule: 'modal'
      },
      {
        id: 'radio-station-q5',
        prompt: '一位著名歌手明天会来看我们。',
        spoken: 'A famous singer will visit us tomorrow.',
        keywords: ['will', 'singer'],
        distractors: ['would', 'winter'],
        rule: 'modal'
      }
    ]
  },
  {
    id: 'studio',
    title: '灵感工作室',
    place: '写作工坊',
    heroLine: 'Welcome to the studio. Say your line clearly, and we will write it down.',
    questions: [
      {
        id: 'studio-q1',
        prompt: '我写了一个关于我的猫的短故事。',
        spoken: 'I wrote a short story about my cat.',
        keywords: ['wrote', 'story'],
        distractors: ['written', 'history'],
        rule: 'past-tense'
      },
      {
        id: 'studio-q2',
        prompt: '标题应该简短明了。',
        spoken: 'The title should be short and clear.',
        keywords: ['should', 'short'],
        distractors: ['would', 'sharp'],
        rule: 'modal'
      },
      {
        id: 'studio-q3',
        prompt: '这篇作文需要三个段落。',
        spoken: 'We need three paragraphs for this essay.',
        keywords: ['three', 'paragraphs'],
        distractors: ['third', 'trees'],
        rule: 'plural'
      },
      {
        id: 'studio-q4',
        prompt: '请在页面顶端写上你的名字。',
        spoken: 'Please write your name at the top of the page.',
        keywords: ['name', 'at'],
        distractors: ['nap', 'paper'],
        rule: 'preposition'
      },
      {
        id: 'studio-q5',
        prompt: '他正在给他的老师写信。',
        spoken: 'He is writing a letter to his teacher.',
        keywords: ['writing', 'to'],
        distractors: ['writer', 'ladder'],
        rule: 'preposition'
      }
    ]
  },
  {
    id: 'story-library',
    title: '故事图书馆',
    place: '阅读灯塔',
    heroLine: 'These shelves keep every story. Read the clue, then say the line out loud.',
    questions: [
      {
        id: 'story-library-q1',
        prompt: '主人公在书架后面发现了一扇暗门。',
        spoken: 'The hero found a secret door behind the shelf.',
        keywords: ['found', 'secret'],
        distractors: ['find', 'silent'],
        rule: 'past-tense'
      },
      {
        id: 'story-library-q2',
        prompt: '这座图书馆里有很多旧地图。',
        spoken: 'There are many old maps in this library.',
        keywords: ['maps', 'library'],
        distractors: ['marks', 'literacy'],
        rule: 'plural'
      },
      {
        id: 'story-library-q3',
        prompt: '她一个晚上读完了最后一章。',
        spoken: 'She read the last chapter in one evening.',
        keywords: ['chapter', 'evening'],
        distractors: ['capture', 'morning'],
        rule: 'preposition'
      },
      {
        id: 'story-library-q4',
        prompt: '结局很悲伤，但非常美。',
        spoken: 'The ending was sad but very beautiful.',
        keywords: ['was', 'ending'],
        distractors: ['were', 'end'],
        rule: 'past-tense'
      },
      {
        id: 'story-library-q5',
        prompt: '我觉得狐狸会找到钥匙。',
        spoken: 'I think the fox will find the key.',
        keywords: ['will', 'key'],
        distractors: ['would', 'king'],
        rule: 'modal'
      },
      {
        id: 'story-library-q6',
        prompt: '每天晚上，这些老钟都会讲一个故事。',
        spoken: 'The old clocks tell a story every night.',
        keywords: ['clocks', 'story'],
        distractors: ['clerk', 'history'],
        rule: 'plural'
      }
    ]
  }
]
