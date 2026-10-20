/**
 * 故事图书馆的章节场景图。
 *
 * 章节数据（data/reading.ts）只描述剧情，不携带视觉字段；
 * 这里单独维护 id → 素材名的映射，避免内容结构被素材细节污染。
 */
export const READING_ART: Record<string, { stem: string; alt: string }> = {
  ch1: { stem: 'flowvocab-reading-ch1', alt: '夜色中的学校图书馆地下室，书架旁放着一把旧铜钥匙和一张字条' },
  ch2: { stem: 'flowvocab-reading-ch2', alt: '科创展展台，风力涡轮机模型、太阳能板和拿着记录板的评委' },
  ch3: { stem: 'flowvocab-reading-ch3', alt: '夜间灯塔值守室，桌上放着航海日志，窗外是远洋货轮与灯塔光束' }
}

export function readingArtFor(chapterId: string) {
  return READING_ART[chapterId] ?? null
}
