import { describe, expect, it } from 'vitest'
import { formatMeaning, sameMeaning } from './meaning'

describe('meaning formatting', () => {
  it('turns literal escape sequences into readable separators', () => {
    expect(formatMeaning('n. 网, 网状物\\na. 净的, 最终的\\nvt. 用网捕'))
      .toBe('n. 网, 网状物；a. 净的, 最终的；vt. 用网捕')
  })

  it('handles real newlines, CRLF and tabs the same way', () => {
    expect(formatMeaning('n. 珍珠\r\nvt. 使成珠状')).toBe('n. 珍珠；vt. 使成珠状')
    expect(formatMeaning('n. 王后\na. 女王')).toBe('n. 王后；a. 女王')
    expect(formatMeaning('n. 轻拍\tv. 轻拍')).toBe('n. 轻拍；v. 轻拍')
  })

  it('collapses repeated separators and trims edges', () => {
    expect(formatMeaning('\\n\\nn. 词义\\n')).toBe('n. 词义')
    expect(formatMeaning('n. 甲；；n. 乙')).toBe('n. 甲；n. 乙')
  })

  it('passes through a plain single-line meaning unchanged', () => {
    expect(formatMeaning('n. 鹰, 鹰状标饰')).toBe('n. 鹰, 鹰状标饰')
  })

  it('tolerates empty and missing input', () => {
    expect(formatMeaning('')).toBe('')
    expect(formatMeaning(undefined)).toBe('')
    expect(formatMeaning(null)).toBe('')
  })

  it('compares meanings after formatting so distractors cannot duplicate', () => {
    expect(sameMeaning('n. 网\\nvt. 净赚', 'n. 网；vt. 净赚')).toBe(true)
    expect(sameMeaning('n. 网', 'n. 罗网')).toBe(false)
  })
})
