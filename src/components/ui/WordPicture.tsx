/**
 * 单张图像词卡。
 *
 * 素材是按 4:3 画布切好的 448px WebP，尺寸固定、无需 srcSet；
 * 用固定宽高避免图片加载时把题面顶开。
 */
export default function WordPicture({ assetStem, alt, className }: { assetStem: string; alt: string; className?: string }) {
  return <img
    className={className ? 'word-picture ' + className : 'word-picture'}
    src={`./assets/${assetStem}-448.webp`}
    width={448}
    height={336}
    loading="eager"
    decoding="async"
    alt={alt}
  />
}
