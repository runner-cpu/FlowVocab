import { Star } from 'lucide-react'
import './StarRating.css'

export interface StarRatingProps {
  /** 已获得星数（0..max） */
  count: number
  /** 总星数，默认 3 */
  max?: number
  /**
   * 读屏用的完整描述，如「微光港：2 / 3 星」。
   * 留空表示这组星只是装饰，可访问名由外层容器承担（外层已有 aria-label 时用这种）。
   */
  label?: string
  /** 单个星标的像素尺寸 */
  size?: number
  className?: string
}

/**
 * 星级：全站唯一的星级渲染器。
 *
 * 用 Lucide Star 替代文本星形字符：文本星号在不同平台的字形与基线都不一致，
 * 也无法随主题变色；这里用 fill 表达已获得、描边表达未获得。
 * label 为空时不产生第二个可访问名，避免与外层 aria-label 重复朗读。
 */
export default function StarRating({ count, max = 3, label, size = 14, className }: StarRatingProps) {
  const safeMax = Math.max(0, Math.floor(max))
  const safeCount = Math.max(0, Math.min(safeMax, Math.floor(count)))
  const named = typeof label === 'string' && label.trim().length > 0
  return (
    <span
      className={['star-rating', className].filter(Boolean).join(' ')}
      {...(named ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      {Array.from({ length: safeMax }, (_, index) => (
        <Star
          key={index}
          size={size}
          aria-hidden
          className={index < safeCount ? 'star-on' : 'star-off'}
        />
      ))}
    </span>
  )
}
