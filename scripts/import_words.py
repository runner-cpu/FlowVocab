#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""词库导入脚本：KyleBing/english-vocabulary (CET4/CET6) → 心流词境 Word 格式
数据来源：https://github.com/KyleBing/english-vocabulary
许可证说明：该仓库未明确标注开源许可证，本数据仅用于学习/开发验证；
正式上线前请替换为 ECDICT(MIT) 或自建数据。
"""
import json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # 项目根
SRC = os.path.join(ROOT, 'data-src')
OUT = os.path.join(ROOT, 'public', 'data', 'words.json')

def pos_of(translations):
    """词性：类型去重拼接，如 ['v'] -> 'v.'、['n','v'] -> 'n./v.'"""
    types = []
    for t in translations:
        tp = (t.get('type') or '').strip().lower()
        if tp and tp not in types:
            types.append(tp)
    if not types:
        return ''
    return '/'.join(types) + ('.' if len(types) == 1 else '.')

def meaning_of(translations):
    return '；'.join(t.get('translation', '').strip() for t in translations if t.get('translation'))

def build_words():
    words = []
    def make_word(i, w, src, lv):
        item = {
            'id': f"{src}-{i:06d}",
            'word': w['word'],
            'meaning': meaning_of(w.get('translations', [])),
            'level': lv,
            'pos': pos_of(w.get('translations', [])),
            'source': src,
        }
        # 空字段省略，前端导入时补默认值（瘦身）
        phrases = [{'phrase': p.get('phrase', ''), 'translation': p.get('translation', '')}
                   for p in w.get('phrases', []) if p.get('phrase')]
        if phrases:
            item['phrases'] = phrases
        return item
    # CET4 -> level 0/1（前50% / 后50%）
    with open(os.path.join(SRC, 'cet4.json'), encoding='utf-8') as f:
        cet4 = json.load(f)
    half = len(cet4) // 2
    for i, w in enumerate(cet4):
        words.append(make_word(i, w, 'cet4', 0 if i < half else 1))
    # CET6 -> level 2/3/4（三等分）
    with open(os.path.join(SRC, 'cet6.json'), encoding='utf-8') as f:
        cet6 = json.load(f)
    n = len(cet6)
    s1, s2 = n // 3, n * 2 // 3
    for i, w in enumerate(cet6):
        lv = 2 if i < s1 else (3 if i < s2 else 4)
        words.append(make_word(i, w, 'cet6', lv))
    return words, len(cet4), len(cet6)

def main():
    words, c4, c6 = build_words()
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(words, f, ensure_ascii=False, separators=(',', ':'))
    size_kb = os.path.getsize(OUT) / 1024
    # 统计
    from collections import Counter
    lv = Counter(w['level'] for w in words)
    pos = Counter(w['pos'] for w in words)
    print(f"CET4 词条: {c4} / CET6 词条: {c6} / 合计: {len(words)}")
    print(f"输出: {OUT} ({size_kb:.0f} KB)")
    print("level 分布:", dict(sorted(lv.items())))
    print("词性分布(Top10):", pos.most_common(10))
    # 空释义检查
    empty = [w['word'] for w in words if not w['meaning']]
    print(f"无释义词条: {len(empty)}", empty[:10])

if __name__ == '__main__':
    main()
