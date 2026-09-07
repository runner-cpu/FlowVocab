import type { Chapter } from '../types'

// 阅读叙事副本（自编原创故事，含考点题；非真题）
export const CHAPTERS: Chapter[] = [
  {
    id: 'ch1',
    title: '校园谜团',
    intro: '你是大一新生 Alex。深夜在图书馆自习时，地下室传来一阵奇怪的声音……',
    start: 'n0',
    nodes: {
      n0: {
        id: 'n0',
        text: '深夜 11 点，图书馆即将闭馆。你正要离开，却听见地下室传来"咚、咚"的声响。出于好奇，你决定下去看看。',
        choices: [{ label: '走下地下室', next: 'n1' }]
      },
      n1: {
        id: 'n1',
        text: '地下室的门锁着。门下压着一张字条："钥匙在第三层楼。" 旁边还有一道紧锁的铁门。',
        choices: [
          {
            label: '去三楼找钥匙', next: 'n2a',
            quiz: { prompt: '字条让你做什么？', options: ['打开铁门', '去三楼找钥匙', '离开图书馆', '报警'], answer: 1, explain: '字条明确写着"钥匙在第三层楼"，即去三楼找钥匙。' }
          },
          {
            label: '试着撞开铁门', next: 'n2b',
            quiz: { prompt: '单词 "basement" 最可能的意思是？', options: ['地下室', '图书馆', '天花板', '走廊'], answer: 0, explain: 'basement = 地下室，从语境"图书馆下方"可推断。' }
          }
        ]
      },
      n2a: {
        id: 'n2a',
        text: '来到三楼，你在书架上发现一本旧书《校园的秘密》。其中一页被折角，上面写着："钥匙藏在书籍从不入睡的地方。" 你立刻想到——24 小时自习室。',
        choices: [
          {
            label: '去 24 小时自习室', next: 'n3a',
            quiz: { prompt: '钥匙藏在哪里？', options: ['地下室', '24 小时自习室', '字条下面', '三楼书架'], answer: 1, explain: '"书籍从不入睡的地方"即 24 小时自习室。' }
          }
        ]
      },
      n2b: {
        id: 'n2b',
        text: '你用力撞门，铁门纹丝不动。这时你注意到墙上一幅画有些歪斜，画后面藏着一个木盒。',
        choices: [{ label: '打开木盒', next: 'n3b' }]
      },
      n3a: {
        id: 'n3a',
        text: '在自习室的书架下，你找到了一把铜钥匙。回到地下室打开铁门，里面是一封泛黄的信，记录了校园的建校历史。你成了第一个解开这个谜团的学生！',
        choices: [
          {
            label: '完成本章', next: 'end-a',
            quiz: { prompt: '本文的主旨大意是？', options: ['描述一次探索校园秘密的冒险', '介绍图书馆的建造过程', '说明钥匙的用途', '讲述自习室的规则'], answer: 0, explain: '全文围绕"发现秘密→找钥匙→解谜"展开，是一次探索校园秘密的冒险。' }
          }
        ]
      },
      n3b: {
        id: 'n3b',
        text: '木盒里是一张旧照片和一张地图。地图指向 24 小时自习室。你顺着地图找到一把钥匙，谜团就此解开！',
        choices: [{ label: '完成本章', next: 'end-b' }]
      },
      'end-a': { id: 'end-a', text: '🎉 恭喜完成第一章「校园谜团」！你收获了词汇：basement, note, crooked, founding。', choices: [] },
      'end-b': { id: 'end-b', text: '🎉 恭喜完成第一章！你通过观察细节破解了谜题。', choices: [] }
    }
  },
  {
    id: 'ch2',
    title: '科创展风波',
    intro: '学校科创展临近，你的团队正在准备一个关于可再生能源的项目，可风力涡轮机模型突然不转了……',
    start: 'n0',
    nodes: {
      n0: {
        id: 'n0',
        text: '距离科创展还有两个小时。你们的展台前，风力涡轮机模型纹丝不动。队友 Lily 检查了电池，老师提醒你们展示即将开始。',
        choices: [{ label: '检查涡轮机', next: 'n1' }]
      },
      n1: {
        id: 'n1',
        text: '你拆开涡轮机外壳，发现电机连接线松脱了。只要接上，机器就能转。可这时 Lily 说："要不要先给模型加一块太阳能板？这样展示会更有亮点。"',
        choices: [
          {
            label: '先接好电机', next: 'n2a',
            quiz: { prompt: '涡轮机不转的根本原因是什么？', options: ['电机没有接好', '电池没电了', '叶片断裂', '风不够大'], answer: 0, explain: '原文明确：发现电机连接线松脱。' }
          },
          {
            label: '先加太阳能板', next: 'n2b'
          }
        ]
      },
      n2a: {
        id: 'n2a',
        text: '你快速接好电机，涡轮机重新转了起来，还剩不少时间。你决定动手加装太阳能板，让项目更完整。',
        choices: [{ label: '加装太阳能板', next: 'n3a' }]
      },
      n2b: {
        id: 'n2b',
        text: '你正打算加装太阳能板，却发现接线孔已经被占用了。只好先回去接好电机。时间有点紧张了。',
        choices: [
          {
            label: '快速排练展示', next: 'n3b',
            quiz: { prompt: '单词 "polish" 在 "polish the presentation" 中最可能的意思是？', options: ['打磨 / 润色', '抛弃', '修理', '延长'], answer: 0, explain: 'polish the presentation = 润色/完善展示内容。' }
          }
        ]
      },
      n3a: {
        id: 'n3a',
        text: '太阳能板装好了！模型在阳光下发电量更大，评委们对你们的创新赞不绝口。你们的团队一举夺得一等奖！',
        choices: [
          {
            label: '完成本章', next: 'end-a',
            quiz: { prompt: '从本文可以看出，团队获胜的关键是？', options: ['修复问题并主动创新', '运气好', '展示时间长', '评委偏心'], answer: 0, explain: '团队先修好电机解决问题，再主动加装太阳能板创新，因此获胜。' }
          }
        ]
      },
      n3b: {
        id: 'n3b',
        text: '你快速排练了一遍展示，讲解清晰流畅。评委们欣赏你们冷静的现场表现，团队获得了优秀奖。',
        choices: [{ label: '完成本章', next: 'end-b' }]
      },
      'end-a': { id: 'end-a', text: '🎉 恭喜完成第二章「科创展风波」！你收获了词汇：turbine, renewable, innovation, judge。', choices: [] },
      'end-b': { id: 'end-b', text: '🎉 恭喜完成第二章！你学会了冷静应对突发状况。', choices: [] }
    }
  }
]
