import { describe, expect, it } from 'vitest'
import { CONTRAST_CARDS, findContrastCard, type ContrastCard } from './contrastCards'

const cardById = (id: string): ContrastCard => {
  const card = CONTRAST_CARDS.find((entry) => entry.id === id)
  if (!card) throw new Error(`missing card ${id}`)
  return card
}

describe('contrast card inventory', () => {
  it('ships at least 40 curated CET look-alike cards', () => {
    expect(CONTRAST_CARDS.length).toBeGreaterThanOrEqual(40)
  })

  it('keeps ids unique and non-empty', () => {
    const ids = CONTRAST_CARDS.map((card) => card.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => id.trim().length > 0)).toBe(true)
  })

  it('gives every card at least two distinct words with full metadata', () => {
    for (const card of CONTRAST_CARDS) {
      expect(card.words.length, card.id).toBeGreaterThanOrEqual(2)
      const words = card.words.map((entry) => entry.word.toLowerCase())
      expect(new Set(words).size, card.id).toBe(words.length)
      for (const entry of card.words) {
        expect(entry.word.trim().length, card.id).toBeGreaterThan(1)
        expect(entry.phonetic.trim().length, `${card.id}:${entry.word}`).toBeGreaterThan(2)
        expect(entry.meaning.trim().length, `${card.id}:${entry.word}`).toBeGreaterThan(0)
        expect(entry.pos.trim().length, `${card.id}:${entry.word}`).toBeGreaterThan(0)
      }
    }
  })

  it('keeps phonetics plausible ASCII-friendly IPA wrapped in slashes', () => {
    const ipaOnly = /^\/[a-zæɑɒɔəɜɪʊʌeioʊuɚɝθðʃʒŋɡɹɾˈˌːˌ\-()\s.]+\/$/i
    for (const card of CONTRAST_CARDS) {
      for (const entry of card.words) {
        expect(entry.phonetic, `${card.id}:${entry.word}`).toMatch(ipaOnly)
        expect(entry.phonetic).not.toMatch(/\s$/)
      }
    }
  })

  it('keeps meanings Chinese and English examples non-empty', () => {
    for (const card of CONTRAST_CARDS) {
      expect(card.exampleEn.trim().length, card.id).toBeGreaterThan(10)
      expect(card.exampleCn.trim().length, card.id).toBeGreaterThan(2)
      expect(card.exampleCn).toMatch(/[\u4e00-\u9fa5]/)
      for (const entry of card.words) {
        expect(entry.meaning, `${card.id}:${entry.word}`).toMatch(/[\u4e00-\u9fa5]/)
      }
    }
  })

  it('writes a real distinguishing tip of 10-120 chars that names one of the card words', () => {
    for (const card of CONTRAST_CARDS) {
      const length = [...card.tip].length
      expect(length, card.id).toBeGreaterThanOrEqual(10)
      expect(length, card.id).toBeLessThanOrEqual(120)
      const tip = card.tip.toLowerCase()
      const named = card.words.some((entry) => tip.includes(entry.word.toLowerCase()))
      expect(named, `${card.id} 提示语未包含本卡任一词: ${card.tip}`).toBe(true)
    }
  })

  it('puts words from the same card into the example sentence', () => {
    for (const card of CONTRAST_CARDS) {
      const example = card.exampleEn.toLowerCase()
      const hits = card.words.filter((entry) => example.includes(entry.word.toLowerCase())).length
      expect(hits, `${card.id} 例句至少应包含一个本卡单词`).toBeGreaterThanOrEqual(1)
    }
  })

  it('does not repeat the same word across different cards', () => {
    const seen = new Map<string, string>()
    for (const card of CONTRAST_CARDS) {
      for (const entry of card.words) {
        const key = entry.word.toLowerCase()
        expect(seen.has(key), `${key} 同时出现在 ${seen.get(key)} 与 ${card.id}`).toBe(false)
        seen.set(key, card.id)
      }
    }
  })
})

describe('findContrastCard', () => {
  it('finds a card for every curated word', () => {
    for (const card of CONTRAST_CARDS) {
      for (const entry of card.words) {
        expect(findContrastCard(entry.word), entry.word).toBe(card)
      }
    }
  })

  it('is case-insensitive and trims surrounding whitespace', () => {
    expect(findContrastCard('AFFECT')?.id).toBe('cc-affect-effect')
    expect(findContrastCard('  Adopt ')?.id).toBe('cc-adapt-adopt-adept')
    expect(findContrastCard('PRINCIPAL')?.id).toBe('cc-principle-principal')
  })

  it('returns null on misses and malformed input without throwing', () => {
    expect(findContrastCard('zzzznotaword')).toBeNull()
    expect(findContrastCard('')).toBeNull()
    expect(findContrastCard('   ')).toBeNull()
    expect(findContrastCard(undefined as unknown as string)).toBeNull()
    expect(findContrastCard(null as unknown as string)).toBeNull()
    expect(findContrastCard(42 as unknown as string)).toBeNull()
  })

  it('matches whole words only, not substrings', () => {
    expect(findContrastCard('adapte')).toBeNull()
    expect(findContrastCard('affects')).toBeNull()
  })

  it('returns cards that satisfy the shared structural contract', () => {
    const card = findContrastCard('stationery')
    expect(card).not.toBeNull()
    expect(card && card.words.map((entry) => entry.word)).toContain('stationary')
    expect(card && card.tip.length).toBeGreaterThanOrEqual(10)
  })

  it('exposes a stable reference for the same lookup', () => {
    expect(findContrastCard('desert')).toBe(findContrastCard('DESERT'))
    expect(findContrastCard('desert')).toBe(cardById('cc-desert-dessert'))
  })
})
