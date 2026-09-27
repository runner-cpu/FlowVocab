import type { ImgHTMLAttributes } from 'react'

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet' | 'sizes' | 'loading'> & {
  assetStem: string
  eager?: boolean
  sizes?: string
  className?: string
}

export default function ResponsiveSceneImage({ assetStem, alt, eager = false, sizes = '100vw', className, ...rest }: Props) {
  const hero = assetStem.includes('neon-harbor-quest')
  const widths = hero ? [768, 1280] : [640, 1024]
  const width = hero ? 1280 : 1024
  const height = hero ? 853 : 768
  const prefix = `./assets/${assetStem}`
  return <img
    {...rest}
    className={className}
    src={`${prefix}-${width}.webp`}
    srcSet={widths.map((value) => `${prefix}-${value}.webp ${value}w`).join(', ')}
    sizes={sizes}
    width={width}
    height={height}
    loading={eager ? 'eager' : 'lazy'}
    {...({ fetchpriority: eager ? 'high' : 'auto' } as Record<string, string>)}
    alt={alt}
  />
}
